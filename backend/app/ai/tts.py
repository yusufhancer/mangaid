import os
import json
import asyncio
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
import edge_tts
from sqlalchemy.orm import Session

from ..core.config import settings
from ..core.logging import logger
from ..db.models import PageRecord, Chapter

VOICES = {
    "ardi": "id-ID-ArdiNeural",     # Suara Pria: Wibawa, Shounen, Kuat
    "gadis": "id-ID-GadisNeural",   # Suara Wanita: Hangat, Halus, Heroine
    "ja": "ja-JP-NanamiNeural",
    "en": "en-US-JennyNeural",
}

DEFAULT_VOICE = "auto"

def classify_dialogue_voice_and_emotion(
    dialogue: Dict[str, Any],
    default_voice_mode: str = "auto"
) -> Tuple[str, str, str, str]:
    """
    Returns (voice_name, rate, pitch, volume) with dynamic voice acting tuning.
    Analyzes character gender, narration, and emotion from text punctuation and semantics.
    """
    text = dialogue.get("text", "").strip()
    r_type = dialogue.get("type", "dialogue")
    gender = (dialogue.get("gender") or "").lower().strip()
    speaker = (dialogue.get("speaker") or "").lower().strip()

    # 1. Narration Check
    if r_type == "narration" or "narator" in speaker or "narrator" in speaker:
        return ("id-ID-ArdiNeural", "-4%", "-12Hz", "+10%")

    # 2. Monster / Ghost / Creature Check (Eerie voice acting)
    monster_clues = ["monster", "ghost", "hantu", "demon", "creature", "iblis", "setan", "makhluk", "beast", "zombie", "alien"]
    if any(k in speaker for k in monster_clues):
        rate = "-10%"
        pitch = "-18Hz"
        volume = "+20%"
        return ("id-ID-ArdiNeural", rate, pitch, volume)

    # 3. Gender classification
    female_clues = [
        "girl", "woman", "female", "she", "miko", "mie", "miruko", "nami", "robin", 
        "sakura", "hinata", "chan", "san", "mba", "mbak", "ibu", "mama", "cewek", 
        "gadis", "wanita", "putri", "hime", "lady", "sister", "sis", "perempuan"
    ]
    male_clues = [
        "boy", "man", "male", "guy", "he", "kun", "luffy", "zoro", "sanji", 
        "naruto", "sasuke", "deku", "bro", "bocah", "cowok", "pria", "abang", 
        "kakek", "paman", "ayah", "papa", "bapak", "laki", "sir", "lord", "tuan"
    ]

    is_female = False
    if default_voice_mode == "gadis":
        is_female = True
    elif default_voice_mode == "ardi":
        is_female = False
    elif gender in ("female", "f", "wanita", "cewek", "gadis", "perempuan"):
        is_female = True
    elif gender in ("male", "m", "pria", "cowok", "laki-laki"):
        is_female = False
    elif any(k in speaker for k in female_clues):
        is_female = True
    elif any(k in speaker for k in male_clues):
        is_female = False
    else:
        # Dialogue text inferences
        lowered = text.lower()
        if any(w in lowered for w in ["rokku", "rok ", "mas ", "kakak ", "oppa", "senpai"]):
            is_female = True
        else:
            is_female = False

    voice_name = "id-ID-GadisNeural" if is_female else "id-ID-ArdiNeural"

    # 4. Dynamic Emotion & Prosody
    is_shouting = (
        text.endswith("!") or
        "!!" in text or
        text.isupper() or
        any(w in text.lower() for w in ["sial", "mati", "awas", "brengsek", "bangsat", "cepat", "hei!", "apa?!", "tidak!!", "kabur"])
    )
    is_thought = (
        r_type == "thought" or
        (text.startswith("(") and text.endswith(")")) or
        text.endswith("...")
    )
    is_question = text.endswith("?")

    if is_thought:
        # Inner thought / gentle whisper
        rate = "-8%"
        pitch = "-4Hz" if is_female else "-6Hz"
        volume = "-18%"
    elif is_shouting:
        # Battle cry / Shouting / High emotion
        rate = "+8%"
        pitch = "+18Hz" if is_female else "+14Hz"
        volume = "+25%"
    elif is_question:
        # Inquisitive question
        rate = "+3%"
        pitch = "+8Hz" if is_female else "+6Hz"
        volume = "+5%"
    else:
        # Conversational lively speech
        rate = "+4%"
        pitch = "+4Hz" if is_female else "+2Hz"
        volume = "+0%"

    return (voice_name, rate, pitch, volume)

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
        r_type = r.get("type", "dialogue")
        if r_type in ("dialogue", "narration", "thought", "sign", "other"):
            text = (r.get("translated_text") or r.get("source_text") or "").strip()
            # Skip if text is purely symbols or empty
            if text and any(c.isalnum() for c in text):
                box = r.get("box_2d", [0, 0, 0, 0])
                dialogues.append({
                    "id": r.get("id"),
                    "speaker": r.get("speaker") or ("Narator" if r_type == "narration" else None),
                    "gender": r.get("gender") or ("narrator" if r_type == "narration" else None),
                    "emotion": r.get("emotion"),
                    "type": r_type,
                    "text": text,
                    "box_2d": box
                })

    def manga_sort_key(d):
        b = d["box_2d"]
        if len(b) >= 4:
            ymin, xmin = b[0], b[1]
            y_band = round(ymin / 150)
            return (y_band, -xmin)
        return (0, 0)

    dialogues.sort(key=manga_sort_key)
    return dialogues

