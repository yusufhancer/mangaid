import re
from urllib.parse import urlparse, urljoin
from typing import List, Dict, Any, Optional

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".avif", ".bmp"}

EXCLUDE_PATTERNS = re.compile(
    r"(logo|avatar|icon|favicon|banner|badge|button|thumb|thumbnail|ad[-_]|advert|sponsor|"
    r"facebook|twitter|discord|patreon|donation|track|analytics|pixel|gravatar|header|footer)",
    re.IGNORECASE
)

NUMBER_PATTERN = re.compile(r"(\d+)")

def extract_numeric_sequence(url_or_name: str) -> Optional[int]:
    """Extracts trailing or most prominent integer in filename for natural sorting."""
    filename = urlparse(url_or_name).path.split("/")[-1]
    # Remove file extension
    base = filename.rsplit(".", 1)[0] if "." in filename else filename
    matches = NUMBER_PATTERN.findall(base)
    if matches:
        try:
            return int(matches[-1])
        except ValueError:
            pass
    return None

def is_probable_manga_image(url: str, alt: str = "", class_names: str = "") -> bool:
    """Filter out obvious non-manga images (logos, avatars, ad trackers)."""
    combined = f"{url} {alt} {class_names}".lower()
    if EXCLUDE_PATTERNS.search(combined):
        return False
    
    parsed = urlparse(url)
    path_lower = parsed.path.lower()
    
    # Must either end in an image extension or have image indicator in path/query
    has_ext = any(path_lower.endswith(ext) for ext in IMAGE_EXTENSIONS)
    has_img_word = any(w in path_lower for w in ("image", "page", "chapter", "manga", "comic", "upload", "wp-content", "data"))
    
    return has_ext or has_img_word or bool(parsed.query)

def score_candidate(candidate: Dict[str, Any], container_counts: Dict[str, int]) -> float:
    """
    Scores an image candidate from 0.0 to 1.0 based on heuristic cues:
    - container frequency
    - lazy loading attribute presence
    - sequential naming pattern
    - class / id naming cues
    """
    score = 0.5
    url = candidate.get("url", "")
    tag_attr = candidate.get("source_attr", "")
    container_xpath = candidate.get("container_tag", "")
    class_str = candidate.get("classes", "").lower()
    id_str = candidate.get("id", "").lower()
    
    # Reader-specific keywords in class/id
    reader_keywords = ("reader", "page", "chapter", "comic", "manga", "canvas", "scan", "webtoon")
    if any(k in class_str or k in id_str for k in reader_keywords):
        score += 0.2
        
    # Lazy attributes like data-src / data-lazy-src are standard in manga readers
    if tag_attr in ("data-src", "data-lazy-src", "data-original", "data-url"):
        score += 0.15

    # If it belongs to a container with multiple image siblings
    count_in_container = container_counts.get(container_xpath, 0)
    if count_in_container >= 5:
        score += 0.25
    elif count_in_container >= 2:
        score += 0.15

    # Numeric sequence in filename
    if extract_numeric_sequence(url) is not None:
        score += 0.1

    return min(1.0, max(0.0, score))

def deduplicate_and_sort(candidates: List[Dict[str, Any]]) -> List[str]:
    """
    Deduplicates URLs while preserving ordering.
    If images have sequence numbers and appear in DOM order, returns clean list of URLs.
    """
    seen = set()
    result = []
    
    for c in candidates:
        url = c["url"].strip()
        if not url:
            continue
        # Normalize protocol-relative URLs
        if url.startswith("//"):
            url = "https:" + url
        if url not in seen:
            seen.add(url)
            result.append(url)
            
    return result
