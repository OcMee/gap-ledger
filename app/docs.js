// Document reading for the Gap Ledger.
// Claude reads each file (on the viewer's claude.ai account) and returns facts with quotes.
// All arithmetic happens here in code. Nothing is applied to the calculator until the viewer clicks Apply.
(() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const money = x => (x < 0 ? "\u2212$" : "$") + Math.round(Math.abs(x)).toLocaleString("en-US");
  const SAMPLE_FILES = [
    "10_development_budget.pdf", "09_funding_commitment_letter.pdf", "04_loan_estimate_sample.pdf",
    "01b_paystub_luis_phone_photo.jpg", "02_paystub_maria.pdf", "03_bank_statement_oct2026.pdf",
  ];
  const TYPE_NAMES = {
    pay_stub: "Pay stub", bank_statement: "Bank statement", loan_estimate: "Loan Estimate",
    purchase_contract: "Purchase contract", development_budget: "Development budget",
    funding_commitment: "Funding commitment", tax_bill: "Tax bill", insurance_notice: "Insurance notice",
    hoa_notice: "HOA notice", other: "Other document",
  };
  const PERIODS = { weekly: 52, biweekly: 26, semimonthly: 24, monthly: 12 };
  let sample = null, imgLimits = null, docs = [], running = 0;
  const queue = [];

  // ---------- startup ----------
  (async () => {
    try { sample = window.claude ? await window.claude.use("sample") : null; } catch { sample = null; }
    if (sample) { try { imgLimits = (await sample.limits()).images || null; } catch { imgLimits = null; } }
    $("docUnavailable").hidden = !!sample;
    $("docControls").hidden = !sample;
  })();

  // ---------- file intake ----------
  $("docInput").addEventListener("change", e => { addFiles([...e.target.files]); e.target.value = ""; });
  const drop = $("docDrop");
  ["dragenter", "dragover"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("over"); }));
  drop.addEventListener("drop", e => addFiles([...e.dataTransfer.files]));
  $("docSamples").addEventListener("click", async () => {
    $("docSamples").disabled = true;
    const files = [];
    for (const f of SAMPLE_FILES) {
      try {
        let r = await fetch("sample-docs/" + f).catch(() => null);
        if (!r || !r.ok) r = await fetch("../sample-docs/" + f);
        if (r.ok) files.push(new File([await r.blob()], f, { type: f.endsWith(".pdf") ? "application/pdf" : "image/jpeg" }));
      } catch { /* skip missing file */ }
    }
    addFiles(files);
  });
  // Live demo: read only the commitment letter, in one click.
  $("docLive").addEventListener("click", async () => {
    const f = "09_funding_commitment_letter.pdf";
    let r = await fetch("sample-docs/" + f).catch(() => null);
    if (!r || !r.ok) r = await fetch("../sample-docs/" + f).catch(() => null);
    if (!r || !r.ok) { $("docNote").textContent = "The sample letter could not be loaded."; return; }
    const file = new File([await r.blob()], f, { type: "application/pdf" });
    addFiles([file]);
    $("doc-" + docs[docs.length - 1].id)?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  $("docClear").addEventListener("click", () => { [...docs].forEach(d => remove(d.id)); $("docNote").textContent = "Removed all documents."; });

  function addFiles(files) {
    for (const file of files) {
      if (!/pdf|jpe?g|png|webp/i.test(file.type + file.name)) continue;
      const d = { id: Math.random().toString(36).slice(2), file, name: file.name, status: "waiting", result: null, error: "", applied: false };
      docs.push(d); queue.push(d);
    }
    render(); pump();
  }

  function pump() {
    while (running < 2 && queue.length) { const d = queue.shift(); running++; read(d).finally(() => { running--; pump(); }); }
  }

  // ---------- reading ----------
  async function pdfParts(file) {
    if (!window.pdfjsLib) throw { code: "pdf_unavailable" };
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    let text = "";
    const images = [];
    const maxImgs = Math.min(imgLimits?.maxCount ?? 0, 3);
    for (let p = 1; p <= Math.min(pdf.numPages, 4); p++) {
      const page = await pdf.getPage(p);
      const tc = await page.getTextContent();
      text += `\n--- page ${p} ---\n` + tc.items.map(i => i.str + (i.hasEOL ? "\n" : " ")).join("");
      if (images.length < maxImgs) {
        const vp0 = page.getViewport({ scale: 1 });
        const vp = page.getViewport({ scale: Math.min(2, 1400 / vp0.width) });
        const cv = document.createElement("canvas");
        cv.width = vp.width; cv.height = vp.height;
        const ctx = cv.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height);
        await page.render({ canvasContext: ctx, viewport: vp }).promise;
        images.push(await new Promise(res => cv.toBlob(res, "image/png")));
      }
    }
    return { text: text.trim(), images };
  }

  function prompt(name, text, hasImages) {
    return `You read ONE housing finance document for a nonprofit affordable-homeownership gap calculator.
Extract facts only. Never guess or invent a value. If a value is blacked out, covered or unreadable, return it with "value": null and "redacted": true. Do not give legal or lending advice.

File name: ${name}
${text ? `Text layer of the PDF (reading order may be scrambled; use the page images for layout):\n${text.slice(0, 15000)}\n` : ""}${hasImages ? "Page images of the document are attached." : ""}

Reply with only one JSON object:
{"doc_type": "pay_stub" | "bank_statement" | "loan_estimate" | "purchase_contract" | "development_budget" | "funding_commitment" | "tax_bill" | "insurance_notice" | "hoa_notice" | "other",
 "title": "short name of the document",
 "summary": "1 to 2 plain sentences a family or funder understands, about a 6th grade reading level, written in ${window.LANG_NAME ? window.LANG_NAME() : "English"}",
 "fields": [{"key": "...", "label": "...", "value": number or string or null, "evidence": "exact short quote from the document", "redacted": false}],
 "flags": [{"severity": "high" | "medium", "text": "plain-language issue someone could miss", "evidence": "exact short quote"}]}

Write "summary" and each flag "text" in ${window.LANG_NAME ? window.LANG_NAME() : "English"}. Keep "key" values and "evidence" quotes exactly as specified or as written in the document.
Numbers: no $ or commas. Percent as a number (6.5). Dates as YYYY-MM-DD. Up to 5 flags.
Use these keys when the document has them:
pay_stub: person_name, employer, pay_frequency (weekly|biweekly|semimonthly|monthly), hourly_rate, hours_this_period, overtime_hours, gross_this_period, net_this_period, ytd_gross, ytd_through_date, hire_date
bank_statement: statement_period, checking_balance, savings_balance, rent_payment, auto_loan_payment, credit_card_payment, pay_later_monthly_total, child_care_payment, unexplained_large_deposit, overdraft_or_nsf_fees
loan_estimate or purchase_contract: sale_price, loan_amount, interest_rate, rate_type (fixed|adjustable), max_rate, monthly_payment_shown, hoa_monthly, hoa_in_payment (yes|no), cash_to_close, prepayment_penalty, rate_locked (yes|no)
development_budget: project_name, homes, total_development_cost, cost_per_home, land_cost, hard_cost, soft_cost
funding_commitment: funder_name, funder_type (City|State|Federal|Down-payment program|Lender|Employer|Donor|Earned revenue|Developer fee / land), program_name, amount_total, amount_per_home, homes, commitment_status (committed|conditional|pending|unknown), expiration_date, conditions
other documents: amount_due, due_date, action_needed`;
  }

  // Most recent saved read of the same file name, used as the stage fallback.
  const savedFor = d => (history || []).filter(h => h.name === d.name && h.result).sort((a, b) => b.savedAt.localeCompare(a.savedAt))[0];

  function useSaved(d) {
    const h = savedFor(d); if (!h) return;
    d.fallback = true; d.ctl?.abort(); clearInterval(d.timer);
    d.result = h.result; d.status = "done"; d.fromSaved = h.savedAt;
    render();
  }

  async function read(d) {
    d.status = "reading"; d.start = Date.now(); render();
    d.ctl = new AbortController();
    d.timer = setInterval(() => {
      const secs = Math.round((Date.now() - d.start) / 1000), t = $("tick-" + d.id), fb = $("fb-" + d.id);
      if (t) t.textContent = secs;
      if (fb && secs >= 30 && savedFor(d) && !fb.firstChild) {
        fb.innerHTML = `Taking a while? <button class="linkbtn" data-saved="${d.id}">Use saved result</button>`;
      }
    }, 1000);
    try {
      let text = "", images = [];
      const isPdf = /pdf/i.test(d.file.type) || /\.pdf$/i.test(d.name);
      if (isPdf) ({ text, images } = await pdfParts(d.file));
      else if (imgLimits) images = [d.file];
      else throw { code: "images_unavailable" };
      if (!text && !images.length) throw { code: "empty_document" };
      const opts = { signal: d.ctl.signal };
      if (images.length) opts.images = images;
      const out = await sample.json(prompt(d.name, text, images.length > 0), opts);
      if (!out || typeof out !== "object" || !Array.isArray(out.fields)) throw { code: "invalid_json" };
      d.result = out; d.status = "done";
      saveHistory(d);
    } catch (e) {
      if (d.fallback) return; // the saved result was used instead; nothing to report
      d.status = "failed"; d.error = errorCopy(e?.code);
      if (e?.code === "not_granted" || e?.code === "sampling_disabled") { queue.length = 0; }
    } finally {
      clearInterval(d.timer);
    }
    render();
  }

  // Funding commitments: say plainly when money is not confirmed, and count days to expiry in code.
  function commitBanner(d) {
    if (d.result?.doc_type !== "funding_commitment") return "";
    const st = String(val(d, "commitment_status") || "unknown").toLowerCase();
    const exp = String(val(d, "expiration_date") || "");
    let when = "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(exp)) {
      const days = Math.ceil((new Date(exp + "T23:59:59") - new Date()) / 864e5);
      when = days < 0 ? ` <b>Expired ${-days} days ago.</b>` : ` Expires in <b>${days} days</b> (${esc(exp)}).`;
    }
    if (st === "committed") return `<div class="alert ok"><b>Committed money.</b> Check the funding agreement is signed before counting it.${when}</div>`;
    return `<div class="alert bad notconf"><b>Not confirmed money.</b> This is ${esc(st === "unknown" ? "not clearly committed" : st)}: it only arrives if the conditions are met, so it is not counted as closing the gap.${when}</div>`;
  }

  function errorCopy(code) {
    return ({
      cancelled: "Stopped.",
      not_granted: "Claude was not allowed for this page. Allow it from the page's Permissions menu to read documents.",
      sampling_disabled: "Claude is not available for this account.",
      rate_limited: "Too many requests right now. Wait a minute, then add the file again.",
      image_rejected: "This file could not be read as an image. Try a PDF, JPG or PNG under 20 MB.",
      images_unavailable: "This view cannot send images to Claude. Use a PDF with a text layer.",
      pdf_unavailable: "The PDF reader did not load. Check your connection and reload the page.",
      empty_document: "No text or pages found in this file.",
      invalid_json: "Claude's answer could not be read. Remove the file and add it again.",
      refused: "Claude declined to read this file.",
      prompt_too_large: "This document is too long. Upload only the pages that matter.",
    })[code] || "Reading failed. Remove the file and try again.";
  }

  // ---------- derived values (code, not model) ----------
  const val = (d, k) => { const f = d.result?.fields?.find(x => x.key === k); return f && !f.redacted ? f.value : null; };
  const num = v => { const x = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/[$,\s]/g, "")); return isFinite(x) ? x : null; };
  const days = (a, b) => (new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 864e5 + 1;

  function payMonthly(d) {
    const ytd = num(val(d, "ytd_gross")), thru = val(d, "ytd_through_date"), hire = val(d, "hire_date");
    const per = PERIODS[String(val(d, "pay_frequency") || "").toLowerCase()];
    const gross = num(val(d, "gross_this_period"));
    if (ytd && thru && /^\d{4}-\d{2}-\d{2}$/.test(thru)) {
      const jan1 = thru.slice(0, 4) + "-01-01";
      const start = hire && /^\d{4}-\d{2}-\d{2}$/.test(hire) && hire > jan1 ? hire : jan1;
      const n = days(start, thru);
      if (n > 14) return { monthly: ytd / n * 365 / 12, how: `${money(ytd)} year-to-date \u00f7 ${Math.round(n)} days \u00d7 365 \u00f7 12` };
    }
    if (gross && per) return { monthly: gross * per / 12, how: `${money(gross)} \u00d7 ${per} paychecks \u00f7 12` };
    return null;
  }

  function applyPlan(d) {
    const t = d.result?.doc_type, plan = [];
    if (t === "development_budget") {
      const homes = num(val(d, "homes")), total = num(val(d, "total_development_cost"));
      const per = num(val(d, "cost_per_home")) ?? (total && homes ? total / homes : null);
      if (per) plan.push(["cost", per, `Cost per home ${money(per)}${val(d, "cost_per_home") == null && total ? ` (${money(total)} \u00f7 ${homes})` : ""}`]);
      if (homes) plan.push(["homes", Math.round(homes), `Homes ${Math.round(homes)}`]);
    }
    if (t === "loan_estimate" || t === "purchase_contract") {
      const price = num(val(d, "sale_price")), hoa = num(val(d, "hoa_monthly")), rate = num(val(d, "interest_rate"));
      const loan = num(val(d, "loan_amount"));
      if (price) plan.push(["cost", price, `Cost ${money(price)} (sale price)`]);
      if (hoa != null) plan.push(["hoa", hoa, `HOA ${money(hoa)}/month`]);
      if (price && loan && loan < price) { const dp = Math.round((1 - loan / price) * 1000) / 10; plan.push(["down", dp, `Down payment ${dp}%`]); }
      if (rate) plan.push(["rate", rate, `Rate ${rate}% (custom)`]);
    }
    if (t === "funding_commitment") {
      const total = num(val(d, "amount_total")), homes = num(val(d, "homes"));
      const per = num(val(d, "amount_per_home")) ?? (total && homes ? total / homes : total);
      if (per) {
        const st = String(val(d, "commitment_status") || "").toLowerCase();
        const status = st === "committed" ? "confirmed" : (st === "conditional" || st === "pending") ? "pending" : "unconfirmed";
        const exp = val(d, "expiration_date");
        plan.push(["source", { name: [val(d, "funder_name"), val(d, "program_name")].filter(Boolean).join(": ") || d.name,
          type: TYPES.includes(val(d, "funder_type")) ? val(d, "funder_type") : "City", status, amount: Math.round(per),
          src: `${d.name}${exp ? `, expires ${exp}` : ""}` },
          `Add source ${money(per)}/home, status ${STATUSES[status].toLowerCase()}`]);
      }
    }
    return plan;
  }

  function apply(d) {
    for (const [k, v] of applyPlan(d)) {
      if (k === "source") { sources.push(v); (d.addedSources ||= []).push(v); renderSources(); }
      else if (k === "rate") { $("rateMode").value = "custom"; $("customRate").value = v; }
      else $(k).value = v;
    }
    d.applied = true; calc(); render();
    // Show the audience where the money landed: scroll to the gap bar and highlight the new piece.
    if (applyPlan(d).some(p => p[0] === "source")) {
      $("sharedTop").scrollIntoView({ behavior: "smooth", block: "start" });
      const seg = document.querySelector("#bar .seg-pend") || document.querySelector("#bar .seg-ok");
      if (seg) { seg.classList.remove("flash"); void seg.offsetWidth; seg.classList.add("flash"); }
    }
  }

  // ---------- household match (pay stubs + bank statements) ----------
  function household() {
    const stubs = docs.filter(d => d.result?.doc_type === "pay_stub");
    if (!stubs.length) return "";
    const people = new Map();
    for (const d of stubs) {
      const m = payMonthly(d); if (!m) continue;
      const who = String(val(d, "person_name") || d.name);
      if (!people.has(who)) people.set(who, { who, ...m, file: d.name }); // first stub per person
    }
    if (!people.size) return `<p class="small muted">Pay stubs found, but no year-to-date or per-check pay to work from.</p>`;
    const monthly = [...people.values()].reduce((a, p) => a + p.monthly, 0);
    const annual = monthly * 12;
    const hh = Math.min(8, Math.max(1, Math.round(parseFloat($("beds").value) || 0) + 1));
    const t = LIMIT_TABLES.find(x => x.id === $("tableId").value);
    const rows = t.rows ? Object.entries(t.rows).filter(([k]) => k !== "Median") : [];
    const fits = rows.filter(([, v]) => annual <= v[hh - 1]).sort((a, b) => a[1][hh - 1] - b[1][hh - 1]);
    const debts = docs.filter(d => d.result?.doc_type === "bank_statement").map(d =>
      ["auto_loan_payment", "credit_card_payment", "pay_later_monthly_total"].reduce((a, k) => a + (num(val(d, k)) || 0), 0));
    return `<h3>Household on file</h3>
      <div class="calc">${[...people.values()].map(p => `${esc(p.who)}: <b>${money(p.monthly)}</b>/month = ${esc(p.how)} <span class="muted">(${esc(p.file)})</span>`).join("<br>")}
      <br>Household gross: <b>${money(monthly)}</b>/month = <b>${money(annual)}</b>/year
      ${debts.length ? `<br>Monthly debts on the bank statement (auto, card, pay-later): <b>${money(debts[0])}</b>` : ""}
      <br>${t.rows ? (fits.length ? `Under the <b>${esc(fits[0][0])}</b> limit for ${hh} people (${money(fits[0][1][hh - 1])}) in ${esc(t.name)}`
        : `Above every limit in ${esc(t.name)} for ${hh} people`) : "The selected table has no values."}</div>
      <p class="small muted" style="margin-top:6px">Household size comes from the Bedrooms field (${hh} people). Program income rules differ: this is a first check, not an eligibility decision.</p>`;
  }

  // ---------- render ----------
  function render() {
    $("docClear").hidden = !docs.length;
    $("docList").innerHTML = docs.map(d => {
      const r = d.result, plan = r ? applyPlan(d) : [];
      const pill = d.status === "done" ? `<span class="pill ok">${esc(TYPE_NAMES[r.doc_type] || r.doc_type)}</span>`
        : d.status === "failed" ? `<span class="pill bad">Not read</span>`
        : d.status === "reading" ? `<span class="pill info">Reading\u2026</span>` : `<span class="pill info">Waiting</span>`;
      return `<article class="doc" id="doc-${d.id}">
        <header><div class="docname">${esc(d.name)}</div><div class="dochead">${pill}<button class="linkbtn" data-view="${d.id}">View</button><button class="x" data-remove="${d.id}" aria-label="Remove ${esc(d.name)}" title="Remove this document">\u00d7</button></div></header>
        ${d.status === "reading" ? `<p class="small muted">Claude is reading this file… <span class="num" id="tick-${d.id}">${Math.round((Date.now() - d.start) / 1000)}</span> s. <button class="linkbtn" data-stop="${d.id}">Stop</button> <span id="fb-${d.id}"></span></p>` : ""}
        ${d.status === "failed" ? `<p class="small">${esc(d.error)}${savedFor(d) ? ` <button class="linkbtn" data-saved="${d.id}">Use saved result</button>` : ""}</p>` : ""}
        ${d.fromSaved ? `<p class="small"><span class="pill warn">Saved from an earlier read</span> ${esc(new Date(d.fromSaved).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }))}</p>` : ""}
        ${r ? commitBanner(d) : ""}
        ${r ? `<p class="docsum">${esc(r.summary)}</p>
          <div class="tablebox"><table class="facts"><tbody>${r.fields.map(f => `<tr><td>${esc(f.label || f.key)}</td>
            <td class="r num">${f.redacted ? `<span class="pill warn">Redacted</span>` : esc(typeof f.value === "number" ? f.value.toLocaleString("en-US") : f.value ?? "\u2013")}</td>
            <td class="quote">${f.evidence ? `\u201c${esc(f.evidence)}\u201d` : ""}</td></tr>`).join("")}</tbody></table></div>
          ${r.flags?.length ? `<ul class="docflags">${r.flags.map(f => `<li class="${f.severity === "high" ? "high" : ""}">${esc(f.text)}${f.evidence ? ` <span class="quote">\u201c${esc(f.evidence)}\u201d</span>` : ""}</li>`).join("")}</ul>` : ""}
          ${plan.length ? `<div class="applyrow"><button class="primary" data-apply="${d.id}" ${d.applied ? "disabled" : ""}>${d.applied ? "Applied" : "Apply to calculator"}</button>
            <span class="small muted">${plan.map(p => esc(p[2])).join(" \u00b7 ")}</span></div>` : ""}` : ""}
      </article>`;
    }).join("");
    $("docHousehold").innerHTML = household();
  }
  $("docList").addEventListener("click", e => {
    const a = e.target.dataset.apply, s = e.target.dataset.stop, r = e.target.dataset.remove;
    if (a) apply(docs.find(d => d.id === a));
    if (s) docs.find(d => d.id === s)?.ctl?.abort();
    if (r) remove(r);
    if (e.target.dataset.saved) useSaved(docs.find(d => d.id === e.target.dataset.saved));
    if (e.target.dataset.view) view(docs.find(d => d.id === e.target.dataset.view));
  });

  // Show the original file in a full-screen viewer. PDFs are drawn page by page with pdf.js.
  let viewUrl = null, viewToken = 0;
  async function view(d) {
    if (!d) return;
    const dlg = $("docViewer"), body = $("docViewerBody"), token = ++viewToken;
    $("docViewerTitle").textContent = d.name;
    body.replaceChildren();
    if (viewUrl) { URL.revokeObjectURL(viewUrl); viewUrl = null; }
    if (!dlg.open) dlg.showModal();
    const isPdf = /pdf/i.test(d.file.type) || /\.pdf$/i.test(d.name);
    if (!isPdf) {
      viewUrl = URL.createObjectURL(d.file);
      const img = document.createElement("img");
      img.src = viewUrl; img.alt = d.name; img.className = "docpage";
      body.append(img);
      return;
    }
    if (!window.pdfjsLib) { body.textContent = "The PDF reader did not load. Reload the page and try again."; return; }
    const status = document.createElement("p");
    status.className = "small muted"; status.textContent = "Loading pages\u2026";
    body.append(status);
    try {
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await d.file.arrayBuffer()) }).promise;
      const width = Math.min(body.clientWidth || 800, 900);
      for (let p = 1; p <= pdf.numPages; p++) {
        if (token !== viewToken || !dlg.open) return;
        const page = await pdf.getPage(p);
        const vp0 = page.getViewport({ scale: 1 });
        const scale = width / vp0.width * Math.min(2, window.devicePixelRatio || 1);
        const vp = page.getViewport({ scale });
        const cv = document.createElement("canvas");
        cv.width = vp.width; cv.height = vp.height; cv.className = "docpage";
        cv.setAttribute("aria-label", `${d.name}, page ${p} of ${pdf.numPages}`);
        const ctx = cv.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height);
        await page.render({ canvasContext: ctx, viewport: vp }).promise;
        body.append(cv);
      }
      status.textContent = `${pdf.numPages} ${pdf.numPages === 1 ? "page" : "pages"}`;
    } catch {
      status.textContent = "This PDF could not be shown.";
    }
  }
  // ---------- history: saved in this browser only (IndexedDB) ----------
  // Every call is wrapped: storage can be blocked (private window, cleared data). The page works without it.
  const DB_NAME = "gap-ledger", STORE = "docs";
  let dbp = null, history = [];
  function openDb() {
    if (!dbp) dbp = new Promise((res, rej) => {
      try {
        const r = indexedDB.open(DB_NAME, 1);
        r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: "id" });
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      } catch (e) { rej(e); }
    });
    return dbp;
  }
  async function tx(mode, fn) {
    const db = await openDb();
    return new Promise((res, rej) => {
      const t = db.transaction(STORE, mode), st = t.objectStore(STORE), out = fn(st);
      t.oncomplete = () => res(out?.result); t.onerror = () => rej(t.error);
    });
  }
  async function loadHistory() {
    try { history = (await tx("readonly", st => st.getAll())) || []; }
    catch { history = null; }
    renderHistory();
  }
  async function saveHistory(d) {
    const entry = { id: d.id, name: d.name, type: d.file.type, size: d.file.size, savedAt: new Date().toISOString(),
      blob: d.file, result: d.result };
    try { await tx("readwrite", st => st.put(entry)); d.saved = true; }
    catch { d.saved = false; }
    await loadHistory();
  }
  async function deleteHistory(id) {
    try { await tx("readwrite", st => st.delete(id)); } catch { /* ignore */ }
    await loadHistory();
  }

  function renderHistory() {
    const unavailable = history === null, list = (history || []).slice().sort((a, b) => b.savedAt.localeCompare(a.savedAt));
    $("histCount").textContent = list.length ? `(${list.length})` : "";
    $("histClearAll").hidden = !list.length;
    $("histTools").hidden = !list.length;
    $("histTable").hidden = !list.length;
    $("histEmpty").hidden = !!list.length;
    $("histEmpty").textContent = unavailable
      ? "History is not available in this browser (storage is blocked, for example in a private window). Documents still work on the Documents tab."
      : "No documents yet. Read a document on the Documents tab and it will show up here.";
    const types = [...new Set(list.map(h => h.result?.doc_type).filter(Boolean))];
    const sel = $("histType"), cur = sel.value;
    sel.innerHTML = `<option value="">All types</option>` + types.map(t => `<option value="${esc(t)}">${esc(TYPE_NAMES[t] || t)}</option>`).join("");
    sel.value = types.includes(cur) ? cur : "";
    const q = $("histSearch").value.trim().toLowerCase();
    const shown = list.filter(h => (!sel.value || h.result?.doc_type === sel.value) &&
      (!q || [h.name, TYPE_NAMES[h.result?.doc_type], h.result?.summary, h.result?.title].join(" ").toLowerCase().includes(q)));
    const fmt = iso => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
    $("histRows").innerHTML = shown.length ? shown.map(h => `<tr>
      <td class="num" style="white-space:nowrap">${esc(fmt(h.savedAt))}</td>
      <td style="overflow-wrap:anywhere">${esc(h.name)}</td>
      <td><span class="pill ok">${esc(TYPE_NAMES[h.result?.doc_type] || "Document")}</span></td>
      <td class="sum">${esc(h.result?.summary || "")}</td>
      <td><div class="acts"><button class="linkbtn" data-hview="${h.id}">View</button>
        <button class="linkbtn" data-hrestore="${h.id}">Add to calculator</button>
        <button class="linkbtn" data-hdelete="${h.id}">Delete</button></div></td></tr>`).join("")
      : `<tr><td colspan="5" class="muted">No saved documents match.</td></tr>`;
  }

  $("histRows").addEventListener("click", async e => {
    const t = e.target.dataset, h = (history || []).find(x => x.id === (t.hview || t.hrestore || t.hdelete));
    if (!h) return;
    const file = new File([h.blob], h.name, { type: h.type || h.blob.type });
    if (t.hview) view({ file, name: h.name });
    if (t.hrestore) {
      if (docs.some(d => d.id === h.id)) { $("histNote").textContent = `${h.name} is already on the Documents tab.`; return; }
      docs.push({ id: h.id, file, name: h.name, status: "done", result: h.result, error: "", applied: false, saved: true });
      render();
      $("histNote").textContent = `Added ${h.name} to the Documents tab without reading it again. Click Apply there to use its values.`;
    }
    if (t.hdelete) {
      await deleteHistory(h.id);
      $("histNote").textContent = `Deleted ${h.name} from history.`;
    }
  });
  // Delete all needs two clicks: the viewer's frame does not show confirm() dialogs.
  let clearArmed = false;
  $("histClearAll").addEventListener("click", async () => {
    if (!clearArmed) {
      clearArmed = true; $("histClearAll").textContent = "Click again to delete everything";
      setTimeout(() => { clearArmed = false; $("histClearAll").textContent = "Delete all history"; }, 4000);
      return;
    }
    clearArmed = false; $("histClearAll").textContent = "Delete all history";
    try { await tx("readwrite", st => st.clear()); } catch { /* ignore */ }
    await loadHistory();
    $("histNote").textContent = "Deleted all saved documents from this browser.";
  });
  $("histSearch").addEventListener("input", renderHistory);
  $("histType").addEventListener("input", renderHistory);

  // ---------- tabs (hash routing: #calculator, #documents, #options, #map, #history) ----------
  function route() {
    const view = { "#history": "history", "#map": "map", "#documents": "docs", "#options": "opts", "#plan": "plan", "#involved": "inv" }[location.hash] || "calc";
    const set = (tab, sec, on) => { $(sec).hidden = !on; if (on) $(tab).setAttribute("aria-current", "page"); else $(tab).removeAttribute("aria-current"); };
    set("tabCalc", "calcView", view === "calc");
    set("tabDocs", "docsView", view === "docs");
    set("tabOpts", "optsView", view === "opts");
    set("tabPlan", "planView", view === "plan");
    set("tabInv", "involvedView", view === "inv");
    set("tabMap", "mapView", view === "map");
    set("tabHist", "historyView", view === "history");
    // The gap summary stays on top of the three tabs that change it.
    $("sharedTop").hidden = !["calc", "docs", "opts", "plan"].includes(view);
    if (view === "plan") window.renderPlan?.();
    if (view === "inv") window.renderInvolved?.();
    if (view === "history") loadHistory();
    if (view === "map") window.drawMap?.();
  }
  window.addEventListener("hashchange", route);
  route();
  loadHistory();

  $("docViewerClose").addEventListener("click", () => $("docViewer").close());
  $("docViewer").addEventListener("click", e => { if (e.target === $("docViewer")) $("docViewer").close(); });
  $("docViewer").addEventListener("close", () => { viewToken++; if (viewUrl) { URL.revokeObjectURL(viewUrl); viewUrl = null; } });

  // Remove one document. A funding source it added is removed too; other values it set stay in place.
  function remove(id) {
    const d = docs.find(x => x.id === id); if (!d) return;
    d.ctl?.abort();
    const qi = queue.indexOf(d); if (qi >= 0) queue.splice(qi, 1);
    docs = docs.filter(x => x !== d);
    let note = `Removed ${d.name}.`;
    if (d.addedSources?.length) {
      for (const s of d.addedSources) { const i = sources.indexOf(s); if (i >= 0) sources.splice(i, 1); }
      renderSources(); calc();
      note += " Its funding source was removed from the stack.";
    }
    if (d.applied && applyPlan(d).some(p => p[0] !== "source"))
      note += " Values it set in the calculator (such as cost or HOA) stay. Edit them or click Reset sample at the bottom.";
    $("docNote").textContent = note;
    render();
  }
  ["beds", "tableId"].forEach(id => $(id).addEventListener("input", () => { $("docHousehold").innerHTML = household(); }));
})();
