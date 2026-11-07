# Gap Ledger

Claude Impact Lab, Orange County. Lane 03: Fund it. Does an affordable ownership home pencil, and who closes the gap?

Open `app/index.html` in a browser. No install, no server, no login.

- `app/index.html`: gap calculator. Statute price cap from dated HCD income limits, rate sensitivity and history, funding stack, donor view.
- `app/docs.js`: document reading. Claude (on the viewer's claude.ai account) extracts fields with quotes; code does the math; nothing applies until you click Apply. Works on the claude.ai copy of the page only.
- `tools/gen_project_docs.py`: makes the fictional budget (doc 10) and commitment letter (doc 09).
- `app/household.html`: household check on the fictional Herrera documents.
- `app/limits.js`: Orange County 2026 income limits, hand-copied from HCD PDFs. Check against the source.
- `app/rates.js`: Freddie Mac 30-year weekly rate (FRED `MORTGAGE30US`). Refresh with `python3 tools/refresh_rates.py`.
- `sample-docs/`, `ANSWER_KEY.md`: fictional test documents from the starter kit.

Statute check (CA Health & Safety Code 50052.5): lower, extremely low and moderate income formulas and the bedrooms + 1 household size were matched to published copies of the statute, not the official code site. The very low income formula is still unverified.

Demo script: `DEMO.md`.

All data in this repo is fictional or public. Never commit real household documents. `real-docs/` is git-ignored.

- `app/atlas.js`: county outlines for the atlas map, built by `tools/build_atlas.py` from US Census Bureau boundaries via the `us-atlas` npm package (ISC license). Rebuild: `npm pack us-atlas@3.0.1`, unpack, then `python3 tools/build_atlas.py package/counties-10m.json`.
