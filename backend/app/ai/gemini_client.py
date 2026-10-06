import asyncio
import time
from typing import Dict, Any, Optional, Set
import httpx
from ..core.config import settings
from ..core.logging import logger

class GeminiRateLimiter:
    """Enforces conservative RPM limits to prevent HTTP 429 on free-tier."""
    def __init__(self, rpm: int = 30):
        self.rpm = rpm
        self.min_interval = 60.0 / max(1, rpm)
        self.last_call_time = 0.0
        self._lock = asyncio.Lock()

    async def acquire(self):
        async with self._lock:
            now = time.time()
            elapsed = now - self.last_call_time
            if elapsed < self.min_interval:
                sleep_duration = self.min_interval - elapsed
                await asyncio.sleep(sleep_duration)
            self.last_call_time = time.time()

rate_limiter = GeminiRateLimiter(rpm=30)

# Safety settings: All set to BLOCK_NONE as agreed to avoid censorship of manga art/action
SAFETY_SETTINGS_BLOCK_NONE = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_CIVIC_INTEGRITY", "threshold": "BLOCK_NONE"},
]

# Prioritized pool of Flash models that have active free quota
MODEL_POOL = [
    "gemini-3.1-flash-lite-preview",
    "gemini-3.5-flash-lite",
    "gemini-flash-lite-latest",
    "gemini-3.1-flash-lite",
    "gemma-4-26b-a4b-it",
    "gemini-3.7-flash",
    "gemini-3.8-flash",
    "gemini-3.5-flash",
]

# Runtime set of models whose daily quota is exhausted
EXHAUSTED_MODELS: Set[str] = set()

async def call_gemini_with_retry(
    model: str,
    payload: Dict[str, Any],
    max_retries: int = 2,
    timeout: float = 30.0
) -> Dict[str, Any]:
    """
    Calls Gemini API with instant failover on quota exhaustion.
    Differentiates between RPM rate spikes and true daily exhaustion.
    """
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not configured.")

    if "safetySettings" not in payload:
        payload["safetySettings"] = SAFETY_SETTINGS_BLOCK_NONE

    # Candidate models: prioritize models not marked as daily-exhausted
    candidates = [m for m in MODEL_POOL if m not in EXHAUSTED_MODELS]
    if not candidates:
        EXHAUSTED_MODELS.clear()
        candidates = MODEL_POOL.copy()

    last_error = None

    for current_model in candidates:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{current_model}:generateContent?key={settings.GEMINI_API_KEY}"

        for attempt in range(max_retries):
            await rate_limiter.acquire()
            try:
                async with httpx.AsyncClient(timeout=timeout) as client:
                    resp = await client.post(url, json=payload)

                    if resp.status_code == 429:
                        body_text = resp.text
                        # Check if this is a genuine daily quota limit (RPD)
                        is_daily_limit = (
                            "per day" in body_text.lower()
                            or "perday" in body_text.lower()
                            or "free_tier_requests_per_day" in body_text.lower()
                        )
                        if is_daily_limit:
                            logger.warning("Daily quota exhausted for %s. Blacklisting model for this session...", current_model)
                            EXHAUSTED_MODELS.add(current_model)
                            break
                        else:
                            # It's a temporary RPM per-minute limit: switch immediately to another model without blacklisting
                            logger.info("Temporary RPM limit on %s. Switching to next model...", current_model)
                            break

                    if resp.status_code in (404, 503):
                        logger.warning("Model %s returned %d. Trying next model immediately...", current_model, resp.status_code)
                        break

                    resp.raise_for_status()
                    data = resp.json()
                    return data

            except Exception as e:
                last_error = e
                logger.warning("Attempt %d on %s failed: %s", attempt + 1, current_model, e)
                await asyncio.sleep(1.0)

    raise RuntimeError(f"All Gemini models exhausted or failed: {last_error}")
