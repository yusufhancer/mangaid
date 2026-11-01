import os
from pathlib import Path
from typing import List, Tuple
from PIL import Image, ImageDraw, ImageFont

FONT_PATH = Path(__file__).parent / "fonts" / "comic_font.ttf"

def typeset_text_bubble(
    draw: ImageDraw.ImageDraw,
    text: str,
    bbox: List[int],
    text_color: Tuple[int, int, int] = (15, 15, 15),
    stroke_color: Tuple[int, int, int] = (255, 255, 255),
    stroke_width: int = 2
):
    """
    Renders text inside a bounding box [ymin, xmin, ymax, xmax].
    Centers the text, automatically wraps lines, and shrinks font to fit.
    """
    ymin, xmin, ymax, xmax = bbox
    box_w = max(10, xmax - xmin)
    box_h = max(10, ymax - ymin)

    # Padding margin inside the bubble
    margin_x = max(4, int(box_w * 0.08))
    margin_y = max(4, int(box_h * 0.08))
    target_w = box_w - (margin_x * 2)
    target_h = box_h - (margin_y * 2)

    font_path_str = str(FONT_PATH) if FONT_PATH.exists() else None

    # Try decreasing font sizes until the wrapped text fits
    min_size = 10
    max_size = 32
    best_font = None
    best_lines = [text]

    for font_size in range(max_size, min_size - 1, -2):
        try:
            font = ImageFont.truetype(font_path_str, font_size) if font_path_str else ImageFont.load_default()
        except Exception:
            font = ImageFont.load_default()

        lines = _wrap_text(text, font, target_w, draw)
        total_text_h = _calculate_total_height(lines, font, draw)

        if total_text_h <= target_h:
            best_font = font
            best_lines = lines
            break
        best_font = font
        best_lines = lines

    if best_font is None:
        best_font = ImageFont.load_default()

    # Draw centered lines vertically and horizontally
    total_text_h = _calculate_total_height(best_lines, best_font, draw)
    start_y = ymin + margin_y + max(0, (target_h - total_text_h) // 2)

    line_spacing = int(best_font.size * 0.25) if hasattr(best_font, "size") else 3
    curr_y = start_y

    for line in best_lines:
        try:
            bbox_line = draw.textbbox((0, 0), line, font=best_font)
            line_w = bbox_line[2] - bbox_line[0]
            line_h = bbox_line[3] - bbox_line[1]
        except Exception:
            line_w = len(line) * 6
            line_h = 12

        start_x = xmin + margin_x + max(0, (target_w - line_w) // 2)

        draw.text(
            (start_x, curr_y),
            line,
            font=best_font,
            fill=text_color,
            stroke_width=stroke_width,
            stroke_fill=stroke_color
        )
        curr_y += line_h + line_spacing

def _wrap_text(text: str, font, max_width: int, draw: ImageDraw.ImageDraw) -> List[str]:
    words = text.split()
    if not words:
        return []

    lines = []
    curr_line = words[0]

    for w in words[1:]:
        test_line = f"{curr_line} {w}"
        try:
            bbox = draw.textbbox((0, 0), test_line, font=font)
            line_width = bbox[2] - bbox[0]
        except Exception:
            line_width = len(test_line) * 7

        if line_width <= max_width:
            curr_line = test_line
        else:
            lines.append(curr_line)
            curr_line = w

    lines.append(curr_line)
    return lines

def _calculate_total_height(lines: List[str], font, draw: ImageDraw.ImageDraw) -> int:
    if not lines:
        return 0
    total = 0
    line_spacing = int(font.size * 0.25) if hasattr(font, "size") else 3
    for line in lines:
        try:
            bbox = draw.textbbox((0, 0), line, font=font)
            line_h = bbox[3] - bbox[1]
        except Exception:
            line_h = 12
        total += line_h + line_spacing
    return total - line_spacing
