import os
from PIL import Image

SOURCE_PATH = r"C:\Users\ADVAN\.gemini\antigravity\brain\4ca792da-23ea-4fce-93bf-2e11ac543638\mangaid_logo_monogram_1791461495257.jpg"

def main():
    if not os.path.exists(SOURCE_PATH):
        raise FileNotFoundError(f"Source logo not found at {SOURCE_PATH}")

    src_img = Image.open(SOURCE_PATH).convert("RGBA")
    print(f"Loaded master logo: {src_img.size}")

    os.makedirs("frontend/public/icons", exist_ok=True)

    # 1. Master logo for UI
    logo_master = src_img.resize((512, 512), Image.Resampling.LANCZOS)
    logo_master.save("frontend/public/logo.png", "PNG")
    print("Saved frontend/public/logo.png")

    # 2. 512x512 standard PWA icon
    logo_master.save("frontend/public/icons/icon-512x512.png", "PNG")
    print("Saved icon-512x512.png")

    # 3. 512x512 Maskable PWA icon (with slight safe margin padding)
    # Background color matches the outer background of the image
    bg_color = src_img.getpixel((10, 10)) # Sample corner color
    maskable_canvas = Image.new("RGBA", (512, 512), bg_color)
    # Scale down slightly to 85% to ensure 100% safe area compliance on circular masks
    scaled_size = int(512 * 0.88)
    scaled_img = src_img.resize((scaled_size, scaled_size), Image.Resampling.LANCZOS)
    offset = (512 - scaled_size) // 2
    maskable_canvas.paste(scaled_img, (offset, offset))
    maskable_canvas.save("frontend/public/icons/icon-maskable-512x512.png", "PNG")
    print("Saved icon-maskable-512x512.png")

    # 4. 192x192 PWA icon
    i192 = src_img.resize((192, 192), Image.Resampling.LANCZOS)
    i192.save("frontend/public/icons/icon-192x192.png", "PNG")
    print("Saved icon-192x192.png")

    # 5. 180x180 Apple Touch Icon
    i180 = src_img.resize((180, 180), Image.Resampling.LANCZOS)
    i180.save("frontend/public/icons/apple-touch-icon.png", "PNG")
    print("Saved apple-touch-icon.png")

    # 6. 32x32 Favicon PNG & ICO
    i32 = src_img.resize((32, 32), Image.Resampling.LANCZOS)
    i32.save("frontend/public/icons/icon-32x32.png", "PNG")
    
    # Save favicon.ico in both public and app directories
    i48 = src_img.resize((48, 48), Image.Resampling.LANCZOS)
    i48.save("frontend/public/favicon.ico", "ICO")
    i48.save("frontend/app/favicon.ico", "ICO")
    print("Saved favicon.ico in public/ and app/")

    print("All Option 1 icons generated successfully!")

if __name__ == "__main__":
    main()
