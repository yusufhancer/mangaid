import io
import base64
import json
from pathlib import Path
from typing import List, Dict, Any, Tuple
from PIL import Image

from .gemini_client import call_gemini_with_retry
from .prompts import PAGE_VISION_PROMPT
from ..core.config import settings
from ..core.logging import logger

MAX_VISION_DIMENSION = 1600  # Downscale limit for AI vision to conserve tokens

class PageAnalyzer:
    """
    Analyzes manga/manhwa page images using Gemini Multimodal Vision.
    Extracts text regions, bounding boxes, language, and reading order.
    """

    async def analyze_page(self, image_bytes: bytes, page_number: int = 1) -> Dict[str, Any]:
        """
        Takes raw image bytes, handles tall webtoon slicing if needed,
        calls Gemini Vision, and returns structured detected regions.
        """
        orig_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        orig_width, orig_height = orig_img.size

        # Check for webtoon tall strip (e.g. height > 2.5 * width)
        aspect_ratio = orig_height / max(1, orig_width)
        if aspect_ratio > 2.5:
            logger.info("Page %d is a tall webtoon strip (ratio %.2f). Processing slices...", page_number, aspect_ratio)
            return await self._analyze_webtoon_slices(orig_img, page_number)

        # Standard manga page analysis
        return await self._analyze_single_image(orig_img, page_number, offset_y=0, slice_h=orig_height)

    async def _analyze_single_image(
        self,
        img: Image.Image,
        page_number: int,
        offset_y: int = 0,
        slice_h: int = 0
    ) -> Dict[str, Any]:
        w, h = img.size

        # Prepare downscaled image for AI input
        ai_img = img.copy()
        if max(w, h) > MAX_VISION_DIMENSION:
            scale = MAX_VISION_DIMENSION / max(w, h)
            ai_img = ai_img.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)

        buf = io.BytesIO()
        ai_img.save(buf, format="JPEG", quality=85)
        b64_data = base64.b64encode(buf.getvalue()).decode("utf-8")

        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {"text": PAGE_VISION_PROMPT},
                        {
                            "inlineData": {
                                "mimeType": "image/jpeg",
                                "data": b64_data
                            }
                        }
                    ]
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json"
            }
        }

        try:
            resp = await call_gemini_with_retry(
                model=settings.GEMINI_MODEL_VISION,
                payload=payload
            )
            raw_text = resp["candidates"][0]["content"]["parts"][0]["text"]
            clean_json = raw_text.strip()
            if clean_json.startswith("```json"):
                clean_json = clean_json[7:]
            if clean_json.startswith("```"):
                clean_json = clean_json[3:]
            if clean_json.endswith("```"):
                clean_json = clean_json[:-3]
            parsed = json.loads(clean_json.strip())

            # Convert 0-1000 normalized coordinates to actual pixel coordinates
            regions = parsed.get("regions", [])
            for r in regions:
                bbox = r.get("bbox", [0, 0, 0, 0])
                ymin, xmin, ymax, xmax = bbox
                # Map to pixel bounds on original image
                r["pixel_bbox"] = [
                    int(ymin / 1000.0 * h) + offset_y,
                    int(xmin / 1000.0 * w),
                    int(ymax / 1000.0 * h) + offset_y,
                    int(xmax / 1000.0 * w)
                ]

            return {
                "page_number": page_number,
                "language": parsed.get("page_language", "unknown"),
                "regions": regions,
                "status": "success"
            }

        except Exception as e:
            logger.error("Vision analysis failed for page %d: %s. Returning fallback status.", page_number, e)
            return {
                "page_number": page_number,
                "language": "unknown",
                "regions": [],
                "status": "fallback",
                "error": str(e)
            }

    async def _analyze_webtoon_slices(self, img: Image.Image, page_number: int) -> Dict[str, Any]:
        """Slices a very tall webtoon strip into overlapping segments."""
        w, h = img.size
        slice_height = 1800
        overlap = 200
        step = slice_height - overlap

        all_regions = []
        slice_idx = 0
        y = 0

        while y < h:
            curr_h = min(slice_height, h - y)
            cropped = img.crop((0, y, w, y + curr_h))

            slice_result = await self._analyze_single_image(
                cropped,
                page_number=page_number,
                offset_y=y,
                slice_h=curr_h
            )

            for r in slice_result.get("regions", []):
                # Avoid duplicates in overlap zone
                if not any(self._is_near_duplicate(r, existing) for existing in all_regions):
                    all_regions.append(r)

            y += step
            slice_idx += 1

        return {
            "page_number": page_number,
            "language": "ko",  # Webtoon default
            "regions": all_regions,
            "status": "success"
        }

    def _is_near_duplicate(self, r1: Dict, r2: Dict) -> bool:
        b1 = r1.get("pixel_bbox", [0, 0, 0, 0])
        b2 = r2.get("pixel_bbox", [0, 0, 0, 0])
        # Center points
        cy1 = (b1[0] + b1[2]) / 2
        cy2 = (b2[0] + b2[2]) / 2
        cx1 = (b1[1] + b1[3]) / 2
        cx2 = (b2[1] + b2[3]) / 2
        return abs(cy1 - cy2) < 50 and abs(cx1 - cx2) < 50
