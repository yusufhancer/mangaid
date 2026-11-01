import subprocess
import re
import os
import sys

def start_tunnel():
    cf_bin = r"d:\all-web\mangaid\bin\cloudflared.exe"
    if not os.path.exists(cf_bin):
        print(f"Error: {cf_bin} tidak ditemukan!")
        sys.exit(1)

    print("Menghubungkan ke Cloudflare Edge Network...")
    proc = subprocess.Popen(
        [cf_bin, "tunnel", "--url", "http://localhost:3000"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="replace",
        bufsize=1
    )

    tunnel_url = None
    url_pattern = re.compile(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com")

    for line in proc.stdout:
        match = url_pattern.search(line)
        if match:
            tunnel_url = match.group(0)
            url_file = r"d:\all-web\mangaid\CLOUDFLARE_URL.txt"
            with open(url_file, "w", encoding="utf-8") as f:
                f.write(tunnel_url)

            print("\n" + "="*70)
            print("  [ONLINE] CLOUDFLARE TUNNEL AKTIF (HTTPS RESMI)")
            print(f"  LINK HP / PUBLIK: {tunnel_url}")
            print("="*70 + "\n")
            break

    # Tetap baca stream agar proses tidak hung
    for line in proc.stdout:
        pass

    proc.wait()

if __name__ == "__main__":
    start_tunnel()
