import re

CREDIT_WATERMARK_PATTERNS = [
    r"@\w+",
    r"\b(tl|tl-an|translate|translator|terjemahan|diterjemahkan|penerjemah)\s*(oleh|by|:|\-|\b)",
    r"\b(cleaner|cl|typesetter|ts|proofreader|pr|redrawer|rd|typeset)\s*(oleh|by|:|\-)",
    r"\b(raw\s*(provider|source|by|:)|encoded\s*by)\b",
    r"\b(scans?|scanlation|scanlator)\b",
    r"\b(komikcast|westmanga|mangaku|bacakomik|shinigami|kiryuu|maid\.my|komikindo|komiku|mangatale|manhwaindo|sektekomik|mangakita|komikgo)\b",
    r"\b(join\s+discord|link\s+discord|discord\.gg|discord\.com|t\.me\/)\b",
    r"\b(traktir|trakteer|karyakarsa|saweria|donasi|support\s+us)\b",
    r"\b(baca\s+hanya\s+di|baca\s+di\s+web|hanya\s+di|dilarang\s+(memperjualbelikan|reupload|re\-upload|mirror))\b",
    r"\b(project|proyek)\s*:\s*\w+",
    r"\b(visit|kunjungi)\s*:\s*\w+",
    r"https?://\S+",
    r"www\.\S+",
]

def is_credit_or_watermark(text: str) -> bool:
    """Detects scanlator watermarks, credits, and translator social handles."""
    if not text:
        return True
    lowered = text.lower().strip()
    if "@" in lowered:
        return True
    for pat in CREDIT_WATERMARK_PATTERNS:
        if re.search(pat, lowered, re.IGNORECASE):
            return True
    return False
