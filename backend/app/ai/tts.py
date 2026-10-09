import os
import json
import asyncio
from pathlib import Path
from typing import List, Dict, Any, Optional
import edge_tts
from sqlalchemy.orm import Session

from ..core.config import settings
from ..core.logging import logger
from ..db.models import PageRecord, Chapter

VOICES = {
    "ardi": "id-ID-ArdiNeural",     # Suara Pria: Wibawa, Narator, Karakter Cowok
    "gadis": "id-ID-GadisNeural",   # Suara Wanita: Hangat, Halus, Karakter Cewek
    "ja": "ja-JP-NanamiNeural",     # Suara Jepang (untuk teks RAW)
    "en": "en-US-JennyNeural",      # Suara Inggris
}

DEFAULT_VOICE = "ardi"

def get_voice_identifier(voice_key: str) -> str:
    return VOICES.get(voice_key.lower(), VOICES[DEFAULT_VOICE])

def get_page_dialogues(chapter_id: str, page_number: int, db: Session) -> List[Dict[str, Any]]:
    """
    Extracts ordered dialogues and speech bubbles from a page's analysis regions.
    Sorted in manga reading order (top to bottom, right to left).
    """
    record = db.query(PageRecord).filter(
        PageRecord.chapter_id == chapter_id,
        PageRecord.page_number == page_number
    ).first()

    if not record or not record.regions_json:
        return []

    try:
        regions = json.loads(record.regions_json)
    except Exception:
        return []

    dialogues = []
    for r in regions:
        # We only want readable text regions
        r_type = r.get("type", "dialogue")
        if r_type in ("dialogue", "narration", "thought", "sign", "other"):
            text = (r.get("translated_text") or r.get("source_text") or "").strip()
            if text:
                box = r.get("box_2d", [0, 0, 0, 0])
                dialogues.append({
                    "id": r.get("id"),
                    "speaker": r.get("speaker") or ("Narator" if r_type == "narration" else None),
                    "type": r_type,
                    "text": text,
                    "box_2d": box
                })

    # Sort in manga reading order: primarily top-to-bottom (ymin), secondarily right-to-left (reverse xmin)
    def manga_sort_key(d):
        b = d["box_2d"]
        if len(b) >= 4:
            ymin, xmin, ymax, xmax = b[0], b[1], b[2], b[3]
            # Quantize y into bands of 15% height so right-to-left within a panel takes precedence
            y_band = round(ymin / 150)
            return (y_band, -xmin)
        return (0, 0)

    dialogues.sort(key=manga_sort_key)
    return dialogues

async def synthesize_text_to_file(text: str, voice_key: str, output_path: Path, rate: str = "+0%") -> bool:
    """
    Synthesizes text using Microsoft Azure Neural TTS via edge-tts.
    """
    voice = get_voice_identifier(voice_key)
    try:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        communicate = edge_tts.Communicate(text, voice, rate=rate)
        await communicate.save(str(output_path))
        return True
    except Exception as e:
        logger.error("Edge-TTS synthesis error for voice %s: %s", voice, e)
        return False

async def get_or_generate_page_audio(
    chapter_id: str,
    page_number: int,
    voice_key: str = "ardi",
    db: Session = None
) -> Optional[Path]:
    """
    Gets cached MP3 audio narration for a page, or generates it seamlessly from page dialogues.
    """
    audio_dir = settings.data_path / "chapters" / chapter_id / "audio"
    audio_path = audio_dir / f"page_{page_number:04d}_{voice_key}.mp3"

    if audio_path.exists() and audio_path.stat().st_size > 500:
        return audio_path

    if not db:
        return None

    dialogues = get_page_dialogues(chapter_id, page_number, db)
    if not dialogues:
        return None

    # Construct flowing natural spoken narration with human-like breathing pauses
    speech_parts = []
    for d in dialogues:
        t = d["text"].strip()
        if not t:
            continue
        # Ensure punctuation ends nicely for natural prosody
        if not t.endswith((".", "!", "?", "...", ",")):
            t += "."
        speech_parts.append(t)

    full_spoken_text = " ... ".join(speech_parts)
    if not full_spoken_text.strip():
        return None

    success = await synthesize_text_to_file(full_spoken_text, voice_key, audio_path)
    if success and audio_path.exists():
        return audio_path

    return None

async def synthesize_single_bubble(text: str, voice_key: str = "ardi") -> Optional[bytes]:
    """
    Synthesizes a single dialogue bubble into raw MP3 bytes for instant tap-to-speak.
    """
    voice = get_voice_identifier(voice_key)
    try:
        communicate = edge_tts.Communicate(text, voice)
        chunks = []
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                chunks.append(chunk["data"])
        return b"".join(chunks)
    except Exception as e:
        logger.error("Single bubble TTS error: %s", e)
        return None
