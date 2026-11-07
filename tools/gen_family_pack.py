"""Generate the fictional Families demo pack: three households, 3 to 4 documents each, plus FAMILIES.md.

Every page is watermarked SAMPLE / FICTIONAL. All names, employers, banks, agencies, addresses and numbers are invented.
Numbers in the answer key are computed here with the same formulas the app uses, so they always match the documents.
Usage: python3 tools/gen_family_pack.py   (needs reportlab, Pillow and pdftoppm)
"""
import os, pathlib, subprocess, datetime as dt
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from PIL import Image, ImageFilter, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "sample-docs" / "families"
W, H = letter
YTD_THRU = dt.date(2026, 10, 30)
JAN1 = dt.date(2026, 1, 1)
CHECKS_BIWEEKLY = 22      # biweekly paydays from Fri 2026-01-02 through Fri 2026-10-30
CHECKS_SEMIMONTHLY = 20   # 15th and last business day, Jan through Oct 2026

# State Income Limits 2026 (revised), Orange County, same table the app uses.
LIMITS = {"Extremely low": [39100, 44700, 50300, 55850], "Very low (50%)": [65150, 74450, 83750, 93050],
          "Low (80%)": [104200, 119100, 134000, 148850], "Moderate (120%)": [116400, 133050, 149650, 166300]}


def money(x, cents=True):
    return f"${x:,.2f}" if cents else f"${x:,.0f}"


def monthly_from_ytd(ytd, start, thru):
    days = (thru - start).days + 1
    return ytd / days * 365 / 12, days


def tier(annual, size):
    for name in ["Extremely low", "Very low (50%)", "Low (80%)", "Moderate (120%)"]:
        if annual <= LIMITS[name][size - 1]:
            return name, LIMITS[name][size - 1]
    return "Above Moderate", None


def watermark(c):
    c.saveState()
    c.setFillColor(colors.Color(0.85, 0.1, 0.1, alpha=0.10))
    c.setFont("Helvetica-Bold", 54)
    c.translate(W / 2, H / 2); c.rotate(35)
    c.drawCentredString(0, 30, "SAMPLE - FICTIONAL"); c.drawCentredString(0, -40, "DEMO ONLY")
    c.restoreState()
    c.setFont("Helvetica-Oblique", 7); c.setFillColor(colors.grey)
    c.drawCentredString(W / 2, 18, "Fictional sample document created for the Claude Impact Lab hackathon demo. "
                        "Not a real record. All names, companies and figures are invented.")
    c.setFillColor(colors.black)


def header(c, title, sub, color="#1f3a5f"):
    c.setFillColor(colors.HexColor(color)); c.rect(0, H - 70, W, 70, fill=1, stroke=0)
    c.setFillColor(colors.white); c.setFont("Helvetica-Bold", 18); c.drawString(40, H - 40, title)
    c.setFont("Helvetica", 9); c.drawString(40, H - 56, sub); c.setFillColor(colors.black)


def pairs(c, x, y, rows, gap=14, lw=120):
    for k, v in rows:
        c.setFont("Helvetica-Bold", 9.5); c.drawString(x, y, k)
        c.setFont("Helvetica", 9.5); c.drawString(x + lw, y, v); y -= gap
    return y


def table(c, x, y, cols, rows, widths, row_h=15):
    c.setFont("Helvetica-Bold", 9); c.setFillColor(colors.HexColor("#e8edf3"))
    c.rect(x, y - row_h + 4, sum(widths), row_h, fill=1, stroke=0); c.setFillColor(colors.black)
    cx = x
    for col, w in zip(cols, widths):
        c.drawString(cx + 3, y - 7, col); cx += w
    y -= row_h; c.setFont("Helvetica", 9)
    for row in rows:
        cx = x
        for i, (cell, w) in enumerate(zip(row, widths)):
            cell = str(cell)
            if i > 0 and cell.startswith(("$", "-$")):
                c.drawRightString(cx + w - 4, y - 7, cell)
            else:
                c.drawString(cx + 3, y - 7, cell)
            cx += w
        c.setStrokeColor(colors.HexColor("#dddddd")); c.line(x, y - 11, x + sum(widths), y - 11); y -= row_h
    c.setStrokeColor(colors.black)
    return y


