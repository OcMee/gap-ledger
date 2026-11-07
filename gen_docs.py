"""Generate a fictional sample document pack for the Claude Impact Lab demo.
Every page is watermarked SAMPLE / FICTIONAL. All names, companies, addresses
and numbers are invented."""
import os, sys
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors

OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
W, H = letter

# ---------- shared family data ----------
FAM = {
    "p1": "Luis Herrera", "p2": "Maria Herrera",
    "addr1": "1418 W Almond Ct, Apt 7", "addr2": "Santa Ana, CA 92704",
}

# ---------- mortgage math (used in Loan Estimate) ----------
price = 585_000
down = round(price * 0.03)            # 3% down
loan = price - down
rate = 0.065
n = 360
r = rate / 12
pi = loan * r / (1 - (1 + r) ** -n)
pmi = round(loan * 0.0055 / 12)       # illustrative PMI factor
tax_mo = round(price * 0.0112 / 12)   # illustrative ~1.12% effective rate
ins_mo = 165
hoa_mo = 425
escrow = tax_mo + ins_mo
total_le = round(pi) + pmi + escrow   # what the LE shows as "monthly payment"
true_total = total_le + hoa_mo        # what the family actually pays


def money(x, cents=True):
    return f"${x:,.2f}" if cents else f"${x:,.0f}"


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
                        "Not a real record. All names, companies and figures are invented.")
    c.setFillColor(colors.black)


def header_bar(c, title, sub, color=colors.HexColor("#1f3a5f")):
    c.setFillColor(color)
    c.rect(0, H - 70, W, 70, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 18)
    c.drawString(40, H - 40, title)
    c.setFont("Helvetica", 9)
    c.drawString(40, H - 56, sub)
    c.setFillColor(colors.black)


def table(c, x, y, cols, rows, widths, font=9, row_h=15, head_fill="#e8edf3"):
    c.setFont("Helvetica-Bold", font)
    c.setFillColor(colors.HexColor(head_fill))
    c.rect(x, y - row_h + 4, sum(widths), row_h, fill=1, stroke=0)
    c.setFillColor(colors.black)
    cx = x
    for col, w in zip(cols, widths):
        c.drawString(cx + 3, y - 7, col)
        cx += w
    y -= row_h
    c.setFont("Helvetica", font)
    for row in rows:
        cx = x
        for i, (cell, w) in enumerate(zip(row, widths)):
            if i > 0 and str(cell).startswith(("$", "-$", "(")):
                c.drawRightString(cx + w - 4, y - 7, str(cell))
            else:
                c.drawString(cx + 3, y - 7, str(cell))
            cx += w
        c.setStrokeColor(colors.HexColor("#dddddd"))
        c.line(x, y - 11, x + sum(widths), y - 11)
        y -= row_h
    c.setStrokeColor(colors.black)
    return y


def label_block(c, x, y, pairs, font=9, gap=13, bold_labels=True):
    for k, v in pairs:
        c.setFont("Helvetica-Bold" if bold_labels else "Helvetica", font)
        c.drawString(x, y, k)
        c.setFont("Helvetica", font)
        c.drawString(x + 120, y, v)
        y -= gap
    return y


