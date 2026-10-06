import json
import re
from typing import List, Dict, Any, Optional
import httpx
from bs4 import BeautifulSoup
from urllib.parse import urljoin

from .base import SourceAdapter, ChapterData
from .security import assert_url_safe
from ..core.config import settings
from ..core.logging import logger

SYSTEM_PROMPT = """You are a web scraping assistant specialized in web manga and comic reader architectures.
Given a list of image URLs and metadata extracted from an HTML page, identify which URLs belong to the sequential manga chapter pages.
Filter out advertisements, website logos, user avatars, pagination buttons, banners, and widgets.
Return a valid JSON object matching this schema:
{
  "selected_urls": ["string URL 1", "string URL 2", ...],
  "estimated_title": "string or null",
  "chapter_number": "string or null"
}
Only output the JSON object with no markdown fences or other commentary.
"""

class GeminiAssistedExtractor(SourceAdapter):
    """
    Layer 3 Gemini-Assisted Extractor (Ambiguity Resolver).
    Resolves complex or obfuscated readers by sending candidate metadata to Gemini.
    """

    def can_handle(self, url: str) -> bool:
        return bool(settings.GEMINI_API_KEY) and (url.startswith("http://") or url.startswith("https://"))

    async def fetch_chapter(self, url: str) -> ChapterData:
        assert_url_safe(url)

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        }

        async with httpx.AsyncClient(timeout=15.0, headers=headers) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            html_text = resp.text
            final_url = str(resp.url)

        soup = BeautifulSoup(html_text, "html.parser")
        candidates = []

        for idx, img in enumerate(soup.find_all("img")):
            src = img.get("src") or img.get("data-src") or img.get("data-original")
            if src and not src.startswith("data:"):
                candidates.append({
                    "index": idx,
                    "url": urljoin(final_url, src),
                    "alt": img.get("alt", ""),
                    "classes": " ".join(img.get("class", [])) if img.get("class") else "",
                })

        if not candidates:
            raise ValueError("No images found on page to analyze.")

        # Limit candidate count to avoid huge context
        candidates_to_send = candidates[:60]

        # Call Gemini REST API
        gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL_TEXT}:generateContent?key={settings.GEMINI_API_KEY}"

        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {
                            "text": f"{SYSTEM_PROMPT}\n\nPage URL: {final_url}\nPage Title: {soup.title.string if soup.title else ''}\nCandidates:\n{json.dumps(candidates_to_send, indent=2)}"
                        }
                    ]
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json"
            }
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            ai_resp = await client.post(gemini_url, json=payload)
            ai_resp.raise_for_status()
            ai_data = ai_resp.json()

        try:
            raw_text = ai_data["candidates"][0]["content"]["parts"][0]["text"]
            clean_json = raw_text.strip()
            if clean_json.startswith("```json"):
                clean_json = clean_json[7:]
            if clean_json.startswith("```"):
                clean_json = clean_json[3:]
            if clean_json.endswith("```"):
                clean_json = clean_json[:-3]
            data = json.loads(clean_json.strip())
            selected_urls = data.get("selected_urls", [])
        except Exception as e:
            logger.error("Failed to parse Gemini response: %s", e)
            raise ValueError(f"Gemini extraction failed: {e}")

        logger.info("GeminiAssistedExtractor picked %d pages", len(selected_urls))

        return ChapterData(
            title=data.get("estimated_title"),
            chapter_number=data.get("chapter_number"),
            page_image_urls=selected_urls,
            headers_needed={"Referer": final_url},
            layer_name="layer_3_gemini",
            confidence=0.9
        )
