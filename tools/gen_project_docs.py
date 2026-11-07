"""Generate fictional project-side sample documents (development budget, funding commitment).
Every page is watermarked SAMPLE / FICTIONAL. All names, agencies and figures are invented.
Usage: python3 tools/gen_project_docs.py sample-docs   (needs reportlab)"""
import os, sys
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors

OUT = sys.argv[1] if len(sys.argv) > 1 else "sample-docs"
os.makedirs(OUT, exist_ok=True)
W, H = letter

HOMES = 12
BUDGET = [  # (line, total)
    ("Land acquisition", 1_440_000),
    ("Site work and utilities", 516_000),
    ("Vertical construction (hard costs)", 3_744_000),
    ("Architecture, engineering, design", 336_000),
    ("Permits, plan check and impact fees", 444_000),
    ("Legal, title, insurance", 120_000),
    ("Construction loan interest and fees", 180_000),
    ("Developer fee", 120_000),
    ("Contingency", 120_000),
]
TOTAL = sum(v for _, v in BUDGET)          # 7,020,000 -> 585,000 per home
COMMIT_TOTAL = 1_200_000                   # 100,000 per home


def money(x):
    return f"${x:,.0f}"


def watermark(c):
    c.saveState()
    c.setFillColor(colors.Color(0.85, 0.1, 0.1, alpha=0.10))
    c.setFont("Helvetica-Bold", 54)
    c.translate(W / 2, H / 2)
    c.rotate(35)
    c.drawCentredString(0, 30, "SAMPLE - FICTIONAL")
    c.drawCentredString(0, -40, "DEMO ONLY")
    c.restoreState()
    c.setFont("Helvetica-Oblique", 7)
    c.setFillColor(colors.grey)
    c.drawCentredString(W / 2, 18, "Fictional sample document created for the Claude Impact Lab hackathon demo. "
                        "Not a real record. All names, agencies and figures are invented.")
    c.setFillColor(colors.black)


def header(c, title, sub, color="#2d4a3e"):
    c.setFillColor(colors.HexColor(color))
    c.rect(0, H - 70, W, 70, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 18)
    c.drawString(40, H - 40, title)
    c.setFont("Helvetica", 9)
    c.drawString(40, H - 56, sub)
    c.setFillColor(colors.black)


def budget():
    c = canvas.Canvas(os.path.join(OUT, "10_development_budget.pdf"), pagesize=letter)
    header(c, "Laurel Glen Commons: Development Budget",
           "Bayside Community Land Trust (fictional) | Draft for funders | Prepared 10/15/2026")
    c.setFont("Helvetica", 10)
    y = H - 100
    for k, v in [("Project", "Laurel Glen Commons, 12 for-sale townhomes (fictional)"),
                 ("Location", "Orange County, CA (fictional site)"),
                 ("Unit mix", "12 x 3-bedroom townhomes, ~1,250 sq ft each"),
                 ("Target buyers", "Lower income households, at or below 80% of area median income"),
                 ("Resale restriction", "45-year affordability covenant")]:
        c.setFont("Helvetica-Bold", 10); c.drawString(40, y, k)
        c.setFont("Helvetica", 10); c.drawString(170, y, v); y -= 15
    y -= 15
    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(colors.HexColor("#e8efe9")); c.rect(40, y - 4, W - 80, 16, fill=1, stroke=0); c.setFillColor(colors.black)
    c.drawString(44, y, "Cost line"); c.drawRightString(W - 160, y, "Project total"); c.drawRightString(W - 44, y, "Per home")
    y -= 18
    c.setFont("Helvetica", 10)
    for k, v in BUDGET:
        c.drawString(44, y, k); c.drawRightString(W - 160, y, money(v)); c.drawRightString(W - 44, y, money(v / HOMES))
        c.setStrokeColor(colors.HexColor("#dddddd")); c.line(40, y - 5, W - 40, y - 5); y -= 17
    c.setFont("Helvetica-Bold", 11)
    c.drawString(44, y - 2, "TOTAL DEVELOPMENT COST"); c.drawRightString(W - 160, y - 2, money(TOTAL))
    c.drawRightString(W - 44, y - 2, money(TOTAL / HOMES))
    y -= 40
    c.setFont("Helvetica", 9)
    for line in ["Notes:",
                 "1. Hard cost bid from general contractor dated 09/30/2026, valid 90 days.",
                 "2. Impact fees per city fee schedule in effect 07/01/2026; subject to change at permit issuance.",
                 "3. Sales prices will be set at the affordable housing cost for lower income buyers.",
                 "4. Sources of funds shown in a separate schedule. City commitment letter dated 10/28/2026 attached."]:
        c.drawString(40, y, line); y -= 13
    watermark(c); c.showPage(); c.save()


def commitment():
    c = canvas.Canvas(os.path.join(OUT, "09_funding_commitment_letter.pdf"), pagesize=letter)
    header(c, "Westbrook County Housing Trust", "Fictional agency | 400 Civic Plaza (fictional) | Housing Finance Division",
           color="#1d3f5f")
    c.setFont("Helvetica", 10)
    y = H - 100
    for line in ["October 28, 2026", "",
                 "Bayside Community Land Trust (fictional)",
                 "Attn: Director of Real Estate Development", "",
                 "RE: CONDITIONAL COMMITMENT OF FUNDS",
                 "Project: Laurel Glen Commons, 12 for-sale townhomes (fictional)", ""]:
        if line.startswith("RE:"):
            c.setFont("Helvetica-Bold", 10)
        c.drawString(40, y, line); c.setFont("Helvetica", 10); y -= 14
    body = [
        "The Westbrook County Housing Trust Board approved a CONDITIONAL commitment of",
        f"{money(COMMIT_TOTAL)} in Homeownership Assistance Program funds for the project above,",
        f"to be provided as deferred, silent second loans to eligible buyers of up to {money(COMMIT_TOTAL // HOMES)} per home",
        f"for {HOMES} homes.",
        "",
        "This commitment is subject to the following conditions:",
        "  1. Buyers must have household income at or below 80% of area median income.",
        "  2. A 45-year resale restriction recorded on each home.",
        "  3. Evidence of all other committed sources by March 31, 2027.",
        "  4. Building permits issued by June 30, 2027.",
        "",
        "This commitment EXPIRES on June 30, 2027 if the conditions are not met. Funds are",
        "not reserved until a funding agreement is executed. Final loan amounts will be set at",
        "the gap between each buyer's affordable price and the sales price, up to the per-home cap.",
        "",
        "Sincerely,",
        "",
        "Housing Finance Manager (fictional signer)",
        "Westbrook County Housing Trust (fictional)",
    ]
    for line in body:
        c.drawString(40, y, line); y -= 14
    watermark(c); c.showPage(); c.save()


budget()
commitment()
print(f"wrote 09 and 10 to {OUT}: total {money(TOTAL)}, per home {money(TOTAL / HOMES)}, commitment {money(COMMIT_TOTAL)}")