# ---------- 1 & 2. Pay stubs ----------
def paystub(fname, employer, emp_addr, name, emp_id, title, rate_hr, hours, ot_hours,
            ytd_gross, period, pay_date, extra_note=None):
    c = canvas.Canvas(os.path.join(OUT, fname), pagesize=letter)
    header_bar(c, employer, emp_addr)
    reg = rate_hr * hours
    ot = rate_hr * 1.5 * ot_hours
    gross = reg + ot
    fed = round(gross * 0.072, 2)
    ss = round(gross * 0.062, 2)
    med = round(gross * 0.0145, 2)
    ca = round(gross * 0.022, 2)
    sdi = round(gross * 0.012, 2)
    med_ins = 64.20
    net = gross - fed - ss - med - ca - sdi - med_ins

    c.setFont("Helvetica-Bold", 13)
    c.drawString(40, H - 100, "EARNINGS STATEMENT")
    y = label_block(c, 40, H - 125, [
        ("Employee", name), ("Employee ID", emp_id), ("Position", title),
        ("Address", FAM['addr1']), ("", FAM['addr2']),
    ])
    label_block(c, 340, H - 125, [
        ("Pay period", period), ("Pay date", pay_date),
        ("Pay frequency", "Biweekly"), ("Check / DD #", "DD-" + emp_id[-4:] + "-2211"),
    ])
    y -= 15
    y = table(c, 40, y, ["Earnings", "Rate", "Hours", "Current", "Year to date"], [
        ["Regular", money(rate_hr), f"{hours:.2f}", money(reg), money(ytd_gross * (reg / gross))],
        ["Overtime", money(rate_hr * 1.5), f"{ot_hours:.2f}", money(ot), money(ytd_gross * (ot / gross) if ot else 0)],
        ["GROSS PAY", "", "", money(gross), money(ytd_gross)],
    ], [150, 80, 70, 110, 120])
    y -= 15
    factor = ytd_gross / gross
    y = table(c, 40, y, ["Deductions", "Current", "Year to date"], [
        ["Federal income tax", money(fed), money(fed * factor)],
        ["Social Security", money(ss), money(ss * factor)],
        ["Medicare", money(med), money(med * factor)],
        ["CA state income tax", money(ca), money(ca * factor)],
        ["CA SDI", money(sdi), money(sdi * factor)],
        ["Medical (pre-tax)", money(med_ins), money(med_ins * factor)],
    ], [250, 140, 140])
    y -= 20
    c.setFillColor(colors.HexColor("#f2f6ea"))
    c.rect(40, y - 30, 530, 38, fill=1, stroke=0)
    c.setFillColor(colors.black)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(52, y - 18, "NET PAY")
    c.drawRightString(560, y - 18, money(net))
    if extra_note:
        c.setFont("Helvetica-Oblique", 9)
        c.drawString(40, y - 55, extra_note)
    watermark(c)
    c.save()
    return gross, net


g1, n1 = paystub("01_paystub_luis.pdf", "Pacific Crest Logistics Inc. (fictional)",
                 "4200 Harbor Freight Way, Building C, Anaheim, CA 92801 (fictional address)",
                 FAM["p1"], "PCL-008431", "Warehouse Lead", 26.00, 80, 6,
                 ytd_gross=49_870.40, period="10/12/2026 - 10/25/2026", pay_date="10/30/2026")

g2, n2 = paystub("02_paystub_maria.pdf", "Sunrise Home Care Services LLC (fictional)",
                 "77 Bristol Plaza, Suite 210, Costa Mesa, CA 92626 (fictional address)",
                 FAM["p2"], "SHC-1192", "Home Health Aide (part-time)", 19.50, 46, 0,
                 ytd_gross=19_402.50, period="10/12/2026 - 10/25/2026", pay_date="10/30/2026",
                 extra_note="Hours vary by client schedule. Employment start date: 03/02/2026.")

# ---------- 3. Bank statement ----------
c = canvas.Canvas(os.path.join(OUT, "03_bank_statement_oct2026.pdf"), pagesize=letter)
header_bar(c, "Harborview Community Credit Union (fictional)",
           "Member statement  |  Everyday Checking  |  Account ending 0000 (placeholder)",
           colors.HexColor("#14532d"))
label_block(c, 40, H - 100, [("Members", f"{FAM['p1']} & {FAM['p2']}"),
                              ("Address", f"{FAM['addr1']}, {FAM['addr2']}"),
                              ("Statement period", "10/01/2026 - 10/31/2026")])
