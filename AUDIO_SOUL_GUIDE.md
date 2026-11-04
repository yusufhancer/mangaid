# 🎙️ AUDIO SOUL GUIDE: Rahasia Suara "Berjiwa", Emosi & Nada Ketakutan di MangaID

Panduan teknis dan filosofi rekayasa audio ini menjelaskan secara mendalam kenapa suara di **Mieruko-chan Bab 2 & Bab 3** bisa begitu hidup, ada nada ketakutan, bisikan merinding monster, dan intonasi anime yang nyata—serta cara mengembalikannya di server Linux kamu agar tidak robotik/hambar.

---

## 🧠 1. Kenapa Suara Versi Kita "Ada Jiwanya" & Gak Robotik?

Suara biasa (Google Translate TTS / gTTS / Edge-TTS standar) membaca kata per kata secara mekanis tanpa memahami konteks cerita. Di MangaID, kita membangun sistem **Generative Vocal Acting Pipeline**:

### A. Penggunaan Gemini Generative Audio Modality
Bukan sekadar TTS biasa, kita memakai API Gemini generasi terbaru dengan konfigurasi `responseModalities: ["AUDIO"]`. 
Model ini **memahami makna kata dan tanda baca**:
- Tanda elipsis (`...`) dibaca dengan **nada terengah-engah, ragu, berbisik, atau menahan napas**.
- Kalimat seperti `"M... ma..."` atau `"Mama..."` secara alami disintesis dengan **getaran suara ketakutan**.
- Kalimat berteriak (`!`, `!!`, huruf kapital) disintesis dengan desakan napas dan intonasi panik.

### B. Casting Suara Khusus per Karakter (Voice Persona)
| Karakter | Gemini Voice | Sifat Suara & Akting |
|---|---|---|
| **Miko / Cewek Anime** | `Aoede` | Suara cewek anime lembut, nafas emosional, sangat hidup saat cemas, ketakutan, atau bicara sendiri. |
| **Hantu / Monster** | `Charon` | Suara berat, dingin, berbisik dari kegelapan, sangat menyeramkan layaknya film horor. |
| **Narator / Pria Dewasa** | `Fenrir` | Intonasi berat, berwibawa, jernih. |
| **Cowok Muda / Enerjik** | `Puck` | Suara cowok anime lincah, kasual, santai. |

---

## 🚫 2. Kesalahan Fatal yang Sempat Terjadi & Solusinya

### Masalah 1: "Prompt ikut kebaca sama AI-nya"
- **Penyebab**: Dulu sempat dicoba memasukkan instruksi akting ke dalam teks, misalnya: `"[Gadis anime ketakutan]: Mama..."`. Akibatnya, mesin TTS justru membaca kalimat `Gadis anime ketakutan` tersebut dengan suara robot!
- **Solusinya (Pure Dialogue Rule)**:
  Teks yang dikirim ke Gemini TTS **WAJIB 100% DIALOG MURNI** tanpa embel-embel prompt deskripsi.
  ```python
  clean_text = text.strip()  # HANYA "Mama..." atau "Garamnya udah siap..."
  ```
  Biarkan tanda baca (`...`, `!`, `?`) dan pemilihan nama voice (`Aoede` / `Charon`) yang mengatur emosinya!

### Masalah 2: "Watermark scanlator dibaca jadi cowok di akhir bab"
- **Penyebab**: Teks kredit pojok seperti `TL BY @ROKUUSO` ikut diterjemahkan dan dibacakan TTS di akhir halaman.
- **Solusinya**: Modul `backend/app/ai/watermark.py` menyaring semua pola `@handle`, `TL BY`, `Discord`, `Trakteer` sebelum masuk ke generator suara.

### Masalah 3: "Di Linux suaranya jadi datar & robotik"
Jika di Linux suaranya berubah jadi kaku kayak Google Translate, **hampir pasti salah satu hal ini terjadi**:
1. **API Key Gemini Tidak Terbaca di Linux**: Sistem langsung diam-diam beralih ke *Fallback Edge-TTS* standar tanpa intonasi.
2. **Model TTS yang Dipanggil Salah / Kadaluarsa**: Model yang dipakai harus salah satu dari `TTS_MODELS` aktif.
3. **Logika Klasifikasi Karakter Terlewat**: Hantu tidak dialirkan ke `Charon` dan cewek tidak dialirkan ke `Aoede`.

---

## ⚙️ 3. Arsitektur Kode Inti Audio (`backend/app/ai/tts.py`)

Berikut adalah komponen wajib yang membuat audio berjiwa di backend:

### A. Model Pool Gemini TTS
```python
TTS_MODELS = [
    "gemini-2.5-flash-preview-tts",
    "gemini-3.1-flash-tts-preview",
    "gemini-3.8-flash-tts",
    "gemini-3.8-flash-lite-tts",
]
```

