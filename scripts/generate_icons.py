import os
from PIL import Image, ImageDraw

def create_mangaid_master(size=1024, is_maskable=False):
    # Base canvas
    img = Image.new("RGBA", (size, size), (13, 13, 14, 255)) # #0D0D0E
    draw = ImageDraw.Draw(img)

    # Safe padding for maskable (safe area is inner 80%)
    pad_ratio = 0.16 if is_maskable else 0.08
    pad = int(size * pad_ratio)
    box = (pad, pad, size - pad, size - pad)

    # Background card with subtle border
    corner_radius = int(size * 0.18) if not is_maskable else int(size * 0.10)
    card_bg = (21, 21, 22, 255) # #151516
    draw.rounded_rectangle(box, radius=corner_radius, fill=card_bg, outline=(42, 42, 44, 255), width=max(4, int(size * 0.015)))

    # Accent colors
    accent_color = (232, 69, 44, 255) # #E8452C
    accent_glow = (255, 90, 64, 255)  # #FF5A40

    cx, cy = size // 2, size // 2 - int(size * 0.04)
    book_w = int(size * 0.54)
    book_h = int(size * 0.44)
    top_y = cy - book_h // 2
    bot_y = cy + book_h // 2

    # Left page & Right page
    left_x = cx - book_w // 2
    right_x = cx + book_w // 2

    # Stylized open manga panels
    left_poly = [
        (cx - int(size * 0.015), top_y + int(size * 0.06)),
        (left_x, top_y),
        (left_x, bot_y - int(size * 0.06)),
        (cx - int(size * 0.015), bot_y),
    ]
    right_poly = [
        (cx + int(size * 0.015), top_y + int(size * 0.06)),
        (right_x, top_y),
        (right_x, bot_y - int(size * 0.06)),
        (cx + int(size * 0.015), bot_y),
    ]

    draw.polygon(left_poly, fill=(28, 28, 30, 255), outline=(50, 50, 55, 255))
    draw.polygon(right_poly, fill=(28, 28, 30, 255), outline=(50, 50, 55, 255))

    # Bold dynamic "M" shape
    m_w = int(size * 0.46)
    m_h = int(size * 0.38)
    m_top = cy - m_h // 2
    m_bot = m_top + m_h
    m_left = cx - m_w // 2
    m_right = cx + m_w // 2
    bar_w = int(size * 0.075)

    # Left & right pillars
    draw.rounded_rectangle([m_left, m_top, m_left + bar_w, m_bot], radius=bar_w//3, fill=accent_color)
    draw.rounded_rectangle([m_right - bar_w, m_top, m_right, m_bot], radius=bar_w//3, fill=accent_color)

    # Center peak & chevron
    poly_center = [
        (m_left + bar_w, m_top + int(size * 0.01)),
        (cx, m_bot - int(size * 0.06)),
        (m_right - bar_w, m_top + int(size * 0.01)),
        (cx, m_bot),
    ]
    draw.polygon(poly_center, fill=accent_glow)

    # ID Badge pill at the bottom
    badge_w = int(size * 0.26)
    badge_h = int(size * 0.11)
    badge_x = cx - badge_w // 2
    badge_y = cy + m_h // 2 + int(size * 0.06)

    draw.rounded_rectangle(
        [badge_x, badge_y, badge_x + badge_w, badge_y + badge_h],
        radius=badge_h // 3,
        fill=accent_color
    )

    # Letter 'I'
    i_w = int(badge_w * 0.12)
    i_h = int(badge_h * 0.54)
    i_x = badge_x + int(badge_w * 0.28)
    i_y = badge_y + (badge_h - i_h) // 2
    draw.rounded_rectangle([i_x, i_y, i_x + i_w, i_y + i_h], radius=2, fill=(255, 255, 255, 255))

    # Letter 'D'
    d_x = badge_x + int(badge_w * 0.50)
    d_w = int(badge_w * 0.26)
    d_thick = int(badge_w * 0.08)
    draw.rounded_rectangle([d_x, i_y, d_x + d_w, i_y + i_h], radius=int(d_w * 0.45), fill=(255, 255, 255, 255))
    draw.rounded_rectangle([d_x + d_thick, i_y + d_thick, d_x + d_w - d_thick, i_y + i_h - d_thick], radius=int(d_w * 0.3), fill=accent_color)

    return img

def main():
    os.makedirs("frontend/public/icons", exist_ok=True)

    # Generate master icons
    master = create_mangaid_master(1024, is_maskable=False)
    master_maskable = create_mangaid_master(1024, is_maskable=True)

    # 512x512
    i512 = master.resize((512, 512), Image.Resampling.LANCZOS)
    i512.save("frontend/public/icons/icon-512x512.png", "PNG")

    # 512x512 maskable
    i512_mask = master_maskable.resize((512, 512), Image.Resampling.LANCZOS)
    i512_mask.save("frontend/public/icons/icon-maskable-512x512.png", "PNG")

    # 192x192
    i192 = master.resize((192, 192), Image.Resampling.LANCZOS)
    i192.save("frontend/public/icons/icon-192x192.png", "PNG")

    # 180x180 (Apple touch icon)
    i180 = master.resize((180, 180), Image.Resampling.LANCZOS)
    i180.save("frontend/public/icons/apple-touch-icon.png", "PNG")

    # 32x32 Favicon & PNG
    i32 = master.resize((32, 32), Image.Resampling.LANCZOS)
    i32.save("frontend/public/icons/icon-32x32.png", "PNG")
    i32.save("frontend/public/favicon.ico", "ICO")

    print("All PWA icons generated successfully in frontend/public/icons/ and frontend/public/favicon.ico!")

if __name__ == "__main__":
    main()
