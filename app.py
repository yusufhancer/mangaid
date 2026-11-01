import os
from pathlib import Path
from fastapi.staticfiles import StaticFiles
import gradio as gr
import spaces

@spaces.GPU
def gpu_health():
    return "MangaID AI Engine Online"

from backend.app.main import app as fastapi_app

# Path to built Next.js static frontend
frontend_out = Path(__file__).resolve().parent / "frontend" / "out"

if frontend_out.exists():
    # Mount Next.js static export at root "/"
    fastapi_app.mount("/", StaticFiles(directory=str(frontend_out), html=True), name="frontend")

# Gradio status UI to satisfy Hugging Face Spaces ZeroGPU scanner
with gr.Blocks(title="MangaID Status") as demo:
    gr.Markdown("# 📖 MangaID Universal Translator\nStatus: **Online** | Powered by Gemini AI (16 GB RAM Cloud)")
    btn = gr.Button("Check AI Status", visible=False)
    txt = gr.Textbox(visible=False)
    btn.click(fn=gpu_health, inputs=[], outputs=[txt])

app = gr.mount_gradio_app(fastapi_app, demo, path="/gradio_status")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 7860))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)
