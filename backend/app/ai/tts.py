import os
import io
import json
import wave
import base64
import asyncio
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
import httpx
try:
    import edge_tts
except ImportError:
    edge_tts = None

try:
    from sqlalchemy.orm import Session
except ImportError:
    Session = Any  # type: ignore

try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None
    types = None

import re
from ..core.config import settings, BASE_DIR
from ..core.logging import logger
try:
    from ..db.models import PageRecord, Chapter
except ImportError:
    PageRecord = None  # type: ignore
    Chapter = None  # type: ignore

DEFAULT_VOICE = "auto"

from .watermark import is_credit_or_watermark, CREDIT_WATERMARK_PATTERNS

FEMALE_CLUES = [
    "girl", "woman", "female", "she", "miko", "mie", "miruko", "nami", "robin", 
    "sakura", "hinata", "chan", "san", "mba", "mbak", "ibu", "mama", "cewek", 
    "gadis", "wanita", "putri", "hime", "lady", "sister", "sis", "perempuan",
    "hana", "yotsuba", "chika", "kaguya", "marin", "frieren", "fern"
]

MALE_CLUES = [
    "boy", "man", "male", "guy", "he", "kun", "luffy", "zoro", "sanji", 
    "naruto", "sasuke", "deku", "bro", "bocah", "cowok", "pria", "abang", 
    "kakek", "paman", "ayah", "papa", "bapak", "laki", "sir", "lord", "tuan", "om"
]

