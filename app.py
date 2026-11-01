import os
from pathlib import Path
from fastapi.staticfiles import StaticFiles
import gradio as gr
import spaces

# 1. ZeroGPU required GPU function
@spaces.GPU
def gpu_health(x):
    return "MangaID AI Active"

# 2. Gradio interface for ZeroGPU scanner
with gr.Blocks(title="MangaID Status") as demo:
    gr.Markdown("# 📖 MangaID AI Engine Status: **Online**")
    btn = gr.Button("Ping", visible=False)
    txt = gr.Textbox(visible=False)
    btn.click(fn=gpu_health, inputs=[txt], outputs=[txt])

# 3. Import MangaID FastAPI app
from backend.app.main import app as fastapi_app

# 4. Mount Gradio to /gradio first
app = gr.mount_gradio_app(fastapi_app, demo, path="/gradio")

# 5. Mount Next.js static build to "/" last
frontend_out = Path(__file__).resolve().parent / "frontend" / "out"
if frontend_out.exists():
    app.mount("/", StaticFiles(directory=str(frontend_out), html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 7860))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)