def paystub(path, employer, sub, name, emp_id, title, address, period, pay_date, freq, gross, ytd, hours=None, rate=None, hire=None, note=None):
    c = canvas.Canvas(str(path), pagesize=letter)
    header(c, employer, sub)
    c.setFont("Helvetica-Bold", 13); c.drawString(40, H - 100, "EARNINGS STATEMENT")
    y = pairs(c, 40, H - 125, [("Employee", name), ("Employee ID", emp_id), ("Position", title), ("Address", address)])
    pairs(c, 395, H - 125, [("Pay period", period), ("Pay date", pay_date), ("Pay frequency", freq)] + ([("Hire date", hire)] if hire else []), lw=78)
    fed, ss, med, st = round(gross * .068, 2), round(gross * .062, 2), round(gross * .0145, 2), round(gross * .021, 2)
    sdi = round(gross * .012, 2); net = round(gross - fed - ss - med - st - sdi, 2)
    f = ytd / gross
    y = table(c, 40, y - 20, ["Earnings", "Rate", "Hours", "Current", "Year to date"],
              [["Regular", money(rate) if rate else "Salary", f"{hours:.2f}" if hours else "-", money(gross), money(ytd)],
               ["GROSS PAY", "", "", money(gross), money(ytd)]], [150, 80, 70, 110, 120])
    y = table(c, 40, y - 15, ["Deductions", "Current", "Year to date"],
              [["Federal income tax", money(fed), money(fed * f)], ["Social Security", money(ss), money(ss * f)],
               ["Medicare", money(med), money(med * f)], ["CA state income tax", money(st), money(st * f)],
               ["CA SDI", money(sdi), money(sdi * f)]], [230, 110, 120])
    c.setFont("Helvetica-Bold", 12); c.drawString(40, y - 22, f"NET PAY: {money(net)}")
    if note:
        c.setFont("Helvetica-Oblique", 9); c.drawString(40, y - 42, note)
    watermark(c); c.save()
    return net


def phone_photo(pdf, jpg):
    """Render page 1 and make it look like a phone photo: slight tilt, shadow, table background."""
    tmp = jpg.with_suffix("")
    subprocess.run(["pdftoppm", "-r", "110", "-png", "-singlefile", str(pdf), str(tmp)], check=True)
    page = Image.open(str(tmp) + ".png").convert("RGB")
    os.remove(str(tmp) + ".png")
    bg = Image.new("RGB", (page.width + 220, page.height + 220), (120, 96, 72))
    shadow = Image.new("L", bg.size, 0)
    ImageDraw.Draw(shadow).rectangle([118, 128, 118 + page.width, 128 + page.height], fill=150)
    bg.paste((40, 30, 20), mask=shadow.filter(ImageFilter.GaussianBlur(18)))
    bg.paste(page, (100, 100))
    photo = bg.rotate(3.5, resample=Image.BICUBIC, expand=False, fillcolor=(120, 96, 72))
    shade = Image.linear_gradient("L").resize(photo.size).point(lambda v: int(v * 0.25))
    photo = Image.composite(Image.new("RGB", photo.size, (0, 0, 0)), photo, shade)
    photo.save(jpg, "JPEG", quality=78)


def bank(path, bankname, members, address, rows, opening, savings, issue_note=None):
    c = canvas.Canvas(str(path), pagesize=letter)
    header(c, bankname, "Member statement | Everyday Checking | Account ending 0000 (placeholder)", color="#2d4a3e")
    y = pairs(c, 40, H - 100, [("Members", members), ("Address", address), ("Statement period", "10/01/2026 - 10/31/2026")])
    bal, out = opening, [["10/01", "Opening balance", "", money(opening)]]
    for d, desc, amt in rows:
        bal = round(bal + amt, 2)
        out.append([d, desc, ("-" if amt < 0 else "") + money(abs(amt)), ("-" if bal < 0 else "") + money(abs(bal))])
    y = table(c, 40, y - 15, ["Date", "Description", "Amount", "Balance"], out, [50, 300, 90, 90], row_h=14)
    y = pairs(c, 40, y - 20, [("Closing checking balance", money(bal)), ("Savings balance (10/31)", money(savings))], lw=170)
    if issue_note:
        c.setFont("Helvetica-Oblique", 8.5); c.drawString(40, y - 10, issue_note)
    watermark(c); c.save()
    return bal


