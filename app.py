import os
from pathlib import Path
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
import gradio as gr
import spaces

# 1. ZeroGPU required GPU function
@spaces.GPU
def gpu_health(x):
    return "MangaID AI Active"

# 2. Gradio Blocks UI (Full-screen embedding of MangaID Reader)
with gr.Blocks(title="MangaID Universal AI Translator") as demo:
    gr.HTML('''
    <style>
        footer {display: none !important;}
        .gradio-container {padding: 0 !important; max-width: 100% !important;}
    </style>
    <iframe src="/app" style="position:fixed; top:0; left:0; width:100%; height:100%; border:none; margin:0; padding:0; z-index:999999;"></iframe>
    ''')
    btn = gr.Button("Ping", visible=False)
    txt = gr.Textbox(visible=False)
    btn.click(fn=gpu_health, inputs=[txt], outputs=[txt])

# 3. Mount Backend Routers & Database
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

# 4. Serve Next.js Frontend Assets
frontend_out = Path(__file__).resolve().parent / "frontend" / "out"
if frontend_out.exists():
    next_static = frontend_out / "_next"
    if next_static.exists():
        demo.app.mount("/_next", StaticFiles(directory=str(next_static)), name="next_static")

    @demo.app.get("/app", response_class=HTMLResponse)
    def serve_mangaid_app():
        index_file = frontend_out / "index.html"
        if index_file.exists():
            return HTMLResponse(content=index_file.read_text(encoding="utf-8"))
        return HTMLResponse(content="<h1>MangaID Frontend Loading...</h1>")

# 5. Launch native Gradio server for ZeroGPU
demo.queue().launch(server_name="0.0.0.0", server_port=7860)