tx = [
    ("10/02", "DIRECT DEP PACIFIC CREST LOGISTICS", 1752.18),
    ("10/02", "DIRECT DEP SUNRISE HOME CARE", 802.11),
    ("10/02", "RENT - ALMOND COURT APTS (fictional)", -2450.00),
    ("10/03", "AUTO LOAN PMT - FICTIONAL AUTO FINANCE", -412.00),
    ("10/05", "PAY-LATER INSTALLMENT - SPLITPAY (fictional)", -86.50),
    ("10/06", "GROCERY - FICTIONAL MARKET", -214.37),
    ("10/06", "INSUFFICIENT FUNDS FEE", -35.00),
    ("10/08", "MOBILE PHONE - FICTIONAL WIRELESS", -140.00),
    ("10/09", "CASH DEPOSIT - BRANCH", 3000.00),
    ("10/12", "PAY-LATER INSTALLMENT - FLEXPAY (fictional)", -62.25),
    ("10/14", "UTILITY - FICTIONAL ELECTRIC CO", -168.90),
    ("10/15", "CREDIT CARD PMT - FICTIONAL CARD", -125.00),
    ("10/16", "DIRECT DEP PACIFIC CREST LOGISTICS", 1781.40),
    ("10/16", "DIRECT DEP SUNRISE HOME CARE", 744.62),
    ("10/18", "GROCERY - FICTIONAL MARKET", -231.08),
    ("10/19", "PAY-LATER INSTALLMENT - SPLITPAY (fictional)", -86.50),
    ("10/21", "CHILD CARE - FICTIONAL LITTLE STEPS", -620.00),
    ("10/22", "GAS - FICTIONAL FUEL", -78.44),
    ("10/26", "PAY-LATER INSTALLMENT - FLEXPAY (fictional)", -62.25),
    ("10/28", "CAR INSURANCE - FICTIONAL AUTO INS", -198.00),
    ("10/30", "DIRECT DEP PACIFIC CREST LOGISTICS", 1827.49),
    ("10/30", "DIRECT DEP SUNRISE HOME CARE", 669.11),
]
bal = 412.22
rows = [["10/01", "Opening balance", "", money(bal)]]
for d, desc, amt in tx:
    bal += amt
    rows.append([d, desc, ("-" + money(-amt)) if amt < 0 else money(amt), ("-" + money(-bal)) if bal < 0 else money(bal)])
y = table(c, 40, H - 150, ["Date", "Description", "Amount", "Balance"], rows, [50, 300, 90, 90], font=8, row_h=14)
c.setFont("Helvetica-Bold", 10)
c.drawString(40, y - 15, f"Closing balance 10/31/2026: {money(bal)}")
c.setFont("Helvetica", 9)
c.drawString(40, y - 32, "Linked savings x0000 balance 10/31/2026: $8,420.00")
watermark(c)
c.save()

# ---------- 4. Loan Estimate (simplified, fictional) ----------
c = canvas.Canvas(os.path.join(OUT, "04_loan_estimate_sample.pdf"), pagesize=letter)
header_bar(c, "Loan Estimate  (simplified sample)",
           "Lender: Bayline Home Lending (fictional)  |  Date issued 11/02/2026  |  Rate lock: NO",
           colors.HexColor("#3b2f63"))
y = label_block(c, 40, H - 100, [
    ("Applicants", f"{FAM['p1']} & {FAM['p2']}"),
    ("Property", "2290 Laurel Glen Dr, Unit 14, Garden Grove, CA 92840 (fictional)"),
    ("Sale price", money(price, False)),
    ("Loan term", "30 years"),
    ("Purpose", "Purchase"),
    ("Product", "5/6 Adjustable Rate (ARM)"),
    ("Loan type", "Conventional"),
])
y -= 8
c.setFont("Helvetica-Bold", 11)
c.drawString(40, y, "Loan Terms")
y -= 6
y = table(c, 40, y, ["", "Amount", "Can this amount increase after closing?"], [
    ["Loan amount", money(loan, False), "NO"],
    ["Interest rate", "6.500%", "YES - adjusts every 6 mo. from year 6; max 11.500% by year 8"],
    ["Monthly principal & interest", money(pi), "YES - can reach $5,298 by year 8"],
    ["Prepayment penalty", "YES", "Up to $11,349 if paid off in first 3 years"],
    ["Balloon payment", "NO", ""],
], [150, 80, 300], font=8)
y -= 10
c.setFont("Helvetica-Bold", 11)
c.drawString(40, y, "Projected Payments (years 1-5)")
y -= 6
y = table(c, 40, y, ["Item", "Monthly"], [
    ["Principal & interest", money(pi)],
    ["Mortgage insurance", money(pmi, False)],
    ["Estimated escrow (property taxes + homeowner's insurance)", money(escrow, False)],
    ["ESTIMATED TOTAL MONTHLY PAYMENT", money(round(pi) + pmi + escrow, False)],
], [380, 150], font=9)
c.setFont("Helvetica", 8)
y -= 4
c.drawString(40, y, "Estimated taxes, insurance & assessments: includes property taxes and homeowner's insurance.")
y -= 11
c.drawString(40, y, f"Other: Homeowner's Association dues ({money(hoa_mo, False)}/month) - NOT in escrow. You must pay these costs separately.")
y -= 18
c.setFont("Helvetica-Bold", 11)
c.drawString(40, y, "Costs at Closing")
y -= 6
closing_costs = 18_640
lender_credit = 0
cash_to_close = down + closing_costs
y = table(c, 40, y, ["Item", "Amount"], [
    ["Down payment (3%)", money(down, False)],
    ["Estimated closing costs (incl. $4,120 origination charges, 1.0 discount point)", money(closing_costs, False)],
    ["Lender credits", money(lender_credit, False)],
    ["ESTIMATED CASH TO CLOSE", money(cash_to_close, False)],
], [380, 150], font=9)
c.setFont("Helvetica-Oblique", 8)
y -= 6
c.drawString(40, y, "This simplified sample loosely follows the structure of a standard Loan Estimate. Field set and layout are reduced for demo use.")
watermark(c)
c.save()