def letter_doc(path, org, sub, lines, color="#4a3b6b"):
    c = canvas.Canvas(str(path), pagesize=letter)
    header(c, org, sub, color=color)
    y = H - 100
    for ln in lines:
        if ln.startswith("**"):
            c.setFont("Helvetica-Bold", 10.5); ln = ln.strip("*")
        else:
            c.setFont("Helvetica", 10.5)
        c.drawString(40, y, ln); y -= 15
    watermark(c); c.save()


def w2(path, year, employer, emp_addr, name, address, gross, pretax=0.0):
    """Simplified W-2 layout (not an IRS form). Box 1 = gross minus pre-tax deductions such as a 401(k)."""
    box1 = round(gross - pretax, 2)
    c = canvas.Canvas(str(path), pagesize=letter)
    header(c, f"Form W-2 Wage and Tax Statement {year}", "Sample layout for the demo. Not an official IRS form. Copy B, to be filed with employee's federal tax return.", color="#3a3a3a")
    boxes = [
        ("a  Employee's SSN", "XXX-XX-0000 (masked)"), ("b  Employer ID number (EIN)", "XX-XXXXXXX (fictional)"),
        ("c  Employer", employer), ("   Employer address", emp_addr), ("e  Employee", name), ("f  Employee address", address),
        ("1  Wages, tips, other compensation", money(box1)), ("2  Federal income tax withheld", money(gross * .07)),
        ("3  Social Security wages", money(gross)), ("4  Social Security tax withheld", money(gross * .062)),
        ("5  Medicare wages and tips", money(gross)), ("6  Medicare tax withheld", money(gross * .0145)),
        ("12a Code D (401k elective deferral)", money(pretax) if pretax else "-"),
        ("16 State wages (CA)", money(box1)), ("17 State income tax", money(gross * .021)),
    ]
    y = H - 100
    for i, (k, v) in enumerate(boxes):
        x = 40 if i % 2 == 0 else 315
        if i % 2 == 0 and i:
            y -= 40
        c.setStrokeColor(colors.HexColor("#999999")); c.rect(x, y - 26, 260, 34, stroke=1, fill=0)
        c.setFont("Helvetica", 7.5); c.drawString(x + 4, y - 1, k)
        c.setFont("Helvetica-Bold", 10.5); c.drawString(x + 4, y - 17, v)
    c.setFont("Helvetica-Oblique", 8.5); c.drawString(40, y - 60, f"Tax year {year}. Wages above are for the full calendar year.")
    watermark(c); c.save()
    return box1


def nec1099(path, year, payer, name, amount):
    c = canvas.Canvas(str(path), pagesize=letter)
    header(c, f"Form 1099-NEC Nonemployee Compensation {year}", "Sample layout for the demo. Not an official IRS form. Copy B, for recipient.", color="#7a3e00")
    y = pairs(c, 40, H - 100, [("Payer", payer), ("Payer TIN", "XX-XXXXXXX (fictional)"), ("Recipient", name),
                                ("Recipient TIN", "XXX-XX-0000 (masked)"), ("Tax year", str(year))], lw=130)
    c.setStrokeColor(colors.HexColor("#999999")); c.rect(40, y - 40, 300, 40, stroke=1, fill=0)
    c.setFont("Helvetica", 8); c.drawString(44, y - 12, "1  Nonemployee compensation")
    c.setFont("Helvetica-Bold", 13); c.drawString(44, y - 32, money(amount))
    c.setFont("Helvetica-Oblique", 9); c.drawString(40, y - 62, "No federal income tax withheld. Recipient may owe self-employment tax.")
    watermark(c); c.save()


def loan_statement(path, lender, sub, rows, notes, color="#2e4a6b"):
    c = canvas.Canvas(str(path), pagesize=letter)
    header(c, lender, sub, color=color)
    c.setFont("Helvetica-Bold", 13); c.drawString(40, H - 100, "LOAN STATEMENT")
    y = pairs(c, 40, H - 122, rows, lw=190)
    c.setFont("Helvetica", 9.5)
    for n in notes:
        y -= 4; c.drawString(40, y - 10, n); y -= 14
    watermark(c); c.save()


