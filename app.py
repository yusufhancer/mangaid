import os
from pathlib import Path
from fastapi.staticfiles import StaticFiles
import gradio as gr
import spaces

# 1. ZeroGPU required GPU function
@spaces.GPU
def gpu_health(x):
    return "MangaID AI Engine Active"

# 2. Gradio Blocks with auto-redirect to /reader/
with gr.Blocks(title="MangaID Universal AI Translator") as demo:
    gr.HTML('<meta http-equiv="refresh" content="0; url=/reader/">')
    gr.Markdown("# 📖 Mengalihkan ke MangaID Reader...\nJika tidak beralih otomatis, [klik di sini untuk membuka](/reader/).")
    btn = gr.Button("Ping", visible=False)
    txt = gr.Textbox(visible=False)
    btn.click(fn=gpu_health, inputs=[txt], outputs=[txt])

# 3. Mount MangaID backend routes & database
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

demo.app.include_router(health_router, prefix="/api")
demo.app.include_router(ingest_router, prefix="/api")
demo.app.include_router(jobs_router, prefix="/api")
demo.app.include_router(chapters_router, prefix="/api")
demo.app.include_router(explorer_router, prefix="/api")
demo.app.include_router(proxy_router, prefix="/api")

# 4. Mount built static Next.js frontend
frontend_out = Path(__file__).resolve().parent / "frontend" / "out"
if frontend_out.exists():
    demo.app.mount("/reader", StaticFiles(directory=str(frontend_out), html=True), name="frontend")

# 5. Launch native Gradio server for Hugging Face
demo.queue().launch(server_name="0.0.0.0", server_port=7860)