def classify_character_acting(
    dialogue: Dict[str, Any],
    default_voice_mode: str = "auto"
) -> Dict[str, Any]:
    """
    Classifies character role, Gemini voice, and rich acting emotion prompt.
    Includes seamless Edge-TTS fallback parameters.
    Respects page and chapter gender context so all-female manga retains an all-female voice cast.
    """
    text = dialogue.get("text", "").strip()
    r_type = dialogue.get("type", "dialogue")
    gender = (dialogue.get("gender") or "").lower().strip()
    speaker = (dialogue.get("speaker") or "").lower().strip()
    gender_bias = dialogue.get("gender_bias", "neutral")
    lowered = text.lower()

    # 1. Monster / Ghost / Creature (Chilling Horror Acting)
    monster_clues = ["monster", "ghost", "hantu", "demon", "creature", "iblis", "setan", "makhluk", "beast", "zombie", "alien"]
    if any(k in speaker for k in monster_clues):
        return {
            "gemini_voice": "Charon",
            "edge_voice": "id-ID-ArdiNeural",
            "edge_rate": "-10%",
            "edge_pitch": "-18Hz",
            "edge_vol": "+20%",
            "role_desc": "Makhluk monster / hantu yang mengerikan",
            "acting_desc": "Suara berat, dingin, berbisik misterius dan menakutkan, membuat bulu kuduk merinding.",
        }

    # 2. Gender determination
    is_female = False
    if default_voice_mode == "gadis":
        is_female = True
    elif default_voice_mode == "ardi":
        is_female = False
    elif gender in ("female", "f", "wanita", "cewek", "gadis", "perempuan"):
        is_female = True
    elif gender in ("male", "m", "pria", "cowok", "laki-laki"):
        is_female = False
    elif any(k in speaker for k in FEMALE_CLUES):
        is_female = True
    elif any(k in speaker for k in MALE_CLUES):
        is_female = False
    elif gender_bias == "female":
        is_female = True
    elif gender_bias == "male":
        is_female = False
    else:
        if any(w in lowered for w in ["rokku", "rok ", "mas ", "kakak ", "oppa", "senpai"]):
            is_female = True
        else:
            is_female = False

    # 3. Narration handling
    # In manga, rectangular narration boxes are overwhelmingly the protagonist's inner voice.
    # If the page/chapter has a female protagonist or is all-female, narrator uses a female voice.
    if r_type == "narration" or "narator" in speaker or "narrator" in speaker:
        if is_female:
            return {
                "gemini_voice": "Aoede",
                "edge_voice": "id-ID-GadisNeural",
                "edge_rate": "-2%",
                "edge_pitch": "+2Hz",
                "edge_vol": "+5%",
                "role_desc": "Narator wanita anime",
                "acting_desc": "Intonasi narasi batin cerita anime yang lembut, jernih, dan menyentuh.",
            }
        else:
            return {
                "gemini_voice": "Fenrir",
                "edge_voice": "id-ID-ArdiNeural",
                "edge_rate": "-4%",
                "edge_pitch": "-12Hz",
                "edge_vol": "+10%",
                "role_desc": "Narator komik profesional",
                "acting_desc": "Intonasi narasi cerita yang berwibawa, jernih, dan memikat pembaca.",
            }

    # 4. Punctuation & Emotion Nuances
    is_shouting = (
        text.endswith("!") or
        "!!" in text or
        text.isupper() or
        any(w in lowered for w in ["sial", "mati", "awas", "brengsek", "bangsat", "cepat", "hei!", "apa?!", "tidak!!", "kabur"])
    )
    is_thought = (
        r_type == "thought" or
        (text.startswith("(") and text.endswith(")")) or
        text.endswith("...")
    )
    is_question = text.endswith("?")

    if is_female:
        gemini_voice = "Aoede"
        edge_voice = "id-ID-GadisNeural"
        role_desc = "Karakter cewek anime"
        if is_thought:
            acting_desc = "Suara batin gadis anime, berbisik lembut, cemas dan intim."
            edge_rate, edge_pitch, edge_vol = "-8%", "-4Hz", "-18%"
        elif is_shouting:
            acting_desc = "Gadis anime berteriak panik, kaget, dan emosional."
            edge_rate, edge_pitch, edge_vol = "+8%", "+18Hz", "+25%"
        elif is_question:
            acting_desc = "Gadis anime bertanya penasaran dengan nada naik yang manis dan bingung."
            edge_rate, edge_pitch, edge_vol = "+3%", "+8Hz", "+5%"
        else:
            acting_desc = "Gadis anime berbicara santai, hidup, hangat, dan ekspresif."
            edge_rate, edge_pitch, edge_vol = "+4%", "+4Hz", "+0%"
    else:
        gemini_voice = "Puck" if any(w in lowered for w in ["bocah", "bro", "hei", "haha", "aku", "gua"]) else "Fenrir"
        edge_voice = "id-ID-ArdiNeural"
        role_desc = "Karakter cowok anime"
        if is_thought:
            acting_desc = "Suara batin cowok anime bergumam lirih dan tenang."
            edge_rate, edge_pitch, edge_vol = "-8%", "-6Hz", "-18%"
        elif is_shouting:
            acting_desc = "Cowok anime berteriak penuh semangat tempur membara dan lantang."
            edge_rate, edge_pitch, edge_vol = "+8%", "+14Hz", "+25%"
        elif is_question:
            acting_desc = "Cowok anime bertanya heran dan penasaran."
            edge_rate, edge_pitch, edge_vol = "+3%", "+6Hz", "+5%"
        else:
            acting_desc = "Cowok anime berbicara luwes, percaya diri, dan alami."
            edge_rate, edge_pitch, edge_vol = "+4%", "+2Hz", "+0%"

    return {
        "gemini_voice": gemini_voice,
        "edge_voice": edge_voice,
        "edge_rate": edge_rate,
        "edge_pitch": edge_pitch,
        "edge_vol": edge_vol,
        "role_desc": role_desc,
        "acting_desc": acting_desc,
    }

