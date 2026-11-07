# Project context: Claude Impact Lab, UCI (affordable homeownership)

## Goal
Build a working prototype in one day that helps low-income families or the nonprofits serving them make homeownership financially sustainable. Demo is 60 to 90 seconds.

## Hard rules
- Use only the fictional documents in `sample-docs/`. Never use real personal or financial data.
- Every number shown to a user must come from a document or a visible calculation. No invented figures.
- Plain language output. Target reading level: middle school. Offer Spanish and Vietnamese output if time allows.
- Do not give legal or lending advice. Explain, flag, and point to a next step or a human.
- Keep it simple to run. Nonprofits have little IT budget. One page app, no login, no database for the demo.

## Candidate builds (pick ONE after hearing the nonprofit partners)
1. **Photo-to-application**: upload docs 01b, 02, 03 -> extract fields -> pre-fill intake form (doc 08) -> list flags and missing documents. Customer: nonprofit intake staff.
2. **Loan and HOA explainer**: upload doc 04 (or 07) -> plain-language summary -> red flags -> "true monthly cost" -> questions to ask before signing. Customer: family + counselor.
3. **Keep-the-home assistant**: upload doc 05, 06, or 07 -> what it is, how much, by when, what happens if ignored -> draft letter or next step. Customer: family after purchase.

## Test data
- `sample-docs/`: 8 PDFs + 1 phone photo for one fictional family (the Herreras).
- `ANSWER_KEY.md`: every value and flag the app should catch. Use it as the test checklist. The app passes if it catches the 5 items in "Scoring your demo".

## Build approach
- Send document images or PDFs to Claude, ask for structured JSON output (fields + flags + plain-language summary), then render it.
- Do arithmetic in code, not in the model. Have the model extract numbers, compute totals in JavaScript or Python.
- Build the happy path for the Herrera family end to end first. Polish second.

## Demo script skeleton
1. Show the problem: one document a family would not understand.
2. Upload it.
3. Reveal the plain-language result and the flag they would have missed.
4. Show the next step (pre-filled form, letter, or question list).
5. Close: one line on who saves time or money.

## Real documents from the nonprofit (if provided)
- Keep them ONLY in `real-docs/`. That folder is in `.gitignore`. Never commit, push, or copy them elsewhere.
- Never put real names, SSNs, account numbers, addresses, or amounts into code, prompts saved in files, screenshots, slides, or test fixtures.
- Use real docs to learn the FORMAT (fields, layout, where things are). Then build a synthetic clone with fake values in `sample-docs/` and demo on that.
- If a real doc is not redacted, stop and ask the team before sending it to any API.
- Run `python3 check_redaction.py real-docs/` first. A black box drawn on a PDF can leave the text readable underneath. If it prints STOP, do not send those files.
- In the app: blacked-out fields are "redacted", not "missing". Never guess a value under a black box. Show "redacted" and keep going.
- Ask staff what they check on each document. Add those checks to ANSWER_KEY.md as test items, using the synthetic clone's values.
- Delete `real-docs/` at the end of the day unless the nonprofit says otherwise.

## Regenerating docs
`python3 gen_docs.py sample-docs` (needs `reportlab`). Edit numbers at the top of the script.