# ---------- 5. Supplemental property tax bill ----------
c = canvas.Canvas(os.path.join(OUT, "05_supplemental_tax_bill.pdf"), pagesize=letter)
header_bar(c, "Sample County Tax Collector (fictional)",
           "SUPPLEMENTAL PROPERTY TAX BILL  |  Fiscal year 2026-27  |  Bill # S-26-000-0000",
           colors.HexColor("#7a3e00"))
y = label_block(c, 40, H - 100, [
    ("Owner of record", f"{FAM['p1']} & {FAM['p2']}"),
    ("Property", "2290 Laurel Glen Dr, Unit 14, Garden Grove, CA (fictional)"),
    ("Event", "Change in ownership 12/18/2026"),
    ("Prior assessed value", "$341,880"),
    ("New assessed value", money(price, False)),
    ("Supplemental value", money(price - 341_880, False)),
    ("Prorated portion", "0.50 of fiscal year"),
])
supp = round((price - 341_880) * 0.0112 * 0.5, 2)
inst = round(supp / 2, 2)
y -= 10
y = table(c, 40, y, ["Installment", "Amount due", "Due date", "Delinquent after", "If late"], [
    ["1st installment", money(inst), "04/30/2027", "05/31/2027 5:00 PM", "+10% penalty"],
    ["2nd installment", money(inst), "08/31/2027", "09/30/2027 5:00 PM", "+10% penalty + $10 cost"],
    ["TOTAL", money(supp), "", "", ""],
], [100, 90, 80, 130, 130], font=9)
y -= 18
c.setFont("Helvetica-Bold", 10)
c.drawString(40, y, "IMPORTANT")
c.setFont("Helvetica", 9)
for line in [
    "This supplemental bill is IN ADDITION to your regular annual property tax bill.",
    "Supplemental bills are usually NOT paid by your mortgage escrow account. Contact your lender",
    "if you are unsure. Failure to pay does not cancel the tax and penalties will be added.",
]:
    y -= 13
    c.drawString(40, y, line)
watermark(c)
c.save()

# ---------- 6. Homeowner's insurance non-renewal ----------
c = canvas.Canvas(os.path.join(OUT, "06_insurance_nonrenewal_notice.pdf"), pagesize=letter)
header_bar(c, "Coastal Shield Mutual Insurance (fictional)",
           "NOTICE OF NONRENEWAL  |  Condominium Unit-Owners Policy (HO-6)",
           colors.HexColor("#5b1a1a"))
y = label_block(c, 40, H - 100, [
    ("Named insured", f"{FAM['p1']} & {FAM['p2']}"),
    ("Policy #", "CSM-H6-0000000"),
    ("Insured location", "2290 Laurel Glen Dr, Unit 14, Garden Grove, CA (fictional)"),
    ("Notice date", "10/28/2027"),
    ("Policy expires", "01/15/2028 12:01 AM"),
])
c.setFont("Helvetica", 10)
body = [
    "We are writing to tell you that we will not renew your policy when it expires on the date shown above.",
    "",
    "Reason for nonrenewal: The company is reducing its exposure in your area following a review of",
    "wildfire and catastrophe risk. This decision is not based on any claim or action by you.",
    "",
    "What this means: Your coverage remains in force until the expiration date. After that date your",
    "property will NOT be insured by us. Your mortgage lender requires continuous coverage. If coverage",
    "lapses, your lender may purchase insurance on your behalf (force-placed insurance), which is usually",
    "much more expensive and is added to your monthly payment.",
    "",
    "Next steps: Contact your agent or a licensed broker to find replacement coverage before the",
    "expiration date. You may also contact your state insurance department with questions.",
]
y -= 10
for line in body:
    c.drawString(40, y, line)
    y -= 14
