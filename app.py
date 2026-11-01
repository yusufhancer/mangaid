import os
from pathlib import Path
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import gradio as gr
import spaces

# 1. ZeroGPU required function
@spaces.GPU
def gpu_health(x):
    return "MangaID Engine Active"

# 2. Paths
frontend_out = Path(__file__).resolve().parent / "frontend" / "out"

# 3. Gradio Blocks UI (Full-screen clean MangaID frame)
with gr.Blocks(title="MangaID Universal AI Translator", css="footer {display: none !important;} .gradio-container {padding: 0 !important; max-width: 100% !important;}") as demo:
    gr.HTML('<iframe src="/index.html" style="position:fixed; top:0; left:0; width:100%; height:100%; border:none; margin:0; padding:0; z-index:999999;"></iframe>')
    btn = gr.Button("Ping", visible=False)
    txt = gr.Textbox(visible=False)
    btn.click(fn=gpu_health, inputs=[txt], outputs=[txt])

# 4. Backend Database & Logging Init
from backend.app.core.config import settings
from backend.app.core.logging import setup_logging
from backend.app.db.session import init_db
from backend.app.api.health import router as health_router
from backend.app.api.ingest import router as ingest_router
from backend.app.api.jobs import router as jobs_router
from backend.app.api.chapters import router as chapters_router
from backend.app.api.explorer import router as explorer_router
from backend.app.api.proxy import router as proxy_router

setup_logging()
init_db()

# 5. Launch Gradio with SSR disabled so Python directly owns port 7860
server_app, local_url, share_url = demo.queue().launch(
    server_name="0.0.0.0",
    server_port=7860,
    prevent_thread_lock=True,
    ssr_mode=False,
    allowed_paths=[str(frontend_out)] if frontend_out.exists() else []
)

# 6. Mount backend routers to /api, /manga_api, and /gradio_api/manga_api
routers = [health_router, ingest_router, jobs_router, chapters_router, explorer_router, proxy_router]
for r in routers:
    server_app.include_router(r, prefix="/api")
    server_app.include_router(r, prefix="/manga_api")
    server_app.include_router(r, prefix="/gradio_api/manga_api")

# 7. Mount Next.js static assets (_next, icons, logo, html)
if (frontend_out / "_next").exists():
    server_app.mount("/_next", StaticFiles(directory=str(frontend_out / "_next")), name="next_assets")

if (frontend_out / "icons").exists():
    server_app.mount("/icons", StaticFiles(directory=str(frontend_out / "icons")), name="icons_assets")

@server_app.get("/index.html")
def serve_index():
    return FileResponse(frontend_out / "index.html")

@server_app.get("/logo.png")
def serve_logo():
    return FileResponse(frontend_out / "logo.png")

@server_app.get("/manifest.json")
def serve_manifest():
    return FileResponse(frontend_out / "manifest.json")

@server_app.get("/sw.js")
def serve_sw():
    return FileResponse(frontend_out / "sw.js")

@server_app.get("/favicon.ico")
def serve_favicon():
    return FileResponse(frontend_out / "favicon.ico")

# 8. Keep process alive
demo.block_thread()
