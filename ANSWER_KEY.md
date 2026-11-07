# Answer Key: Herrera Family Sample Pack

All documents are fictional and watermarked. Use this file to check if the app catches what a good caseworker would catch. If the AI misses an item below, that is a bug in the prompt, not a feature.

## Family profile

- Luis Herrera and Maria Herrera, Santa Ana, CA
- Household of 4 (two young children, child care on the bank statement)
- Renting now at $2,450/month
- Considering a $585,000 condo in Garden Grove (doc 04)

## Timeline

| Docs | When | Scenario |
|---|---|---|
| 01 to 04, 08 | Oct to Nov 2026 | Before purchase: intake and loan review |
| 05 to 07 | Dec 2026 to Nov 2027 | After purchase: keep-the-home problems |

---

## 01 / 01b Pay stub, Luis (PDF and phone photo)

**Extract**
- Employer: Pacific Crest Logistics Inc., Warehouse Lead
- $26.00/hr, 80 regular hours + 6 OT hours, biweekly
- Gross this period: $2,314.00. Net: $1,827.49
- YTD gross: $49,870.40 as of 10/30/2026
- Base annual (no OT): $26 x 2,080 = $54,080, about $4,507/month

**Should flag**
- Overtime is variable. A lender usually averages it over time rather than counting this period's OT as stable.

## 02 Pay stub, Maria

**Extract**
- Employer: Sunrise Home Care Services LLC, Home Health Aide (part-time)
- $19.50/hr, 46 hours this period, biweekly
- Gross this period: $897.00. Net: $669.11
- YTD gross: $19,402.50. Start date 03/02/2026

**Should flag**
- Employment under 1 year. Many lenders want a 2 year work history or an explanation. (Likely. Rules vary by loan program.)
- Hours dropped: YTD averages roughly $1,100+ per check across about 17 to 18 checks since March, but this check is $897. Income is variable and possibly declining.

## 03 Bank statement, Oct 2026

**Extract**
- Rent: $2,450
- Auto loan: $412/month
- Credit card payment: $125
- Pay-later installments: SplitPay $86.50 x2 + FlexPay $62.25 x2 = **$297.50/month**
- Child care: $620
- Closing checking balance: $6,018.84. Savings: $8,420.00
- 10/30 deposits match the pay stubs exactly ($1,827.49 and $669.11)

**Should flag**
- **$3,000 cash deposit on 10/09** with no source. Lenders typically require a written explanation and proof of source for large deposits.
- **Overdraft + NSF fee on 10/06.** Shows a cash flow problem in week one of the month.
- **Pay-later debt is hidden debt.** $297.50/month that often does not show on a credit report but is real money out.
- Savings ($8,420) vs cash to close ($36,190 in doc 04): **gap of about $27,770.** Needs assistance programs or this purchase does not work.

## 04 Loan Estimate (simplified)

**Extract**
- Price $585,000, 3% down ($17,550), loan $567,450
- 5/6 ARM, 6.500% start, no rate lock
- P&I $3,586.67, mortgage insurance $260, escrow $711
- Estimated total monthly payment shown: **$4,558**
- Cash to close: $36,190

**Should flag (the "cheap house flips" moment)**
1. **HOA $425/month is NOT in the payment shown.** True monthly cost is **$4,983**, not $4,558.
2. **Adjustable rate.** Can rise to 11.5% by year 8. P&I could reach **$5,298** (computed: remaining balance about $513,067 after 7 years, re-amortized over 23 years at 11.5%).
3. **Prepayment penalty** up to $11,349 (2% of loan) in the first 3 years. Bad for a family that may need to refinance or sell.
4. **No rate lock.** The rate can change before closing.
5. Paying a discount point on an ARM is questionable value. (Likely. Depends on how long the low rate lasts vs the point cost.)
6. **Affordability.** Household gross income is roughly $6,900 to $7,500/month (depends on how OT and Maria's hours are averaged). Housing at $4,983 is about **67% to 72% of gross income**. Add $834.50/month in other debts and total debt load is roughly **78% to 84%**. Far above common guidelines. (Do not hardcode a specific lender cutoff in the app. Show the ratio and let staff judge.)

## 05 Supplemental property tax bill (after purchase)

**Extract**
- Supplemental tax: $1,361.47 total, two installments of $680.74
- Due 04/30/2027 and 08/31/2027. Delinquent after 05/31/2027 and 09/30/2027
- Late: +10% penalty (+$10 cost on 2nd)

**Should flag**
- This is **in addition** to the regular annual tax bill and usually **not paid by escrow.** Many first-time buyers miss it.
- Plain-language output should say: "You owe $1,361.47 extra this year. Pay $680.74 by 04/30/2027 and $680.74 by 08/31/2027."

## 06 Homeowner's insurance nonrenewal (after purchase)

**Extract**
- Notice date 10/28/2027. Coverage ends 01/15/2028 (79 days)
- Reason: insurer pulling back from the area, not the family's fault

**Should flag**
- Must replace coverage before 01/15/2028.
- If coverage lapses, the lender can **force-place insurance**, usually much more expensive and added to the monthly payment.
- Next step: contact an agent or broker now. Do not wait.

## 07 HOA special assessment (after purchase)

**Extract**
- Special assessment $3,200 per unit
- Option A: lump sum by 01/31/2028
- Option B: 12 x $281.67 starting 02/01/2028 (total **$3,380**, so $180 more due to fees)
- Dues rising from $425 to $465/month in 2028
- Hardship payment plan: request by **12/31/2027**
- Late fee: greater of $25 or 10%, after 15 days. Unpaid can become a lien

**Should flag**
- 2028 monthly HOA cost with Option B: $465 + $281.67 = **$746.67** (up from $425).
- Total housing in 2028 with Option B: $3,586.67 + $260 + $711 + $465 + $281.67 = **$5,304.34/month**, before any insurance increase from doc 06.
- Draft letter target: hardship payment plan request to the Board, before 12/31/2027.

## 08 Blank intake form

Target for the photo-to-application demo. Pre-fill it from docs 01 to 03. Expected values:

| Field | Expected |
|---|---|
| Household size | 4 |
| Applicant 1 gross monthly | ~$4,507 base, plus variable OT |
| Applicant 2 gross monthly | ~$1,950 to $2,400 (variable, flag it) |
| Current monthly rent | $2,450 |
| Monthly debts | Auto $412, card $125, pay-later $297.50 = $834.50 |
| Checking / savings | $6,018.84 / $8,420.00 |
| Large deposits | $3,000 cash, 10/09/2026, source unknown |
| NSF events | 1 (10/06/2026) |
| Employment < 2 years | Yes, Maria (started 03/02/2026) |
| Documents missing | Tax returns, 2nd pay stub each, deposit source letter, ID |

## Scoring your demo

The app passes if it gets these 5 without being told:
1. HOA missing from the Loan Estimate payment
2. Adjustable rate and the year 8 worst case
3. The $3,000 cash deposit
4. Pay-later debt as real monthly debt
5. Supplemental tax not paid by escrow
