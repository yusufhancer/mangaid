import json
from typing import List, Dict, Any, Tuple
from .gemini_client import call_gemini_with_retry
from .prompts import CHAPTER_TRANSLATION_PROMPT_GAUL, CHAPTER_TRANSLATION_PROMPT_NEUTRAL
from .watermark import is_credit_or_watermark
from ..core.config import settings
from ..core.logging import logger

class ChapterTranslator:
    """
    Translates an entire chapter's dialogue bubbles contextually into natural Indonesian.
    Maintains character names and pronouns consistency across pages.
    """

    async def translate_chapter(
        self,
        pages_analysis: List[Dict[str, Any]],
        tone_preset: str = "gaul",
        honorifics: str = "keep"
    ) -> Dict[str, Any]:
        # Collect all translatable regions
        all_items = []
        for p in pages_analysis:
            p_num = p.get("page_number", 1)
            for r in p.get("regions", []):
                # Only translate dialogue, narration, thought, sign
                r_type = r.get("type", "dialogue")
                if r_type in ("dialogue", "narration", "thought", "sign", "other"):
                    text = r.get("source_text", "").strip()
                    if text and not is_credit_or_watermark(text):
                        all_items.append({
                            "page_number": p_num,
                            "region_id": r.get("id"),
                            "speaker": r.get("speaker"),
                            "type": r_type,
                            "source_text": text
                        })

        if not all_items:
            logger.info("No translatable dialogue found in chapter.")
            return {"glossary": {}, "translations": {}}

        prompt_template = (
            CHAPTER_TRANSLATION_PROMPT_GAUL
            if tone_preset == "gaul"
            else CHAPTER_TRANSLATION_PROMPT_NEUTRAL
        )

        # Chunk items in batches of 45 to stay well within token limits
        chunk_size = 45
        accumulated_glossary = {}
        translation_map: Dict[Tuple[int, int], str] = {}

        for i in range(0, len(all_items), chunk_size):
            chunk = all_items[i:i + chunk_size]
            logger.info("Translating dialogue chunk %d-%d of %d items", i + 1, min(i + chunk_size, len(all_items)), len(all_items))

            input_context = {
                "honorifics_setting": honorifics,
                "current_glossary": accumulated_glossary,
                "items_to_translate": chunk
            }

            payload = {
                "contents": [
                    {
                        "role": "user",
                        "parts": [
                            {"text": f"{prompt_template}\n\nInput Context:\n{json.dumps(input_context, ensure_ascii=False, indent=2)}"}
                        ]
                    }
                ],
                "generationConfig": {
                    "responseMimeType": "application/json"
                }
            }

            try:
                resp = await call_gemini_with_retry(
                    model=settings.GEMINI_MODEL_TEXT,
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

                # Update accumulated glossary
                if "glossary" in parsed and isinstance(parsed["glossary"], dict):
                    accumulated_glossary.update(parsed["glossary"])

                for t in parsed.get("translations", []):
                    try:
                        p_num = int(t.get("page_number", 0))
                        r_id = int(t.get("region_id", 0))
                        key = (p_num, r_id)
                        translation_map[key] = t.get("id_text", "")
                    except (ValueError, TypeError):
                        pass

            except Exception as e:
                logger.error("Failed to translate chunk: %s. Retrying in smaller sub-chunks...", e)
                for sub_i in range(0, len(chunk), 10):
                    sub_chunk = chunk[sub_i:sub_i + 10]
                    sub_context = {
                        "honorifics_setting": honorifics,
                        "current_glossary": accumulated_glossary,
                        "items_to_translate": sub_chunk
                    }
                    sub_payload = {
                        "contents": [
                            {
                                "role": "user",
                                "parts": [
                                    {"text": f"{prompt_template}\n\nInput Context:\n{json.dumps(sub_context, ensure_ascii=False, indent=2)}"}
                                ]
                            }
                        ],
                        "generationConfig": {"responseMimeType": "application/json"}
                    }
                    try:
                        sub_resp = await call_gemini_with_retry(
                            model=settings.GEMINI_MODEL_TEXT,
                            payload=sub_payload
                        )
                        sub_raw = sub_resp["candidates"][0]["content"]["parts"][0]["text"].strip()
                        if sub_raw.startswith("```json"):
                            sub_raw = sub_raw[7:]
                        if sub_raw.startswith("```"):
                            sub_raw = sub_raw[3:]
                        if sub_raw.endswith("```"):
                            sub_raw = sub_raw[:-3]
                        sub_parsed = json.loads(sub_raw.strip())
                        for t in sub_parsed.get("translations", []):
                            try:
                                key = (int(t.get("page_number", 0)), int(t.get("region_id", 0)))
                                translation_map[key] = t.get("id_text", "")
                            except (ValueError, TypeError):
                                pass
                    except Exception as sub_e:
                        logger.error("Sub-chunk failed: %s. Keeping original text for these items.", sub_e)
                        for item in sub_chunk:
                            key = (int(item["page_number"]), int(item["region_id"]))
                            translation_map[key] = item["source_text"]

        logger.info("Translation complete. Total %d regions translated.", len(translation_map))
        return {
            "glossary": accumulated_glossary,
            "translations": translation_map
        }
