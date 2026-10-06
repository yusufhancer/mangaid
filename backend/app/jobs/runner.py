import asyncio
import io
import json
import os
import shutil
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional
import httpx
from PIL import Image

from ..db.session import SessionLocal
from ..db.models import Job, Chapter, PageRecord
from ..ai.analyze import PageAnalyzer
from ..ai.translate import ChapterTranslator
from ..render.renderer import PageRenderer
from ..core.config import settings
from ..core.logging import logger

analyzer = PageAnalyzer()
translator = ChapterTranslator()
renderer = PageRenderer()

async def run_translation_job(
    job_id: str,
    chapter_id: str,
    page_urls: List[str],
    headers: Dict[str, str],
    settings_dict: Dict[str, Any]
):
    """
    Executes the background translation pipeline fast with concurrency:
    1. Parallel image downloading
    2. Concurrent Gemini Vision analysis
    3. Context-aware chapter translation (Indonesian gaul / neutral)
    4. Parallel rendering (inpaint & typesetting)
    """
    db = SessionLocal()
    chapter_dir = settings.data_path / "chapters" / chapter_id
    orig_dir = chapter_dir / "original"
    trans_dir = chapter_dir / "translated"
    orig_dir.mkdir(parents=True, exist_ok=True)
    trans_dir.mkdir(parents=True, exist_ok=True)

    tone = settings_dict.get("tone", "gaul")
    honorifics = settings_dict.get("honorifics", "keep")

    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            return

        # ----------------------------------------------------
        # STAGE 1: FAST CONCURRENT DOWNLOAD
        # ----------------------------------------------------
        job.stage = "downloading"
        job.total_pages = len(page_urls)
        db.commit()

        download_sem = asyncio.Semaphore(5)

        async def download_one(idx: int, p_url: str) -> Tuple[int, Path]:
            if os.path.exists(p_url):
                return (idx, Path(p_url))

            dest_path = orig_dir / f"page_{idx:04d}.jpg"
            async with download_sem:
                if p_url.startswith("/api/chapters/local-file/"):
                    rel_path = p_url.replace("/api/chapters/local-file/", "")
                    src = settings.data_path / "uploads" / rel_path
                    if src.exists():
                        shutil.copyfile(src, dest_path)
                else:
                    async with httpx.AsyncClient(timeout=20.0, headers=headers) as client:
                        resp = await client.get(p_url)
                        resp.raise_for_status()
                        dest_path.write_bytes(resp.content)
            return (idx, dest_path)

        download_tasks = [download_one(i, url) for i, url in enumerate(page_urls, start=1)]
        downloaded_pages = await asyncio.gather(*download_tasks)
        downloaded_pages.sort(key=lambda x: x[0])

        for idx, dest_path in downloaded_pages:
            rec = db.query(PageRecord).filter(
                PageRecord.chapter_id == chapter_id,
                PageRecord.page_number == idx
            ).first()
            if not rec:
                rec = PageRecord(
                    chapter_id=chapter_id,
                    page_number=idx,
                    original_path=str(dest_path),
                    status="downloaded"
                )
                db.add(rec)
            else:
                rec.original_path = str(dest_path)
        db.commit()

        # ----------------------------------------------------
        # STAGE 2: CONCURRENT GEMINI VISION ANALYSIS
        # ----------------------------------------------------
        job.stage = "analyzing"
        db.commit()

        analyze_sem = asyncio.Semaphore(3)  # 3 concurrent requests to respect RPM comfortably

        async def analyze_one(idx: int, img_path: Path):
            async with analyze_sem:
                img_bytes = img_path.read_bytes()
                res = await analyzer.analyze_page(img_bytes, page_number=idx)
                # Update progress
                job.current_page = max(job.current_page, idx)
                return res

        analyze_tasks = [analyze_one(idx, p) for idx, p in downloaded_pages]
        pages_analysis = await asyncio.gather(*analyze_tasks)
        pages_analysis.sort(key=lambda x: x.get("page_number", 0))

        # Update records
        for analysis in pages_analysis:
            p_num = analysis.get("page_number", 1)
            rec = db.query(PageRecord).filter(
                PageRecord.chapter_id == chapter_id,
                PageRecord.page_number == p_num
            ).first()
            if rec:
                rec.regions_json = json.dumps(analysis.get("regions", []))
                rec.status = "analyzed" if analysis.get("status") == "success" else "failed"
        db.commit()

        # ----------------------------------------------------
        # STAGE 3: CONTEXT-AWARE CHAPTER TRANSLATION
        # ----------------------------------------------------
        job.stage = "translating"
        db.commit()

        trans_res = await translator.translate_chapter(
            pages_analysis,
            tone_preset=tone,
            honorifics=honorifics
        )
        translation_map = trans_res.get("translations", {})

        # ----------------------------------------------------
        # STAGE 4: FAST CONCURRENT RENDERING
        # ----------------------------------------------------
        job.stage = "rendering"
        job.completed_pages = 0
        db.commit()

        render_sem = asyncio.Semaphore(4)
        failed_count = 0

        def render_one(idx: int, img_path: Path) -> Tuple[int, Optional[Path], str]:
            orig_pil = Image.open(img_path).convert("RGB")
            page_info = next((p for p in pages_analysis if p.get("page_number") == idx), {})
            page_regions = page_info.get("regions", [])

            page_trans = {
                int(r_id): text
                for (p_num, r_id), text in translation_map.items()
                if int(p_num) == idx
            }

            if not page_regions and not page_trans:
                # If page had no text (e.g. pure artwork)
                return (idx, None, "rendered")

            rendered_pil = renderer.render_page(orig_pil, page_regions, page_trans)
            rendered_path = trans_dir / f"page_{idx:04d}.png"
            rendered_pil.save(rendered_path, format="PNG")
            return (idx, rendered_path, "rendered")

        for idx, img_path in downloaded_pages:
            p_idx, r_path, r_status = render_one(idx, img_path)
            rec = db.query(PageRecord).filter(
                PageRecord.chapter_id == chapter_id,
                PageRecord.page_number == p_idx
            ).first()
            if rec:
                if r_path:
                    rec.translated_path = str(r_path)
                rec.status = r_status

            job.completed_pages += 1
            db.commit()

        job.stage = "done"
        db.commit()
        logger.info("Job %s completed in record time for chapter %s!", job_id, chapter_id)

    except Exception as e:
        logger.error("Job %s failed: %s", job_id, e, exc_info=True)
        if job:
            job.stage = "failed"
            job.error_message = str(e)
            db.commit()
    finally:
        db.close()
