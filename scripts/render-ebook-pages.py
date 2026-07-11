#!/usr/bin/env python3
"""E-Book-PDF zu Flipbook-Seitenbildern rendern.

Wird nicht zur Laufzeit der App ausgefuehrt, sondern einmalig (lokal) wenn sich
das E-Book aendert. Ergebnis (public/ebook/pages/*.jpg + public/ebook.pdf) wird
eingecheckt, damit die App zur Laufzeit keine PDF-Verarbeitung braucht.

Nutzung:
    pip install pypdfium2 pillow
    python scripts/render-ebook-pages.py [pfad-zur-pdf]
"""

import shutil
import sys
from pathlib import Path

import pypdfium2 as pdfium

SCALE = 2.75  # 432x648pt Quellseite -> ~1188x1782px
JPEG_QUALITY = 85

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SOURCE = REPO_ROOT.parent / "Ebook" / "Heisshunger_E-Book_v1.1_final.pdf"
PAGES_DIR = REPO_ROOT / "public" / "ebook" / "pages"
PDF_DEST = REPO_ROOT / "public" / "ebook.pdf"


def main() -> None:
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_SOURCE
    if not source.is_file():
        sys.exit(f"PDF nicht gefunden: {source}")

    PAGES_DIR.mkdir(parents=True, exist_ok=True)
    for old in PAGES_DIR.glob("*.jpg"):
        old.unlink()

    pdf = pdfium.PdfDocument(str(source))
    page_count = len(pdf)
    digits = len(str(page_count))
    dims = None

    for index in range(page_count):
        page = pdf[index]
        bitmap = page.render(scale=SCALE)
        image = bitmap.to_pil().convert("RGB")
        dims = image.size
        out_path = PAGES_DIR / f"{index + 1:0{digits}d}.jpg"
        image.save(out_path, "JPEG", quality=JPEG_QUALITY, optimize=True)
        page.close()

    pdf.close()
    shutil.copyfile(source, PDF_DEST)

    total_kb = sum(f.stat().st_size for f in PAGES_DIR.glob("*.jpg")) / 1024
    print(f"{page_count} Seiten gerendert nach {PAGES_DIR} (je {dims[0]}x{dims[1]}px)")
    print(f"Gesamtgroesse Bilder: {total_kb:.0f} KB")
    print(f"PDF kopiert nach {PDF_DEST}")


if __name__ == "__main__":
    main()
