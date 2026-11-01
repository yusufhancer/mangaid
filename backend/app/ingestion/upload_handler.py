import os
import zipfile
import shutil
import uuid
from pathlib import Path
from typing import List, Tuple
from fastapi import UploadFile
from PIL import Image

from .base import ChapterData
from .scoring import extract_numeric_sequence, IMAGE_EXTENSIONS
from ..core.config import settings
from ..core.logging import logger

MAX_UNCOMPRESSED_ZIP_SIZE = 500 * 1024 * 1024  # 500 MB
MAX_PAGE_COUNT = 300

class ManualUploadHandler:
    """
    Handles Layer 4 manual uploads:
    - Multiple individual images (.jpg, .png, .webp, .avif)
    - Archives (.zip, .cbz)
    - PDF documents (.pdf)
    """

    def __init__(self):
        self.upload_dir = settings.data_path / "uploads"
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    async def handle_files(self, files: List[UploadFile], title: str = "Uploaded Chapter") -> ChapterData:
        session_id = str(uuid.uuid4())
        session_dir = self.upload_dir / session_id
        session_dir.mkdir(parents=True, exist_ok=True)

        extracted_images: List[Path] = []

        for file in files:
            filename = (file.filename or "upload").lower()

            if filename.endswith(".zip") or filename.endswith(".cbz"):
                extracted_images.extend(await self._process_archive(file, session_dir))
            elif filename.endswith(".pdf"):
                extracted_images.extend(await self._process_pdf(file, session_dir))
            elif any(filename.endswith(ext) for ext in IMAGE_EXTENSIONS):
                dest_path = session_dir / f"img_{uuid.uuid4().hex[:8]}_{file.filename}"
                with open(dest_path, "wb") as f:
                    content = await file.read()
                    f.write(content)
                extracted_images.append(dest_path)

        if not extracted_images:
            shutil.rmtree(session_dir, ignore_errors=True)
            raise ValueError("No valid image files found in upload.")

        # Sort images naturally by filename/number
        sorted_images = self._sort_images(extracted_images)

        # Generate local file / static serve paths
        image_urls = [
            f"/api/chapters/local-file/{session_id}/{p.name}"
            for p in sorted_images
        ]

        logger.info("ManualUploadHandler processed %d pages into session %s", len(image_urls), session_id)

        return ChapterData(
            title=title,
            chapter_number="1",
            language_hint=None,
            page_image_urls=image_urls,
            headers_needed={},
            layer_name="layer_4_upload",
            confidence=1.0,
        )

    async def _process_archive(self, file: UploadFile, dest_dir: Path) -> List[Path]:
        temp_zip = dest_dir / f"archive_{uuid.uuid4().hex[:8]}.zip"
        with open(temp_zip, "wb") as f:
            f.write(await file.read())

        extracted: List[Path] = []
        total_size = 0

        with zipfile.ZipFile(temp_zip, "r") as z:
            # Check for zip bomb
            for info in z.infolist():
                total_size += info.file_size
                if total_size > MAX_UNCOMPRESSED_ZIP_SIZE:
                    raise ValueError("Uploaded archive exceeds maximum allowed size (Zip Bomb protection).")

            for info in z.infolist():
                # Prevent path traversal
                if info.is_dir() or ".." in info.filename or os.path.isabs(info.filename):
                    continue

                fname = Path(info.filename).name.lower()
                if any(fname.endswith(ext) for ext in IMAGE_EXTENSIONS):
                    target_file = dest_dir / f"arc_{uuid.uuid4().hex[:6]}_{Path(info.filename).name}"
                    with z.open(info) as src, open(target_file, "wb") as dst:
                        shutil.copyfileobj(src, dst)
                    extracted.append(target_file)

        temp_zip.unlink(missing_ok=True)
        return extracted

    async def _process_pdf(self, file: UploadFile, dest_dir: Path) -> List[Path]:
        try:
            import pypdfium2 as pdfium
        except ImportError:
            raise RuntimeError("pypdfium2 is required for PDF processing.")

        content = await file.read()
        pdf = pdfium.PdfDocument(content)

        extracted: List[Path] = []
        for i in range(len(pdf)):
            page = pdf[i]
            # Render page at 2.0 scale for sharp text readability in comic
            image = page.render(scale=2.0).to_pil()
            page_path = dest_dir / f"pdf_page_{i + 1:04d}.png"
            image.save(page_path, format="PNG")
            extracted.append(page_path)

        return extracted

    def _sort_images(self, paths: List[Path]) -> List[Path]:
        def sort_key(p: Path):
            seq = extract_numeric_sequence(p.name)
            return (seq is None, seq if seq is not None else p.name.lower())

        return sorted(paths, key=sort_key)