def get_page_dialogues(chapter_id: str, page_number: int, db: Session) -> List[Dict[str, Any]]:
    """
    Extracts ordered dialogues and speech bubbles from a page's analysis regions.
    Filters out scanlator watermarks, credits, and non-dialogue metadata.
    Detects page and chapter gender context so all-female cast manga sounds natural.
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
    female_signals = 0
    male_signals = 0

    for r in regions:
        r_type = r.get("type", "dialogue")
        # STRICT: Only dialogue, narration, thought. Drop 'other', 'sfx', 'sign' (credits/signs/sound effects)
        if r_type not in ("dialogue", "narration", "thought"):
            continue

        text = (r.get("translated_text") or r.get("source_text") or "").strip()
        # Skip if text is purely symbols or empty
        if not text or not any(c.isalnum() for c in text):
            continue

        # Filter out scanlator watermark / translator credits
        if is_credit_or_watermark(text):
            continue

        speaker = (r.get("speaker") or "").strip()
        gender = (r.get("gender") or "").strip().lower()
        spk_lower = speaker.lower()

        if gender in ("female", "f", "wanita", "cewek", "gadis", "perempuan") or any(k in spk_lower for k in FEMALE_CLUES):
            female_signals += 1
        elif gender in ("male", "m", "pria", "cowok", "laki-laki") or any(k in spk_lower for k in MALE_CLUES):
            male_signals += 1

        box = r.get("bbox") or r.get("pixel_bbox") or r.get("box_2d") or [0, 0, 0, 0]
        dialogues.append({
            "id": r.get("id"),
            "speaker": speaker if speaker else ("Narator" if r_type == "narration" else None),
            "gender": gender if gender else ("narrator" if r_type == "narration" else None),
            "emotion": r.get("emotion"),
            "type": r_type,
            "text": text,
            "box_2d": box
        })

    # Determine gender bias: if page has exclusively female characters, bias to female!
    if female_signals > 0 and male_signals == 0:
        page_bias = "female"
    elif male_signals > 0 and female_signals == 0:
        page_bias = "male"
    elif female_signals > 0 and male_signals > 0:
        page_bias = "female" if female_signals >= male_signals else "male"
    else:
        # No characters detected on this page alone; check chapter-wide cast
        page_bias = "neutral"
        if chapter_id and db:
            try:
                other_pages = db.query(PageRecord).filter(
                    PageRecord.chapter_id == chapter_id,
                    PageRecord.page_number != page_number
                ).all()
                ch_fem = 0
                ch_male = 0
                for op in other_pages:
                    if not op.regions_json:
                        continue
                    op_regs = json.loads(op.regions_json)
                    for opr in op_regs:
                        g = (opr.get("gender") or "").lower()
                        s = (opr.get("speaker") or "").lower()
                        if g in ("female", "f", "wanita", "cewek", "gadis", "perempuan") or any(k in s for k in FEMALE_CLUES):
                            ch_fem += 1
                        elif g in ("male", "m", "pria", "cowok", "laki-laki") or any(k in s for k in MALE_CLUES):
                            ch_male += 1
                if ch_fem > 0 and ch_male == 0:
                    page_bias = "female"
                elif ch_male > 0 and ch_fem == 0:
                    page_bias = "male"
            except Exception:
                pass

    for d in dialogues:
        d["gender_bias"] = page_bias

    def manga_sort_key(d):
        b = d["box_2d"]
        if len(b) >= 4:
            ymin, xmin = b[0], b[1]
            y_band = round(ymin / 150)
            return (y_band, -xmin)
        return (0, 0)

    dialogues.sort(key=manga_sort_key)
    return dialogues

import time

TTS_MODELS = [
    "gemini-2.5-flash-preview-tts",
    "gemini-3.1-flash-tts-preview",
    "gemini-3.8-flash-tts",
    "gemini-3.8-flash-lite-tts",
]

# Blacklist known leaked/deactivated keys to prevent wasting 403 API calls
LEAKED_KEYS_BLACKLIST = {
    "AIzaSyAydNtPiy2cahaTH1p7Hn79C6oHeUEjNZs",
}

def get_gemini_api_keys() -> List[str]:
    """Retrieves all configured Gemini API keys supporting rotation, filtering out blacklisted leaked keys."""
    raw_keys = settings.gemini_api_keys
    valid_keys = [k.strip() for k in raw_keys if k.strip() and k.strip() not in LEAKED_KEYS_BLACKLIST]
    return valid_keys if valid_keys else raw_keys

def _call_gemini_tts_sync(text: str, voice_name: str) -> Optional[bytes]:
    """Synchronous Google GenAI Gemini TTS call speaking pure anime character dialogue.
    Automatically rotates through all configured GEMINI_API_KEYs and models.
    Uses direct REST API and google-genai SDK for maximal stability, speed, and authentic expression."""
    keys = get_gemini_api_keys()
    if not keys:
        return None
    clean_text = text.strip()
    if not clean_text or not any(c.isalnum() for c in clean_text):
        return None

    # Rotate across all active keys
    for api_key in keys:
        for model_name in TTS_MODELS:
            # 1. Primary: Direct REST call (fastest, guaranteed 24000Hz PCM bytes)
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
                payload = {
                    "contents": [{"parts": [{"text": clean_text}]}],
                    "generationConfig": {
                        "responseModalities": ["AUDIO"],
                        "speechConfig": {
                            "voiceConfig": {
                                "prebuiltVoiceConfig": {
                                    "voiceName": voice_name
                                }
                            }
                        }
                    }
                }
                with httpx.Client(timeout=15.0) as client:
                    resp = client.post(url, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
                        for part in parts:
                            inline = part.get("inlineData")
                            if inline and inline.get("data"):
                                logger.info("Gemini TTS (%s, voice %s) successfully synthesized dialogue (%d chars)", model_name, voice_name, len(clean_text))
                                return base64.b64decode(inline["data"])
                    elif resp.status_code in (401, 403):
                        logger.warning("Gemini key ...%s returned %d for %s. Rotating key...", api_key[-4:] if len(api_key) > 4 else "", resp.status_code, model_name)
                        break  # Key is invalid/leaked -> move to next key immediately
                    elif resp.status_code == 429:
                        logger.info("Gemini TTS rate limited on %s. Rotating key...", model_name)
                        break  # Key hit RPM/RPD -> move to next key immediately
                    else:
                        logger.debug("Gemini TTS REST %s returned %d: %s", model_name, resp.status_code, resp.text[:120])
                        continue
            except Exception as e:
                logger.debug("Gemini TTS REST error on %s: %s", model_name, e)

            # 2. Secondary: google-genai Client SDK fallback
            if genai is not None:
                try:
                    client = genai.Client(api_key=api_key)
                    resp = client.models.generate_content(
                        model=model_name,
                        contents=clean_text,
                        config=types.GenerateContentConfig(
                            response_modalities=["AUDIO"],
                            speech_config=types.SpeechConfig(
                                voice_config=types.VoiceConfig(
                                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                                        voice_name=voice_name
                                    )
                                )
                            )
                        )
                    )
                    if resp.candidates and resp.candidates[0].content.parts:
                        for part in resp.candidates[0].content.parts:
                            if part.inline_data and part.inline_data.data:
                                logger.info("Gemini SDK TTS (%s, voice %s) generated audio", model_name, voice_name)
                                return part.inline_data.data
                except Exception as sdk_e:
                    logger.debug("Gemini TTS SDK error on %s: %s", model_name, sdk_e)
                    continue

    return None

async def _call_edge_tts(text: str, voice_name: str, rate: str = "+0%", pitch: str = "+0Hz", volume: str = "+0%") -> Optional[bytes]:
    """Fallback Edge-TTS neural synthesizer. Fast, high-fidelity Indonesian neural voice."""
    if edge_tts is None:
        return None
    clean_text = text.strip()
    if not clean_text:
        return None
    try:
        comm = edge_tts.Communicate(text=clean_text, voice=voice_name, rate=rate, pitch=pitch, volume=volume)
        chunks = []
        async for chunk in comm.stream():
            if chunk["type"] == "audio":
                chunks.append(chunk["data"])
        if chunks:
            return b"".join(chunks)
    except Exception as e:
        logger.warning("Edge-TTS with params error (%s): %s", voice_name, e)

    # Retry without rate/pitch customizations
    try:
        comm = edge_tts.Communicate(text=clean_text, voice=voice_name)
        chunks = []
        async for chunk in comm.stream():
            if chunk["type"] == "audio":
                chunks.append(chunk["data"])
        if chunks:
            return b"".join(chunks)
    except Exception as e2:
        logger.error("Edge-TTS default error (%s): %s", voice_name, e2)

    return None

def stitch_wav_buffers(wav_bytes_list: List[bytes], sample_rate: int = 24000) -> Optional[bytes]:
    """
    Seamlessly merges multiple WAV or L16 PCM audio segments into a single WAV audio track
    with a natural 250ms conversational silence between character bubbles.
    Robust against both standard RIFF WAV containers and raw L16 PCM audio bytes.
    """
    if not wav_bytes_list:
        return None

    all_frames = bytearray()
    silence = b"\x00" * int(sample_rate * 0.25 * 2)  # 250ms 16-bit mono silence

    for i, seg in enumerate(wav_bytes_list):
        if not seg:
            continue
        if i > 0:
            all_frames.extend(silence)

        if seg.startswith(b"RIFF"):
            try:
                with wave.open(io.BytesIO(seg), "rb") as w:
                    all_frames.extend(w.readframes(w.getnframes()))
            except Exception:
                all_frames.extend(seg[44:] if len(seg) > 44 else seg)
        else:
            # It's raw L16 PCM samples directly from Gemini TTS!
            all_frames.extend(seg)

    out_buf = io.BytesIO()
    with wave.open(out_buf, "wb") as out_w:
        out_w.setnchannels(1)
        out_w.setsampwidth(2)
        out_w.setframerate(sample_rate)
        out_w.writeframes(bytes(all_frames))

    return out_buf.getvalue()

def _resolve_page_path(p_path: Optional[str], chapter_id: str, page_number: int, img_type: str = "original") -> Optional[Path]:
    if not p_path or p_path.startswith("http"):
        return None
    p = Path(p_path)
    if p.is_absolute() and p.exists():
        return p
    p_from_base = BASE_DIR / p_path
    if p_from_base.exists():
        return p_from_base
    norm = p_path.replace("\\", "/")
    if "data/chapters/" in norm:
        rel = norm.split("data/chapters/", 1)[1]
        cand = settings.data_path / "chapters" / rel
        if cand.exists():
            return cand
    cand = settings.data_path / "chapters" / chapter_id / img_type / f"page_{page_number:04d}.png"
    if cand.exists():
        return cand
    cand = settings.data_path / "chapters" / chapter_id / img_type / f"page_{page_number:04d}.jpg"
    if cand.exists():
        return cand
    return None

async def load_page_image_bytes(record: Any, chapter_id: str, page_number: int) -> Optional[bytes]:
    p_path = record.original_path if (record and record.original_path) else None
    if not p_path and record and record.translated_path:
        p_path = record.translated_path

    if p_path and p_path.startswith("http"):
        headers = {
            "User-Agent": "MangaID/1.5.6 (https://haven-door-mangaid.hf.space)",
            "Referer": "https://mangadex.org/",
            "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
        }
        try:
            async with httpx.AsyncClient(timeout=15.0, headers=headers) as client:
                r = await client.get(p_path)
                if r.status_code == 200 and len(r.content) > 1000:
                    return r.content
        except Exception as e:
            logger.warning("Failed to fetch page image from URL %s: %s", p_path, e)

    resolved = _resolve_page_path(p_path, chapter_id, page_number, "original")
    if not resolved:
        resolved = _resolve_page_path(p_path, chapter_id, page_number, "translated")
    if resolved and resolved.exists():
        return resolved.read_bytes()
    return None

async def ensure_page_dialogues_on_demand(
    chapter_id: str,
    page_number: int,
    db: Session
) -> List[Dict[str, Any]]:
    dialogues = get_page_dialogues(chapter_id, page_number, db)
    if dialogues:
        return dialogues

    if not db or not PageRecord:
        return []

    record = db.query(PageRecord).filter(
        PageRecord.chapter_id == chapter_id,
        PageRecord.page_number == page_number
    ).first()
    if not record:
        return []

    # If regions_json was explicitly analyzed before and has 0 text bubbles (legitimate artwork page), don't re-OCR
    if record.regions_json is not None:
        return []

    try:
        img_bytes = await load_page_image_bytes(record, chapter_id, page_number)
        if not img_bytes:
            return []

        from .analyze import PageAnalyzer
        from .translate import ChapterTranslator
        analyzer = PageAnalyzer()
        res = await analyzer.analyze_page(img_bytes, page_number=page_number)
        regions = res.get("regions", [])
        if not regions:
            record.regions_json = "[]"
            db.commit()
            return []

        # Check if translation is needed
        needs_trans = any(
            not r.get("translated_text") and r.get("source_text") and not is_credit_or_watermark(r.get("source_text", ""))
            for r in regions
        )
        if needs_trans:
            translator = ChapterTranslator()
            trans_res = await translator.translate_chapter([res], tone_preset="gaul", honorifics="keep")
            t_map = trans_res.get("translations", {})
            for r in regions:
                t_val = t_map.get((page_number, r.get("id"))) or t_map.get(r.get("id"))
                if t_val:
                    r["translated_text"] = t_val

        record.regions_json = json.dumps(regions)
        record.status = "analyzed"
        db.commit()
        logger.info("On-demand OCR generated %d dialogue regions for p%d", len(regions), page_number)

        return get_page_dialogues(chapter_id, page_number, db)
    except Exception as err:
        logger.warning("On-demand OCR for p%d failed: %s", page_number, err)
        return []

async def get_or_generate_page_audio(
    chapter_id: str,
    page_number: int,
    voice_key: str = "auto",
    db: Session = None
) -> Optional[Path]:
    """
    Generates expressive anime voice acting audio for a manga page.
    Uses Google Gemini 3.8 Flash Generative TTS first, with graceful Edge-TTS fallback.
    Caches audio to disk so repeat playback takes 0 API calls.
    Optimized: Batches single-voice pages into 1 API call to save 80% quota!
    """
    audio_dir = settings.data_path / "chapters" / chapter_id / "audio"
    wav_path = audio_dir / f"page_{page_number:04d}_{voice_key}.wav"
    mp3_path = audio_dir / f"page_{page_number:04d}_{voice_key}.mp3"

    # Return cached high-fidelity Gemini WAV audio if available
    if wav_path.exists() and wav_path.stat().st_size > 500:
        return wav_path

    if not db:
        return None

    dialogues = await ensure_page_dialogues_on_demand(chapter_id, page_number, db)
    if not dialogues:
        audio_dir.mkdir(parents=True, exist_ok=True)
        chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
        ch_title = (chapter.title if chapter and chapter.title else "Komik").strip()
        ch_num = chapter.chapter_number if chapter and chapter.chapter_number else "1"
        announcement = f"Halaman {page_number}. Bab {ch_num}. Tidak ada dialog pada halaman ini."
        
        # 1. Primary: Gemini Announcement TTS
        gem_voice = "Aoede" if voice_key == "gadis" else ("Fenrir" if voice_key == "ardi" else "Aoede")
        gem_chunk = await asyncio.to_thread(_call_gemini_tts_sync, announcement, gem_voice)
        if gem_chunk and len(gem_chunk) > 500:
            if not gem_chunk.startswith(b"RIFF"):
                buf = io.BytesIO()
                with wave.open(buf, "wb") as w:
                    w.setnchannels(1)
                    w.setsampwidth(2)
                    w.setframerate(24000)
                    w.writeframes(gem_chunk)
                full_wav = buf.getvalue()
            else:
                full_wav = gem_chunk

            with open(wav_path, "wb") as f_out:
                f_out.write(full_wav)
            if wav_path.exists() and wav_path.stat().st_size > 500:
                mp3_path.unlink(missing_ok=True)
                return wav_path

        # 2. Emergency Backup: Edge-TTS
        edge_voice = "id-ID-GadisNeural" if voice_key == "gadis" else "id-ID-ArdiNeural"
        chunk = await _call_edge_tts(announcement, edge_voice)
        if chunk and len(chunk) > 200:
            with open(mp3_path, "wb") as f_out:
                f_out.write(chunk)
            if mp3_path.exists():
                return mp3_path
        return None

    audio_dir.mkdir(parents=True, exist_ok=True)

    # 1. Attempt Primary: Gemini Flash Generative Acting TTS
    specs = [classify_character_acting(d, default_voice_mode=voice_key) for d in dialogues]
    gemini_voices = [s["gemini_voice"] for s in specs]

    # Quota optimization: If page shares the same voice, send full page in 1 single API call!
    if len(set(gemini_voices)) == 1:
        single_voice = gemini_voices[0]
        combined_text = " ... ".join(d["text"].strip() for d in dialogues if d["text"].strip())
        chunk = await asyncio.to_thread(_call_gemini_tts_sync, combined_text, single_voice)
        if chunk and len(chunk) > 500:
            if not chunk.startswith(b"RIFF"):
                buf = io.BytesIO()
                with wave.open(buf, "wb") as w:
                    w.setnchannels(1)
                    w.setsampwidth(2)
                    w.setframerate(24000)
                    w.writeframes(chunk)
                full_wav = buf.getvalue()
            else:
                full_wav = chunk

            with open(wav_path, "wb") as f_out:
                f_out.write(full_wav)
            if wav_path.exists() and wav_path.stat().st_size > 500:
                logger.info("Generated batch Gemini TTS page audio for p%d", page_number)
                mp3_path.unlink(missing_ok=True)
                return wav_path

    # Multi-voice page: Group consecutive bubbles of the same speaker/voice
    # e.g. Monster speaks 2 lines, Girl speaks 1 line, Monster speaks 2 lines
    grouped_segments: List[Tuple[str, str]] = []
    current_voice = None
    current_texts: List[str] = []

    for d, spec in zip(dialogues, specs):
        t = d["text"].strip()
        if not t or not any(c.isalnum() for c in t):
            continue
        v = spec["gemini_voice"]
        if v == current_voice:
            current_texts.append(t)
        else:
            if current_texts and current_voice:
                grouped_segments.append((" ... ".join(current_texts), current_voice))
            current_voice = v
            current_texts = [t]

    if current_texts and current_voice:
        grouped_segments.append((" ... ".join(current_texts), current_voice))

    gemini_segments: List[bytes] = []
    gemini_failed = False

    for grp_text, grp_voice in grouped_segments:
        chunk = await asyncio.to_thread(_call_gemini_tts_sync, grp_text, grp_voice)
        if chunk and len(chunk) > 500:
            gemini_segments.append(chunk)
        else:
            gemini_failed = True
            break

    if not gemini_failed and gemini_segments:
        stitched_wav = stitch_wav_buffers(gemini_segments)
        if stitched_wav:
            with open(wav_path, "wb") as f_out:
                f_out.write(stitched_wav)
            if wav_path.exists() and wav_path.stat().st_size > 500:
                logger.info("Successfully generated page audio via Gemini Flash TTS for p%d", page_number)
                mp3_path.unlink(missing_ok=True)
                return wav_path

    # 2. Backup Fallback: Edge-TTS Neural Stitching
    # If a fallback mp3 already exists from earlier, return it now (since Gemini failed)
    if mp3_path.exists() and mp3_path.stat().st_size > 500:
        return mp3_path

    logger.info("Using Edge-TTS fallback for page %d", page_number)
    edge_segments: List[bytes] = []
    for d in dialogues:
        t = d["text"].strip()
        if not t or not any(c.isalnum() for c in t):
            continue

        spec = classify_character_acting(d, default_voice_mode=voice_key)
        chunk = await _call_edge_tts(
            t,
            spec["edge_voice"],
            spec["edge_rate"],
            spec["edge_pitch"],
            spec["edge_vol"]
        )
        if chunk:
            edge_segments.append(chunk)

    if not edge_segments:
        return None

    with open(mp3_path, "wb") as f_out:
        for seg in edge_segments:
            f_out.write(seg)

    if mp3_path.exists() and mp3_path.stat().st_size > 500:
        return mp3_path

    return None

async def synthesize_single_bubble(text: str, voice_key: str = "auto") -> Optional[bytes]:
    """
    Instant tap-to-speak synthesis for a single dialogue bubble.
    Tries Gemini 3.8 Flash TTS first, falls back to Edge-TTS.
    """
    clean_text = text.strip()
    if not clean_text or not any(c.isalnum() for c in clean_text):
        return None

    if is_credit_or_watermark(clean_text):
        return None

    dummy_d = {"text": clean_text, "type": "dialogue"}
    spec = classify_character_acting(dummy_d, default_voice_mode=voice_key)

    # 1. Try Gemini
    if settings.GEMINI_API_KEY:
        gemini_chunk = await asyncio.to_thread(
            _call_gemini_tts_sync,
            clean_text,
            spec["gemini_voice"]
        )
        if gemini_chunk and len(gemini_chunk) > 500:
            if not gemini_chunk.startswith(b"RIFF"):
                buf = io.BytesIO()
                with wave.open(buf, "wb") as w:
                    w.setnchannels(1)
                    w.setsampwidth(2)
                    w.setframerate(24000)
                    w.writeframes(gemini_chunk)
                return buf.getvalue()
            return gemini_chunk

    # 2. Fallback Edge-TTS
    return await _call_edge_tts(
        clean_text,
        spec["edge_voice"],
        spec["edge_rate"],
        spec["edge_pitch"],
        spec["edge_vol"]
    )