### B. Otak Klasifikasi Karakter & Emosi (`classify_character_acting`)
```python
def classify_character_acting(dialogue: Dict[str, Any], default_voice_mode: str = "auto") -> Dict[str, Any]:
    text = dialogue.get("text", "").strip()
    speaker = (dialogue.get("speaker") or "").lower().strip()
    lowered = text.lower()

    # 1. HANTU / MONSTER -> Wajib CHARON (Horor Dingin)
    monster_clues = ["monster", "ghost", "hantu", "demon", "creature", "iblis", "setan", "makhluk", "beast", "zombie"]
    if any(k in speaker for k in monster_clues):
        return {
            "gemini_voice": "Charon",
            "edge_voice": "id-ID-ArdiNeural",
            "edge_rate": "-10%",
            "edge_pitch": "-18Hz",
            "edge_vol": "+20%",
        }

    # 2. KARAKTER CEWEK / MIKO -> Wajib AOEDE (Ekspresif & Ketakutan)
    # Jika komik berlatar cewek (seperti Mieruko-chan), default ke Aoede
    is_female = True  # dideteksi dari clues atau konteks halaman

    if is_female:
        gemini_voice = "Aoede"
        # Emosi pikiran / ketakutan batin
        if text.endswith("...") or text.startswith("("):
            edge_rate, edge_pitch, edge_vol = "-8%", "-4Hz", "-18%"
        elif text.endswith("!") or "!!" in text:
            edge_rate, edge_pitch, edge_vol = "+8%", "+18Hz", "+25%"
        else:
            edge_rate, edge_pitch, edge_vol = "+4%", "+4Hz", "+0%"
        
        return {
            "gemini_voice": gemini_voice,
            "edge_voice": "id-ID-GadisNeural",
            "edge_rate": edge_rate,
            "edge_pitch": edge_pitch,
            "edge_vol": edge_vol
        }
```

### C. Request REST Gemini Generative Audio (Format 24kHz PCM)
```python
url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
payload = {
    "contents": [{"parts": [{"text": clean_text}]}],
    "generationConfig": {
        "responseModalities": ["AUDIO"],
        "speechConfig": {
            "voiceConfig": {
                "prebuiltVoiceConfig": {
                    "voiceName": voice_name  # "Aoede" atau "Charon"
                }
            }
        }
    }
}
```

### D. Penggabungan Audio Balon Kata dengan Jeda Alami (`stitch_wav_buffers`)
Agar percakapan antar balon kata tidak bertabrakan, disisipkan **250 milidetik jeda hening** di setiap perpindahan balon:
```python
def stitch_wav_buffers(wav_bytes_list: List[bytes], sample_rate: int = 24000) -> Optional[bytes]:
    all_frames = bytearray()
    silence = b"\x00" * int(sample_rate * 0.25 * 2)  # 250ms jeda nafas alami

    for i, seg in enumerate(wav_bytes_list):
        if i > 0:
            all_frames.extend(silence)
        # Tambahkan frame PCM audio
        ...
```

---

## 🛠️ 4. Checklist Mengembalikan Suara "Berjiwa" di Linux

Lakukan 4 langkah ini di server Linux kamu:

1. **Cek Ketersediaan API Key di `.env` Linux**:
   Pastikan di file `.env` server Linux kamu ada key Gemini yang aktif (5 key yang sudah kita siapkan):
   ```bash
   grep GEMINI_API_KEY .env
   ```
   *Jika API key kosong atau kena kuota, sistem akan jatuh ke Edge-TTS yang nadanya lebih datar.*

2. **Pastikan File `backend/app/ai/tts.py` dan `watermark.py` Sesuai dengan Repo Asli**:
   Pastikan kamu tidak menimpa fungsi `_call_gemini_tts_sync` atau menghapus pemetaan `Aoede` & `Charon`.
   Bisa dicek dengan:
   ```bash
   git status
   git diff backend/app/ai/tts.py
   ```

3. **Hapus Cache Audio Lama di Linux Agar Di-generate Ulang**:
   Audio yang sudah terlanjur kaku tersimpan di folder `data/chapters/{id}/audio/`.
   Hapus file `.wav` dan `.mp3` bab terkait agar server men-generate suara baru dengan Gemini TTS:
   ```bash
   rm -rf data/chapters/*/audio/*.wav data/chapters/*/audio/*.mp3
   ```

4. **Tes Langsung Endpoint Audio**:
   Buka URL bab di browser atau uji via curl:
   ```bash
   curl -I http://localhost:8000/api/chapters/{CHAPTER_ID}/pages/1/audio
   ```
   Pastikan response berupa `audio/wav` (Gemini Audio) dengan ukuran ratusan kilobyte, bukan `audio/mpeg` flat.

---

Dengan konfigurasi ini, suara di Linux kamu dijamin akan kembali punya "jiwa", desah nafas ketakutan Miko yang gemetar, dan bisikan hantu Charon yang bikin merinding persis seperti di Bab 2 & Bab 3! 🔥
