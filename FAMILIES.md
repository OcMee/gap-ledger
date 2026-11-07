# Families demo pack: answer key

All documents are fictional and watermarked. Values below are computed by `tools/gen_family_pack.py` with the same
formulas the app uses (year-to-date pay / days x 365 / 12). Use this to check what the document reader extracts.

## The Nguyens (3 people, set Bedrooms to 2)

Documents: `N1b_paystub_minh_phone_photo.jpg`, `N2_gig_income_1099_summary.pdf`, `N3_bank_statement_oct2026.pdf`

- Minh, line cook: $22.50/hr x 80 hrs biweekly = $1,800.00 per check; YTD $39,600.00 through 10/30/2026
  - Monthly: $39,600 / 303 days x 365 / 12 = **$3,975**
- Thao, delivery gig: YTD $8,450 through 10/31/2026, months range $480 to $1,300
  - Monthly: $8,450 / 304 days x 365 / 12 = **$845**
- Household: **$4,821/month = $57,849/year** for 3 people -> under **Very low (50%)** ($83,750)

Net pay deposits match the stub: $1,480.50 on 10/16 and 10/30.
Should flag: gig income is variable and before expenses; a lender will likely average it over 2 years. Late fee on 10/14.
Demo tip: switch the language to Tieng Viet before reading, so summaries come back in Vietnamese.

Two-year history: Minh W-2 2024 $43,680, 2025 $45,240, 2026 pace $47,703 (rising).
Thao 1099-NEC 2024 $7,950, 2025 $9,880; 2-year average $8,915/yr. 2026 pace $10,146.
Car loan: $298/month, balance $8,742.18, 31 payments left; matches the 10/05 bank payment.
Should flag: lenders usually average gig income over 2 years ($8,915/yr) instead of using this year's pace.

## Rosa Delgado (2 people, set Bedrooms to 1)

Documents: `D1_paystub_rosa.pdf`, `D2_child_support_order_summary.pdf`, `D3_bank_statement_oct2026.pdf`

- Rosa, patient services: $20.00/hr x 72 hrs biweekly = $1,440.00 per check; YTD $31,680.00 through 10/30/2026
  - Monthly: $31,680 / 303 days x 365 / 12 = **$3,180**
- Child support: **$450/month** (order through at least 02/01/2028)
- Household: **$3,630/month = $43,562/year** for 2 people -> under **Extremely low** ($44,700)
- Savings $2,150: far below cash to close on most homes, so deferred down-payment programs matter most.

Net pay deposits match the stub: $1,184.40 on 10/03, 10/17 and 10/30.
Should flag: payday loan ($400 borrowed, $460 repaid, a 15% fee in 2 weeks); one late support payment in July.

Two-year history: Rosa W-2 2024 $35,100, 2025 $36,504, 2026 pace $38,162 (steady, small raises).
Co-signed home improvement loan for her mother's house: $145/month, balance $6,214.55. Not on Rosa's bank statement (mother pays).
Should flag: co-signed debt usually counts in Rosa's debt-to-income unless she shows 12 months of the mother paying it.

## The Okafor sisters (co-buyers, 4 people, keep Bedrooms at 3)

Documents: `O1_paystub_adaeze.pdf`, `O2_paystub_chioma.pdf`, `O3_lender_preapproval_letter.pdf`, `O4_bank_statement_oct2026.pdf`

- Adaeze, registered nurse: $48.00/hr x 80 hrs biweekly = $3,840.00; YTD $84,480.00 -> **$8,481/month**
- Chioma, instructional aide: $2,350.00 semimonthly; YTD $47,000.00 -> **$4,718/month**
- Household: **$13,199/month = $158,383/year** for 4 people
  - Over the Low (80%) limit ($148,850), under **Moderate (120%)** ($166,300)
- Pre-approval: up to $520,000 loan, 7.125% not locked, expires 01/27/2027, conditional.

Net pay deposits match the stubs: Adaeze $3,158.40, Chioma $1,932.87.
Should flag: over the Lower income limit for a restricted home (try Moderate income tier); $10,000 gift needs a gift letter;
rate not locked; pre-approval is not a commitment.
Demo tip: on Ways to shrink the gap, enter each sister's yearly income as Household 1 and 2 to show the eligibility warning.

Two-year history: Adaeze W-2 2024 gross $91,520 (box 1 $86,944 after 5% 401k), 2025 gross $95,680 (box 1 $90,896).
Chioma W-2 2024 $51,600, 2025 $54,000. Both rising into 2026.
Student loans: Adaeze $310/month (on the bank statement). Chioma $0/month income-driven, balance $28,400.
Should flag: box 1 is lower than gross because of the 401k, so use box 5 or gross for income. For Chioma's $0 payment, some loan programs count a share of the balance instead, for example 0.5% = $142/month or 1% = $284/month (likely; rules vary by loan type).
