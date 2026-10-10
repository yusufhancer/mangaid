from PIL import Image, ImageDraw
from typing import List, Dict, Any
from .inpaint import erase_text_regions
from .typeset import typeset_text_bubble
from ..ai.watermark import is_credit_or_watermark
from ..core.logging import logger

class PageRenderer:
    """
    Renders translated manga pages:
    1. Erases original dialogue with inpainting / mask
    2. Typesets Indonesian translation with auto-wrapping comic font
    """

    def render_page(
        self,
        original_image: Image.Image,
        regions: List[Dict[str, Any]],
        translation_map: Dict[int, str]
    ) -> Image.Image:
        # 1. Collect bounding boxes to erase
        bboxes_to_erase = []
        regions_to_typeset = []

        for r in regions:
            try:
                r_id = int(r.get("id", 0))
            except (ValueError, TypeError):
                r_id = r.get("id")
            source_text = r.get("source_text", "").strip()
            translated_text = translation_map.get(r_id, "").strip()
            pixel_bbox = r.get("pixel_bbox")

            # Skip watermark and credits completely
            if is_credit_or_watermark(source_text) or is_credit_or_watermark(translated_text):
                continue

            if pixel_bbox and len(pixel_bbox) == 4:
                # If there is translated text or if it was marked as dialogue, erase it
                if translated_text or source_text:
                    bboxes_to_erase.append(pixel_bbox)
                if translated_text:
                    regions_to_typeset.append((pixel_bbox, translated_text))

        # 2. Erase original text
        cleaned_image = erase_text_regions(original_image, bboxes_to_erase)

        # 3. Typeset Indonesian translation
        draw = ImageDraw.Draw(cleaned_image)
        for bbox, text in regions_to_typeset:
            typeset_text_bubble(draw, text, bbox)

        logger.info("Successfully rendered page with %d translated regions", len(regions_to_typeset))
        return cleaned_image