def main():
    key = ["# Families demo pack: answer key", "",
           "All documents are fictional and watermarked. Values below are computed by `tools/gen_family_pack.py` with the same",
           "formulas the app uses (year-to-date pay / days x 365 / 12). Use this to check what the document reader extracts.", ""]

    # ---------------- Nguyen: 3 people, 2 bedrooms, one paycheck + variable gig income ----------------
    d = OUT / "nguyen"; d.mkdir(parents=True, exist_ok=True)
    rate, hrs = 22.50, 80; gross = rate * hrs; ytd = gross * CHECKS_BIWEEKLY
    net_n = paystub(d / "N1_paystub_minh.pdf", "Harbor Pho Kitchen LLC (fictional)", "1210 Bayview Ave, Westminster, CA 92683 (fictional)",
            "Minh Nguyen", "HP-2291", "Line Cook", "88 Lotus Way, Apt 3, Westminster, CA 92683", "10/17/2026 - 10/30/2026",
            "10/30/2026", "Biweekly", gross, ytd, hrs, rate, hire="04/11/2022")
    phone_photo(d / "N1_paystub_minh.pdf", d / "N1b_paystub_minh_phone_photo.jpg")
    os.remove(d / "N1_paystub_minh.pdf")
    gig = [820, 640, 910, 1150, 700, 480, 1020, 1300, 560, 870]
    gig_ytd = sum(gig)
    c = canvas.Canvas(str(d / "N2_gig_income_1099_summary.pdf"), pagesize=letter)
    header(c, "QuickRoute Delivery (fictional)", "Driver earnings summary | Form 1099-NEC preview | Not a tax form", color="#7a3e00")
    y = pairs(c, 40, H - 100, [("Driver", "Thao Nguyen"), ("Driver ID", "QR-55120"), ("Period", "01/01/2026 - 10/31/2026"),
                                ("Payment type", "Independent contractor, paid weekly, earnings vary")])
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"]
    y = table(c, 40, y - 15, ["Month 2026", "Gross earnings"], [[m, money(v)] for m, v in zip(months, gig)] + [["YEAR TO DATE", money(gig_ytd)]], [200, 140])
    c.setFont("Helvetica-Oblique", 9); c.drawString(40, y - 20, "Earnings are before expenses (gas, phone). No taxes withheld. Year-to-date through 10/31/2026.")
    watermark(c); c.save()
    bank(d / "N3_bank_statement_oct2026.pdf", "Golden Harbor Credit Union (fictional)", "Minh Nguyen & Thao Nguyen",
         "88 Lotus Way, Apt 3, Westminster, CA 92683",
         [("10/02", "RENT - LOTUS COURT APTS (fictional)", -1980.00), ("10/03", "QUICKROUTE DRIVER PAY", 142.60), ("10/05", "AUTO LOAN PMT", -298.00),
          ("10/10", "QUICKROUTE DRIVER PAY", 231.15), ("10/14", "LATE FEE - PHONE BILL", -15.00), ("10/16", "DIRECT DEP HARBOR PHO KITCHEN", net_n),
          ("10/17", "QUICKROUTE DRIVER PAY", 188.40), ("10/20", "MONEY TRANSFER TO FAMILY ABROAD", -300.00), ("10/24", "QUICKROUTE DRIVER PAY", 307.85),
          ("10/30", "DIRECT DEP HARBOR PHO KITCHEN", net_n)], 905.33, 4250.00,
         issue_note="Gig deposits vary week to week. Monthly money transfer to family abroad.")
    m1, days1 = monthly_from_ytd(ytd, JAN1, YTD_THRU)
    m2, days2 = monthly_from_ytd(gig_ytd, JAN1, dt.date(2026, 10, 31))
    annual = (m1 + m2) * 12; t, lim = tier(annual, 3)
    key += ["## The Nguyens (3 people, set Bedrooms to 2)", "",
            "Documents: `N1b_paystub_minh_phone_photo.jpg`, `N2_gig_income_1099_summary.pdf`, `N3_bank_statement_oct2026.pdf`", "",
            f"- Minh, line cook: ${rate:.2f}/hr x {hrs} hrs biweekly = {money(gross)} per check; YTD {money(ytd)} through 10/30/2026",
            f"  - Monthly: {money(ytd, False)} / {days1} days x 365 / 12 = **{money(m1, False)}**",
            f"- Thao, delivery gig: YTD {money(gig_ytd, False)} through 10/31/2026, months range {money(min(gig), False)} to {money(max(gig), False)}",
            f"  - Monthly: {money(gig_ytd, False)} / {days2} days x 365 / 12 = **{money(m2, False)}**",
            f"- Household: **{money(m1 + m2, False)}/month = {money(annual, False)}/year** for 3 people -> under **{t}** ({money(lim, False)})", "",
            f"Net pay deposits match the stub: {money(net_n)} on 10/16 and 10/30.",
            "Should flag: gig income is variable and before expenses; a lender will likely average it over 2 years. Late fee on 10/14.",
            "Demo tip: switch the language to Tieng Viet before reading, so summaries come back in Vietnamese.", ""]

    # Two-year history and car loan
    n24, n25 = 21.00 * 2080, 21.75 * 2080
    w2(d / "N4_w2_minh_2024.pdf", 2024, "Harbor Pho Kitchen LLC (fictional)", "1210 Bayview Ave, Westminster, CA 92683", "Minh Nguyen", "88 Lotus Way, Apt 3, Westminster, CA 92683", n24)
    w2(d / "N5_w2_minh_2025.pdf", 2025, "Harbor Pho Kitchen LLC (fictional)", "1210 Bayview Ave, Westminster, CA 92683", "Minh Nguyen", "88 Lotus Way, Apt 3, Westminster, CA 92683", n25)
    g24, g25 = 7950.00, 9880.00
    nec1099(d / "N6_1099nec_thao_2024.pdf", 2024, "QuickRoute Delivery (fictional)", "Thao Nguyen", g24)
    nec1099(d / "N7_1099nec_thao_2025.pdf", 2025, "QuickRoute Delivery (fictional)", "Thao Nguyen", g25)
    loan_statement(d / "N8_auto_loan_statement.pdf", "Sunline Auto Finance (fictional)", "Statement date 10/20/2026 | Account ending 0000 (placeholder)",
                   [("Borrower", "Minh Nguyen"), ("Loan type", "Auto loan, 2021 compact SUV"), ("Original amount", money(16800)),
                    ("Current balance", money(8742.18)), ("Monthly payment", money(298)), ("Interest rate", "6.9% fixed"),
                    ("Payments remaining", "31"), ("Payment status", "Current, no late payments in 24 months")],
                   ["Autopay from checking on the 5th of each month."])
    key += [f"Two-year history: Minh W-2 2024 {money(n24, False)}, 2025 {money(n25, False)}, 2026 pace {money(m1 * 12, False)} (rising).",
            f"Thao 1099-NEC 2024 {money(g24, False)}, 2025 {money(g25, False)}; 2-year average {money((g24 + g25) / 2, False)}/yr. 2026 pace {money(m2 * 12, False)}.",
            "Car loan: $298/month, balance $8,742.18, 31 payments left; matches the 10/05 bank payment.",
            "Should flag: lenders usually average gig income over 2 years ({}/yr) instead of using this year's pace.".format(money((g24 + g25) / 2, False)), ""]

    # ---------------- Delgado: 2 people, 1 bedroom, hourly job + child support ----------------
    d = OUT / "delgado"; d.mkdir(parents=True, exist_ok=True)
    rate, hrs = 20.00, 72; gross = rate * hrs; ytd = gross * CHECKS_BIWEEKLY
    net_d = paystub(d / "D1_paystub_rosa.pdf", "Valley Family Clinic (fictional)", "455 Orchard Blvd, Santa Ana, CA 92701 (fictional)",
            "Rosa Delgado", "VFC-1048", "Patient Services Representative", "17 Citrus Ln, Unit B, Santa Ana, CA 92703",
            "10/17/2026 - 10/30/2026", "10/30/2026", "Biweekly", gross, ytd, hrs, rate, hire="08/01/2023")
    support = 450.00
    letter_doc(d / "D2_child_support_order_summary.pdf", "Orange Coast Family Court Services (fictional)",
               "Summary of support order | Case number withheld | Not a court document",
               ["October 5, 2026", "", "**SUMMARY OF CHILD SUPPORT ORDER**", "", "Recipient: Rosa Delgado", "Child: 1 minor child",
                f"Monthly child support ordered: {money(support)}", "Payment schedule: monthly, by the 1st of each month",
                "Order start date: 02/01/2025", "Order review date: 02/01/2028", "",
                "Payments are made through the state disbursement unit. Payments received in 2026: 9 of 10 on time.",
                "One payment (July 2026) arrived 18 days late.", "",
                "This summary is for the recipient's records. Lenders may ask for 6 to 12 months of payment history."], color="#5a2e4a")
    bank(d / "D3_bank_statement_oct2026.pdf", "Mesa Verde Federal Credit Union (fictional)", "Rosa Delgado",
         "17 Citrus Ln, Unit B, Santa Ana, CA 92703",
         [("10/01", "CHILD SUPPORT - STATE DISBURSEMENT", 450.00), ("10/02", "RENT - CITRUS LANE HOMES (fictional)", -1650.00),
          ("10/03", "DIRECT DEP VALLEY FAMILY CLINIC", net_d), ("10/04", "QUICKCASH PAYDAY LOAN DEPOSIT (fictional)", 400.00),
          ("10/08", "CHILD CARE - SUNNY STEPS (fictional)", -380.00), ("10/12", "PHONE BILL", -65.00),
          ("10/17", "DIRECT DEP VALLEY FAMILY CLINIC", net_d), ("10/18", "QUICKCASH PAYDAY LOAN REPAYMENT (fictional)", -460.00),
          ("10/24", "GROCERY - FICTIONAL MARKET", -212.40), ("10/30", "DIRECT DEP VALLEY FAMILY CLINIC", net_d)], 214.60, 2150.00,
         issue_note="Payday loan: $400 borrowed 10/04, $460 repaid 10/18.")
    m1, days1 = monthly_from_ytd(ytd, JAN1, YTD_THRU)
    annual = (m1 + support) * 12; t, lim = tier(annual, 2)
    key += ["## Rosa Delgado (2 people, set Bedrooms to 1)", "",
            "Documents: `D1_paystub_rosa.pdf`, `D2_child_support_order_summary.pdf`, `D3_bank_statement_oct2026.pdf`", "",
            f"- Rosa, patient services: ${rate:.2f}/hr x {hrs} hrs biweekly = {money(gross)} per check; YTD {money(ytd)} through 10/30/2026",
            f"  - Monthly: {money(ytd, False)} / {days1} days x 365 / 12 = **{money(m1, False)}**",
            f"- Child support: **{money(support, False)}/month** (order through at least 02/01/2028)",
            f"- Household: **{money(m1 + support, False)}/month = {money(annual, False)}/year** for 2 people -> under **{t}** ({money(lim, False)})",
            "- Savings $2,150: far below cash to close on most homes, so deferred down-payment programs matter most.", "",
            f"Net pay deposits match the stub: {money(net_d)} on 10/03, 10/17 and 10/30.",
            "Should flag: payday loan ($400 borrowed, $460 repaid, a 15% fee in 2 weeks); one late support payment in July.", ""]

    # Two-year history and co-signed home improvement loan
    r24, r25 = 18.75 * 72 * 26, 19.50 * 72 * 26
    w2(d / "D4_w2_rosa_2024.pdf", 2024, "Valley Family Clinic (fictional)", "455 Orchard Blvd, Santa Ana, CA 92701", "Rosa Delgado", "17 Citrus Ln, Unit B, Santa Ana, CA 92703", r24)
    w2(d / "D5_w2_rosa_2025.pdf", 2025, "Valley Family Clinic (fictional)", "455 Orchard Blvd, Santa Ana, CA 92701", "Rosa Delgado", "17 Citrus Ln, Unit B, Santa Ana, CA 92703", r25)
    loan_statement(d / "D6_home_improvement_loan_cosigned.pdf", "Brightway Home Improvement Lending (fictional)", "Statement date 10/15/2026 | Account ending 0000 (placeholder)",
                   [("Primary borrower", "Elena Delgado (mother)"), ("Co-signer", "Rosa Delgado"), ("Loan type", "Home improvement loan (roof repair)"),
                    ("Property", "Mother's home, Anaheim, CA (fictional)"), ("Original amount", money(9500)), ("Current balance", money(6214.55)),
                    ("Monthly payment", money(145)), ("Interest rate", "9.4% fixed"), ("Payments remaining", "50"), ("Payment status", "Current")],
                   ["Payments are made from the primary borrower's account.", "The co-signer is equally responsible if the primary borrower does not pay."], color="#5a4a2e")
    key += [f"Two-year history: Rosa W-2 2024 {money(r24, False)}, 2025 {money(r25, False)}, 2026 pace {money(m1 * 12, False)} (steady, small raises).",
            "Co-signed home improvement loan for her mother's house: $145/month, balance $6,214.55. Not on Rosa's bank statement (mother pays).",
            "Should flag: co-signed debt usually counts in Rosa's debt-to-income unless she shows 12 months of the mother paying it.", ""]

    # ---------------- Okafor sisters: 4 people, co-buyers, just over Lower income ----------------
    d = OUT / "okafor"; d.mkdir(parents=True, exist_ok=True)
    rate, hrs = 48.00, 80; gross_a = rate * hrs; ytd_a = gross_a * CHECKS_BIWEEKLY
    net_a = paystub(d / "O1_paystub_adaeze.pdf", "Coastline Community Hospital (fictional)", "2200 Shoreline Dr, Huntington Beach, CA 92648 (fictional)",
            "Adaeze Okafor", "CCH-77310", "Registered Nurse", "602 Marigold St, Garden Grove, CA 92840", "10/17/2026 - 10/30/2026",
            "10/30/2026", "Biweekly", gross_a, ytd_a, hrs, rate, hire="06/15/2019")
    gross_c = 2350.00; ytd_c = gross_c * CHECKS_SEMIMONTHLY
    net_c = paystub(d / "O2_paystub_chioma.pdf", "Seaview Unified School District (fictional)", "100 District Way, Fountain Valley, CA 92708 (fictional)",
            "Chioma Okafor", "SUSD-40122", "Instructional Aide", "602 Marigold St, Garden Grove, CA 92840", "10/16/2026 - 10/31/2026",
            "10/30/2026", "Semimonthly", gross_c, ytd_c, hire="08/20/2021", note="Salary paid semimonthly. School-year position, paid 12 months.")
    letter_doc(d / "O3_lender_preapproval_letter.pdf", "Cobalt Bay Mortgage (fictional)", "Pre-approval letter | NMLS number withheld | Fictional lender",
               ["October 29, 2026", "", "Borrowers: Adaeze Okafor and Chioma Okafor", "", "**CONDITIONAL PRE-APPROVAL**", "",
                "Maximum loan amount: $520,000", "Loan type: 30-year fixed, conventional", "Interest rate quoted: 7.125% (not locked)",
                "Minimum down payment: 5%", "", "This pre-approval expires on January 27, 2027 and is subject to:",
                "  1. Verification of income for both borrowers and a gift letter for any gifted funds.",
                "  2. An acceptable appraisal and clear title.", "  3. No change in employment or new debt before closing.", "",
                "A pre-approval is not a loan commitment. Final terms may change."], color="#1e4a6e")
    bank(d / "O4_bank_statement_oct2026.pdf", "Pacific Lantern Bank (fictional)", "Adaeze Okafor & Chioma Okafor (joint)",
         "602 Marigold St, Garden Grove, CA 92840",
         [("10/02", "RENT - MARIGOLD GARDENS (fictional)", -2890.00), ("10/05", "STUDENT LOAN PMT", -310.00),
          ("10/09", "DEPOSIT - FROM PARENT (GIFT)", 10000.00), ("10/15", "DIRECT DEP SEAVIEW USD", net_c), ("10/16", "DIRECT DEP COASTLINE HOSPITAL", net_a),
          ("10/20", "CREDIT CARD PMT", -240.00), ("10/30", "DIRECT DEP COASTLINE HOSPITAL", net_a), ("10/30", "DIRECT DEP SEAVIEW USD", net_c)],
         1530.10, 38400.00, issue_note="$10,000 gift from a parent on 10/09 will need a signed gift letter.")
    ma, da = monthly_from_ytd(ytd_a, JAN1, YTD_THRU)
    mc, dc = monthly_from_ytd(ytd_c, JAN1, YTD_THRU)
    annual = (ma + mc) * 12; t, lim = tier(annual, 4)
    key += ["## The Okafor sisters (co-buyers, 4 people, keep Bedrooms at 3)", "",
            "Documents: `O1_paystub_adaeze.pdf`, `O2_paystub_chioma.pdf`, `O3_lender_preapproval_letter.pdf`, `O4_bank_statement_oct2026.pdf`", "",
            f"- Adaeze, registered nurse: ${rate:.2f}/hr x {hrs} hrs biweekly = {money(gross_a)}; YTD {money(ytd_a)} -> **{money(ma, False)}/month**",
            f"- Chioma, instructional aide: {money(gross_c)} semimonthly; YTD {money(ytd_c)} -> **{money(mc, False)}/month**",
            f"- Household: **{money(ma + mc, False)}/month = {money(annual, False)}/year** for 4 people",
            f"  - Over the Low (80%) limit ({money(LIMITS['Low (80%)'][3], False)}), under **{t}** ({money(lim, False)})",
            "- Pre-approval: up to $520,000 loan, 7.125% not locked, expires 01/27/2027, conditional.", "",
            f"Net pay deposits match the stubs: Adaeze {money(net_a)}, Chioma {money(net_c)}.",
            "Should flag: over the Lower income limit for a restricted home (try Moderate income tier); $10,000 gift needs a gift letter;",
            "rate not locked; pre-approval is not a commitment.",
            "Demo tip: on Ways to shrink the gap, enter each sister's yearly income as Household 1 and 2 to show the eligibility warning.", ""]

    # Two-year history and student loans
    a24, a25 = 44.00 * 2080, 46.00 * 2080
    c24, c25 = 2150.00 * 24, 2250.00 * 24
    a24b1 = w2(d / "O5_w2_adaeze_2024.pdf", 2024, "Coastline Community Hospital (fictional)", "2200 Shoreline Dr, Huntington Beach, CA 92648", "Adaeze Okafor", "602 Marigold St, Garden Grove, CA 92840", a24, pretax=a24 * .05)
    a25b1 = w2(d / "O6_w2_adaeze_2025.pdf", 2025, "Coastline Community Hospital (fictional)", "2200 Shoreline Dr, Huntington Beach, CA 92648", "Adaeze Okafor", "602 Marigold St, Garden Grove, CA 92840", a25, pretax=a25 * .05)
    w2(d / "O7_w2_chioma_2024.pdf", 2024, "Seaview Unified School District (fictional)", "100 District Way, Fountain Valley, CA 92708", "Chioma Okafor", "602 Marigold St, Garden Grove, CA 92840", c24)
    w2(d / "O8_w2_chioma_2025.pdf", 2025, "Seaview Unified School District (fictional)", "100 District Way, Fountain Valley, CA 92708", "Chioma Okafor", "602 Marigold St, Garden Grove, CA 92840", c25)
    sl_bal = 28400.00
    loan_statement(d / "O9_student_loan_adaeze.pdf", "Lantern Student Loan Servicing (fictional)", "Statement date 10/12/2026 | Account ending 0000 (placeholder)",
                   [("Borrower", "Adaeze Okafor"), ("Loan type", "Student loan, nursing degree"), ("Repayment plan", "Standard 10-year plan"),
                    ("Current balance", money(21980.40)), ("Monthly payment", money(310)), ("Payments remaining", "74"), ("Payment status", "Current")],
                   ["Autopay from checking on the 5th of each month."], color="#1e4a6e")
    loan_statement(d / "O10_student_loan_chioma.pdf", "Lantern Student Loan Servicing (fictional)", "Statement date 10/12/2026 | Account ending 0000 (placeholder)",
                   [("Borrower", "Chioma Okafor"), ("Loan type", "Student loan, associate degree"), ("Repayment plan", "Income-driven repayment"),
                    ("Current balance", money(sl_bal)), ("Monthly payment", money(0) + " (income-driven plan)"), ("Next recalculation", "08/2027"), ("Payment status", "Current")],
                   ["Income-driven payments are recalculated each year and can rise when income rises."], color="#1e4a6e")
    key += [f"Two-year history: Adaeze W-2 2024 gross {money(a24, False)} (box 1 {money(a24b1, False)} after 5% 401k), 2025 gross {money(a25, False)} (box 1 {money(a25b1, False)}).",
            f"Chioma W-2 2024 {money(c24, False)}, 2025 {money(c25, False)}. Both rising into 2026.",
            f"Student loans: Adaeze $310/month (on the bank statement). Chioma $0/month income-driven, balance {money(sl_bal, False)}.",
            f"Should flag: box 1 is lower than gross because of the 401k, so use box 5 or gross for income. For Chioma's $0 payment, some loan programs count a share of the balance instead, for example 0.5% = {money(sl_bal * .005, False)}/month or 1% = {money(sl_bal * .01, False)}/month (likely; rules vary by loan type).", ""]

    (ROOT / "FAMILIES.md").write_text("\n".join(key))
    print("wrote", sorted(str(p.relative_to(ROOT)) for p in OUT.rglob("*.*")))


if __name__ == "__main__":
    main()
