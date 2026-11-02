from urllib.parse import urlparse
from fastapi import APIRouter, Query, Response, HTTPException
import httpx
from ..ingestion.security import validate_url_safe
from ..core.logging import logger

router = APIRouter(tags=["Proxy"])

# Referer mapping for sites that require matching Referer headers
ALLOWED_REFERER_MAP = {
    "komikindo.ch": "https://komikindo.ch/",
    "komikindo.tv": "https://komikindo.tv/",
    "nhentai.net": "https://nhentai.net/",
    "nhentai.to": "https://nhentai.to/",
    "nhentai.xxx": "https://nhentai.xxx/",
    "nhentai.website": "https://nhentai.website/",
    "nhentai.jp.net": "https://nhentai.website/",
    "cubari.moe": "https://cubari.moe/",
    "supercdn.site": "https://nhentai.to/",
    "manganato.com": "https://manganato.com/",
    "chapmanganato.to": "https://chapmanganato.to/",
    "mangakakalot.com": "https://mangakakalot.com/",
}

@router.get("/proxy/image")
@router.head("/proxy/image")
async def proxy_image(
    url: str = Query(..., description="Target image URL to proxy"),
    v: Optional[str] = Query(None, description="Cache buster version")
):
    url = url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL cannot be empty")

    is_safe, error_msg = validate_url_safe(url)
    if not is_safe:
        raise HTTPException(status_code=400, detail=f"Invalid or unsafe URL: {error_msg}")

    parsed = urlparse(url)
    domain = parsed.hostname.lower() if parsed.hostname else ""

    is_mangadex = "mangadex.org" in domain or "mangadex.network" in domain

    if is_mangadex:
        # MangaDex requires its official identifying User-Agent and blocks requests with Referer
        headers = {
            "User-Agent": "MangaID/1.0 (https://github.com/mangaid-app)",
            "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        }
    else:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        }
        for domain_key, ref in ALLOWED_REFERER_MAP.items():
            if domain == domain_key or domain.endswith("." + domain_key):
                headers["Referer"] = ref
                break

    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code != 200:
                logger.warning("Proxy fetch failed for %s: status %d", url, resp.status_code)
                raise HTTPException(status_code=resp.status_code, detail="Failed to fetch image from upstream")

            content_type = resp.headers.get("content-type", "image/jpeg")
            # If upstream returned an HTML challenge or webpage, reject it
            if content_type.startswith("text/html") or resp.content.startswith(b"<!doctype html") or b"<html" in resp.content[:100]:
                logger.warning("Proxy received HTML challenge instead of image for %s", url)
                raise HTTPException(status_code=502, detail="Upstream returned HTML challenge instead of image")

            cache_header = "public, max-age=604800, immutable" if content_type.startswith("image/") else "no-cache, no-store"

            return Response(
                content=resp.content,
                status_code=200,
                media_type=content_type,
                headers={
                    "Cache-Control": cache_header,
                    "Cross-Origin-Resource-Policy": "cross-origin",
                }
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error proxying image %s: %s", url, str(e))
        raise HTTPException(status_code=502, detail=f"Proxy error: {str(e)}")
