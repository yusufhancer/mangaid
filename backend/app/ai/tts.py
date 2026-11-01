import os
import io
import json
import wave
import asyncio
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
import edge_tts
from sqlalchemy.orm import Session
from google import genai
from google.genai import types

import re
from ..core.config import settings
from ..core.logging import logger
from ..db.models import PageRecord, Chapter

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
    "gemini-2.5-pro-preview-tts",
]

def get_gemini_api_keys() -> List[str]:
    """Retrieves all configured Gemini API keys supporting rotation."""
    return settings.gemini_api_keys

def _call_gemini_tts_sync(text: str, voice_name: str) -> Optional[bytes]:
    """Synchronous Google GenAI Gemini TTS call speaking ONLY the pure dialogue.
    Automatically rotates through all configured GEMINI_API_KEYs and all TTS_MODELS."""
    keys = get_gemini_api_keys()
    if not keys:
        return None
    clean_text = text.strip()
    if not clean_text or not any(c.isalnum() for c in clean_text):
        return None

    for api_key in keys:
        try:
            client = genai.Client(api_key=api_key)
        except Exception as err:
            logger.error("Failed to initialize GenAI client: %s", err)
            continue

        for model_name in TTS_MODELS:
            try:
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
                            return part.inline_data.data
            except Exception as e:
                err_msg = str(e)
                if "PerMinute" in err_msg or "retry in" in err_msg:
                    # Temporary burst limit: wait 3.5s and retry once
                    logger.info("RPM burst limit on model %s, pausing 3.5s...", model_name)
                    time.sleep(3.5)
                    try:
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
                                    return part.inline_data.data
                    except Exception as retry_err:
                        logger.warning("Retry on model %s failed: %s", model_name, retry_err)

                logger.warning("Gemini TTS model %s failed for key ...%s (%s): %s", model_name, api_key[-4:] if len(api_key) > 4 else "", voice_name, e)
                # Try NEXT model in TTS_MODELS!
                continue

    return None

async def _call_edge_tts(text: str, voice_name: str, rate: str, pitch: str, volume: str) -> Optional[bytes]:
    """Fallback Edge-TTS neural synthesizer."""
    try:
        comm = edge_tts.Communicate(text=text, voice=voice_name, rate=rate, pitch=pitch, volume=volume)
        chunks = []
        async for chunk in comm.stream():
            if chunk["type"] == "audio":
                chunks.append(chunk["data"])
        return b"".join(chunks)
    except Exception as e:
        logger.error("Edge-TTS error (%s): %s", voice_name, e)
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

    dialogues = get_page_dialogues(chapter_id, page_number, db)
    if not dialogues:
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
        if chunk and len(chunk) > 1000:
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
        if chunk and len(chunk) > 1000:
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
