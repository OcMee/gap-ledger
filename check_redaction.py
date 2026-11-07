"""Check if 'redacted' PDFs still contain sensitive text under the black boxes.

Usage:  python3 check_redaction.py real-docs/
Needs:  pip install pypdf

What it does: pulls the hidden text layer out of each PDF and looks for
patterns that should not be there (SSN, long account numbers, emails, phones,
dates of birth). A black box drawn on top of text does NOT remove the text,
so a file can look clean and still leak.

What it cannot do: check scanned images (photos, scans with no text layer).
For those, zoom in on each black box and check nothing shows through.
"""
import re, sys, pathlib
from pypdf import PdfReader

PATTERNS = {
    "SSN": r"\b\d{3}-\d{2}-\d{4}\b|\bSSN\D{0,5}\d{9}\b",
    "Long number (account/routing?)": r"(?<![\d.,$])\d{8,17}(?![\d.,])",
    "Email": r"[\w.+-]+@[\w-]+\.[\w.]+",
    "Phone": r"\(?\b\d{3}\)?[ .-]\d{3}[ .-]\d{4}\b",
    "Date of birth": r"(?i)\b(dob|date of birth|birth ?date)\b.{0,20}\d",
}

def check(pdf: pathlib.Path) -> int:
    try:
        reader = PdfReader(str(pdf))
    except Exception as e:
        print(f"  ! could not open: {e}")
        return 0
    text = "\n".join((p.extract_text() or "") for p in reader.pages)
    if not text.strip():
        print("  No text layer (scanned image). Check black boxes visually.")
        return 0
    hits = 0
    for name, pat in PATTERNS.items():
        for m in re.finditer(pat, text):
            hits += 1
            shown = m.group(0)
            masked = shown[:2] + "*" * max(0, len(shown) - 4) + shown[-2:]
            print(f"  FOUND {name}: {masked}")
    return hits

def main():
    root = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "real-docs")
    pdfs = sorted(root.rglob("*.pdf")) if root.is_dir() else [root]
    if not pdfs:
        print(f"No PDFs found in {root}")
        return
    total = 0
    for pdf in pdfs:
        print(f"\n{pdf.name}")
        n = check(pdf)
        total += n
        if n == 0:
            print("  OK: no sensitive patterns in text layer")
    print("\n" + ("STOP: hidden text found. Do not send these files to any API. "
                  "Ask the nonprofit to re-redact (flatten / print to image), "
                  "or ask the team gatekeeper to decide." if total else
                  "No hidden patterns found. Still eyeball each page once."))

if __name__ == "__main__":
    main()
