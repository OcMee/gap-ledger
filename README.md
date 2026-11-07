# Gap Ledger

Claude Impact Lab, Orange County. Lane 03: Fund it. Does an affordable ownership home pencil, and who closes the gap?

Open `app/index.html` in a browser. No install, no server, no login.

- `app/index.html`: gap calculator. Statute price cap from dated HCD income limits, rate sensitivity and history, funding stack, donor view.
- `app/household.html`: household check on the fictional Herrera documents.
- `app/limits.js`: Orange County 2026 income limits, hand-copied from HCD PDFs. Check against the source.
- `app/rates.js`: Freddie Mac 30-year weekly rate (FRED `MORTGAGE30US`). Refresh with `python3 tools/refresh_rates.py`.
- `sample-docs/`, `ANSWER_KEY.md`: fictional test documents from the starter kit.

Unverified: the lower, very low and extremely low income multipliers in `limits.js` (CA Health & Safety Code 50052.5) were not checked against the statute text.

All data in this repo is fictional or public. Never commit real household documents. `real-docs/` is git-ignored.
