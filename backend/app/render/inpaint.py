import cv2
import numpy as np
from PIL import Image
from typing import List, Tuple

def erase_text_regions(image: Image.Image, pixel_bboxes: List[List[int]]) -> Image.Image:
    """
    Erases text inside bounding boxes.
    Uses solid fill if the bubble is nearly uniform/white,
    and OpenCV inpainting if the region has complex background or artwork.
    """
    img_np = np.array(image.convert("RGB"))
    h, w, _ = img_np.shape

    for bbox in pixel_bboxes:
        ymin, xmin, ymax, xmax = bbox
        # Add slight padding
        pad = 2
        ymin = max(0, ymin - pad)
        xmin = max(0, xmin - pad)
        ymax = min(h, ymax + pad)
        xmax = min(w, xmax + pad)

        if ymax <= ymin or xmax <= xmin:
            continue

        region = img_np[ymin:ymax, xmin:xmax]
        # Check if region is predominantly white/light (standard comic speech bubble)
        mean_val = np.mean(region)
        std_val = np.std(region)

        if mean_val > 220 and std_val < 45:
            # Flat white/light bubble: sample the lightest border pixel and fill
            fill_color = np.median(region, axis=(0, 1)).astype(np.uint8)
            img_np[ymin:ymax, xmin:xmax] = fill_color
        else:
            # Complex artwork or halftone: create mask of dark pixels (the text) and inpaint
            gray_region = cv2.cvtColor(region, cv2.COLOR_RGB2GRAY)
            # Text is usually dark
            _, mask = cv2.threshold(gray_region, 160, 255, cv2.THRESH_BINARY_INV)
            # Dilate mask slightly
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
            mask = cv2.dilate(mask, kernel, iterations=1)

            inpainted_region = cv2.inpaint(region, mask, inpaintRadius=3, flags=cv2.INPAINT_TELEA)
            img_np[ymin:ymax, xmin:xmax] = inpainted_region

    return Image.fromarray(img_np)