async def synthesize_chunk_to_bytes(voice_name: str, text: str, rate: str, pitch: str, volume: str) -> Optional[bytes]:
    """Synthesizes a single dialogue chunk using edge_tts with prosody controls."""
    clean_text = text.strip()
    if not clean_text or not any(c.isalnum() for c in clean_text):
        return None

    try:
        comm = edge_tts.Communicate(text=clean_text, voice=voice_name, rate=rate, pitch=pitch, volume=volume)
        chunks = []
        async for chunk in comm.stream():
            if chunk["type"] == "audio":
                chunks.append(chunk["data"])
        return b"".join(chunks)
    except Exception as e:
        logger.error("TTS synthesis error (%s): %s", voice_name, e)
        return None

async def get_or_generate_page_audio(
    chapter_id: str,
    page_number: int,
    voice_key: str = "auto",
    db: Session = None
) -> Optional[Path]:
    """
    Generates intelligent auto-cast multi-voice audio narration for a manga page.
    Automatically assigns male, female, and narrator voices with emotional prosody.
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

    audio_dir.mkdir(parents=True, exist_ok=True)
    audio_segments: List[bytes] = []

    # Synthesize each bubble with its assigned character voice and emotional prosody
    for d in dialogues:
        t = d["text"].strip()
        if not t or not any(c.isalnum() for c in t):
            continue

        voice_name, rate, pitch, volume = classify_dialogue_voice_and_emotion(d, default_voice_mode=voice_key)
        audio_chunk = await synthesize_chunk_to_bytes(voice_name, t, rate, pitch, volume)
        if audio_chunk:
            audio_segments.append(audio_chunk)

    if not audio_segments:
        return None

    # Stitch all audio segments together
    with open(audio_path, "wb") as f_out:
        for seg in audio_segments:
            f_out.write(seg)

    if audio_path.exists() and audio_path.stat().st_size > 500:
        return audio_path

    return None

async def synthesize_single_bubble(text: str, voice_key: str = "auto") -> Optional[bytes]:
    """
    Instant tap-to-speak synthesis for a single dialogue bubble.
    """
    clean_text = text.strip()
    if not clean_text or not any(c.isalnum() for c in clean_text):
        return None

    dummy_d = {"text": clean_text, "type": "dialogue"}
    voice_name, rate, pitch, volume = classify_dialogue_voice_and_emotion(dummy_d, default_voice_mode=voice_key)
    return await synthesize_chunk_to_bytes(voice_name, clean_text, rate, pitch, volume)
