from PIL import Image, ImageDraw
from backend.app.render.inpaint import erase_text_regions
from backend.app.render.typeset import typeset_text_bubble
from backend.app.render.renderer import PageRenderer

def test_typeset_text_bubble():
    img = Image.new("RGB", (300, 300), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    bbox = [50, 50, 200, 200]
    # Should wrap and fit neatly without error
    typeset_text_bubble(draw, "Halo ini adalah tes terjemahan gaul banget bro!", bbox)
    assert img.size == (300, 300)

def test_erase_text_regions():
    img = Image.new("RGB", (400, 400), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    # Draw some fake black text
    draw.rectangle([100, 100, 200, 200], fill=(0, 0, 0))

    cleaned = erase_text_regions(img, [[100, 100, 200, 200]])
    assert cleaned.size == (400, 400)

def test_page_renderer():
    renderer = PageRenderer()
    orig = Image.new("RGB", (500, 500), color=(255, 255, 255))
    regions = [
        {
            "id": 1,
            "type": "dialogue",
            "source_text": "こんにちは",
            "pixel_bbox": [50, 50, 200, 250]
        }
    ]
    translations = {1: "Halo semuanya!"}

    result = renderer.render_page(orig, regions, translations)
    assert result.size == orig.size