watermark(c)
c.save()

# ---------- 7. HOA special assessment ----------
c = canvas.Canvas(os.path.join(OUT, "07_hoa_special_assessment.pdf"), pagesize=letter)
header_bar(c, "Laurel Glen Owners Association (fictional)",
           "NOTICE OF SPECIAL ASSESSMENT AND 2028 BUDGET", colors.HexColor("#0f4c5c"))
y = label_block(c, 40, H - 100, [
    ("To", f"Owner(s), Unit 14 - {FAM['p1']} & {FAM['p2']}"),
    ("Notice date", "11/15/2027"),
])
c.setFont("Helvetica", 10)
y -= 6
for line in [
    "At its 11/08/2027 meeting the Board approved a special assessment to replace roofs on Buildings 2-4",
    "and fund the reserve shortfall identified in the 2027 reserve study.",
]:
    c.drawString(40, y, line); y -= 14
y -= 6
y = table(c, 40, y, ["Item", "Per unit"], [
    ["Special assessment (total)", "$3,200.00"],
    ["Option A: lump sum, due 01/31/2028", "$3,200.00"],
    ["Option B: 12 monthly installments starting 02/01/2028 ($15 admin fee each)", "$281.67 /month"],
    ["Monthly dues 2027", "$425.00"],
    ["Monthly dues 2028 (approved)", "$465.00"],
], [380, 150], font=9)
y -= 14
c.setFont("Helvetica", 9)
for line in [
    "Late payments: a late fee of $25 or 10% of the delinquent amount (whichever is greater) applies 15 days",
    "after the due date. Unpaid assessments may result in a lien against the property.",
    "Hardship: owners experiencing financial hardship may request a payment plan meeting with the Board",
    "by writing to the management company before 12/31/2027.",
]:
    c.drawString(40, y, line); y -= 13
watermark(c)
c.save()

# ---------- 8. Blank nonprofit intake form (target for pre-fill) ----------
c = canvas.Canvas(os.path.join(OUT, "08_intake_form_blank.pdf"), pagesize=letter)
header_bar(c, "Homeownership Program - Family Intake Form",
           "Sample Housing Nonprofit (fictional)  |  Staff use: file #________", colors.HexColor("#334155"))
fields = [
    "Applicant 1 full name", "Applicant 2 full name", "Current address", "Household size",
    "Applicant 1 employer / position", "Applicant 1 gross monthly income",
    "Applicant 2 employer / position", "Applicant 2 gross monthly income",
    "Total household gross annual income", "Employment start date(s) (< 2 years?)",
    "Current monthly rent", "Monthly debt payments (auto, cards, pay-later, other)",
    "Checking balance", "Savings balance",
    "Large / unexplained deposits (amount, date, source)", "Overdraft / NSF events (last 60 days)",
    "Documents received", "Documents missing",
]
y = H - 100
c.setFont("Helvetica", 9)
for f in fields:
    c.drawString(40, y, f)
    c.setStrokeColor(colors.HexColor("#9ca3af"))
    c.line(260, y - 2, 570, y - 2)
    y -= 26
c.setStrokeColor(colors.black)
watermark(c)
c.save()

# print numbers for the answer key
print(f"PI={pi:.2f} PMI={pmi} tax_mo={tax_mo} ins_mo={ins_mo} escrow={escrow} LE_total={round(pi)+pmi+escrow} "
      f"true_total={round(pi)+pmi+escrow+hoa_mo} loan={loan} down={down} cash_to_close={down+18640}")
print(f"luis gross={g1:.2f} net={n1:.2f} | maria gross={g2:.2f} net={n2:.2f}")
print(f"supp total={(price-341880)*0.0112*0.5:.2f} closing bal={bal:.2f}")
