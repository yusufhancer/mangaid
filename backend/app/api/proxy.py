from urllib.parse import urlparse
from fastapi import APIRouter, Query, Response, HTTPException
import httpx
from ..ingestion.security import validate_url_safe
from ..core.logging import logger

router = APIRouter(tags=["Proxy"])

ALLOWED_REFERER_MAP = {
    "mangadex.org": "https://mangadex.org/",
    "mangadex.network": "https://mangadex.org/",
    "uploads.mangadex.org": "https://mangadex.org/",
}

@router.get("/proxy/image")
async def proxy_image(url: str = Query(..., description="Target image URL to proxy")):
    url = url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL cannot be empty")

    is_safe, error_msg = validate_url_safe(url)
    if not is_safe:
        raise HTTPException(status_code=400, detail=f"Invalid or unsafe URL: {error_msg}")

    parsed = urlparse(url)
    domain = parsed.hostname.lower() if parsed.hostname else ""

    headers = {
        "User-Agent": "MangaID/1.0 (https://github.com/mangaid-app)",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    }

    # Add appropriate Referer if target requires specific referer (e.g. MangaDex)
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
            return Response(
                content=resp.content,
                status_code=200,
                media_type=content_type,
                headers={
                    "Cache-Control": "public, max-age=604800, immutable",
                    "Cross-Origin-Resource-Policy": "cross-origin",
                }
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error proxying image %s: %s", url, str(e))
        raise HTTPException(status_code=502, detail=f"Proxy error: {str(e)}")
