import os
from pathlib import Path
import gradio as gr
import spaces

# 1. ZeroGPU required function
@spaces.GPU
def gpu_health(x):
    return "MangaID Engine Active"

# 2. Paths
frontend_out = Path(__file__).resolve().parent / "frontend" / "out"

# 3. Gradio Blocks UI (Full-screen clean MangaID)
with gr.Blocks(title="MangaID Universal AI Translator", css="footer {display: none !important;} .gradio-container {padding: 0 !important; max-width: 100% !important;}") as demo:
    gr.HTML('<iframe src="/gradio_api/file=frontend/out/index.html" style="position:fixed; top:0; left:0; width:100%; height:100%; border:none; margin:0; padding:0; z-index:999999;"></iframe>')
    btn = gr.Button("Ping", visible=False)
    txt = gr.Textbox(visible=False)
    btn.click(fn=gpu_health, inputs=[txt], outputs=[txt])

# 4. Mount Backend Routers & Database
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

demo.app.include_router(health_router, prefix="/manga_api")
demo.app.include_router(ingest_router, prefix="/manga_api")
demo.app.include_router(jobs_router, prefix="/manga_api")
demo.app.include_router(chapters_router, prefix="/manga_api")
demo.app.include_router(explorer_router, prefix="/manga_api")
demo.app.include_router(proxy_router, prefix="/manga_api")

# 5. Launch Gradio with allowed paths
demo.queue().launch(
    server_name="0.0.0.0",
    server_port=7860,
    allowed_paths=[str(frontend_out)] if frontend_out.exists() else []
)
