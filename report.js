// PDF report of the calculator: the same numbers the page shows, with the formula lines and sources.
// Text comes from what the page already rendered (summary strip, formula boxes, rate table, funding stack),
// so the PDF can never disagree with the screen. Uses jsPDF (MIT, vendor/jspdf.umd.min.js).
// On claude.ai the file is offered through the downloads capability; elsewhere through a normal browser download.
(() => {
  const $ = id => document.getElementById(id);
  const btn = $("pdfBtn"), note = $("pdfNote");
  if (!btn) return;
  let downloads = null;
  (async () => {
    try { downloads = window.claude ? await window.claude.use("downloads") : null; } catch { downloads = null; }
  })();

  // jsPDF's built-in fonts are Latin-1 only: map the few other symbols the page uses.
  const clean = s => String(s ?? "")
    .replace(/−/g, "-").replace(/[–—]/g, "-").replace(/×/g, "x").replace(/÷/g, "/")
    .replace(/→/g, "->").replace(/≈/g, "~").replace(/≤/g, "<=").replace(/≥/g, ">=")
    .replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/…/g, "...").replace(/·/g, "|")
    .replace(/⤴|⤢/g, "").replace(/[^\x09\x0a\x0d\x20-\x7e\xa0-\xff]/g, "");
  const text = id => clean(($(id)?.innerText || "").trim());
  const lines = id => text(id).split("\n").map(s => s.trim()).filter(Boolean);
  const money = x => "$" + Math.round(Math.max(0, x)).toLocaleString("en-US");

  function build() {
    const L = window.LAST;
    if (!L || !window.jspdf) throw new Error("not ready");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 50, CW = W - 2 * M;
    const ORANGE = [255, 135, 16], INK = [43, 41, 37], MUTED = [102, 99, 92], LINE = [231, 226, 215];
    let y = M;
    const need = h => { if (y + h > H - M) { doc.addPage(); y = M; } };
    const para = (s, { size = 10, color = INK, bold = false, gap = 4, indent = 0 } = {}) => {
      doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setFontSize(size); doc.setTextColor(...color);
      for (const ln of doc.splitTextToSize(clean(s), CW - indent)) { need(size * 1.35); doc.text(ln, M + indent, y + size); y += size * 1.35; }
      y += gap;
    };
    const head = s => { y += 8; need(80); doc.setDrawColor(...ORANGE); doc.setLineWidth(2); doc.line(M, y, M + 24, y); y += 6; para(s, { size: 13, bold: true, gap: 2 }); };
    const table = (cols, rows, widths, { boldRow = -1 } = {}) => {
      const x0 = M, rowH = 16;
      const row = (cells, bold, fill) => {
        need(rowH);
        if (fill) { doc.setFillColor(...fill); doc.rect(x0, y, CW, rowH, "F"); }
        doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setFontSize(9); doc.setTextColor(...INK);
        let x = x0;
        cells.forEach((c, i) => {
          const w = widths[i] * CW, right = i > 0 && /^([-+]?\$?[\d,.]+%?|-)$/.test(c.trim());
          const t = doc.splitTextToSize(clean(c), w - 8)[0] || "";
          doc.text(t, right ? x + w - 4 : x + 4, y + 11, { align: right ? "right" : "left" });
          x += w;
        });
        doc.setDrawColor(...LINE); doc.setLineWidth(0.5); doc.line(x0, y + rowH, x0 + CW, y + rowH);
        y += rowH;
      };
      need(rowH * 2); // keep the header with at least one row
      row(cols, true, [244, 240, 232]);
      rows.forEach((r, i) => row(r, i === boldRow, i === boldRow ? [255, 240, 224] : null));
      y += 8;
    };

    // Title block
    doc.setFillColor(...ORANGE); doc.rect(0, 0, W, 6, "F");
    para("OCMEE Affordable Homes Program", { size: 9, color: ORANGE, bold: true, gap: 0 });
    para("Gap report: does this home pencil?", { size: 20, bold: true, gap: 2 });
    const when = new Date().toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    para(`Made ${when}. Sample inputs unless you changed them. Not legal or lending advice.`, { size: 9, color: MUTED, gap: 10 });

    // Summary strip, straight from the page
    head("Summary");
    const sum = [["Cost to create one home", "sCost", "sCostF"], ["Affordable price (capped)", "sPrice", "sPriceF"],
      ["Gap per home", "sGap", "sGapF"], ["Still open after confirmed sources", "sOpen", "sOpenF"]];
    table(["Item", "Amount", "Note"], sum.map(([k, v, f]) => [k, text(v), text(f)]), [0.42, 0.2, 0.38], { boldRow: 2 });
    const plain = text("plainText");
    if (plain) para("What this means: " + plain, { size: 10, gap: 6 });

    head("Household and income limits");
    lines("limitCalc").filter(s => !/^Open source PDF/.test(s)).forEach(s => para(s, { size: 9.5, gap: 1 }));

    head("How the price cap is worked out");
    lines("capCalc").forEach(s => para(s, { size: 9.5, gap: 1 }));
    para("Formula: California Health and Safety Code 50052.5. Household size = bedrooms + 1.", { size: 8.5, color: MUTED, gap: 4 });

    head("Mortgage rate and sensitivity");
    para(text("rateNote"), { size: 9, color: MUTED, gap: 4 });
    const sens = [...document.querySelectorAll("#sens tbody tr")].map(tr => [...tr.cells].map(td => clean(td.innerText.trim())));
    table(["Rate", "Affordable price", "Gap per home", "Change"], sens, [0.25, 0.25, 0.25, 0.25], { boldRow: sens.findIndex(r => /now/.test(r[0])) });

    head("Who closes the gap (funding stack)");
    const STAT = { confirmed: "Confirmed", pending: "Pending", unconfirmed: "Not confirmed" };
    const src = (typeof sources !== "undefined" ? sources : []).filter(s => s.name || s.amount);
    if (src.length) {
      table(["Source", "Type", "Status", "Per home", "Where the number comes from"],
        src.map(s => [s.name || "(unnamed)", s.type, STAT[s.status] || s.status, money(s.amount || 0), s.src || ""]), [0.27, 0.15, 0.15, 0.13, 0.30]);
    } else para("No sources entered yet.", { size: 9.5 });
    para(`Confirmed: ${money(L.conf)} per home. Still open: ${money(L.open)} per home${L.homes > 1 ? `, ${money(L.open * L.homes)} across ${L.homes} homes` : ""}. Only confirmed money counts as closing the gap.`, { size: 9.5, gap: 4 });

    const donor = text("donorText");
    if (donor) { head("What a gift closes"); para(donor, { size: 9.5 }); }

    if (window.DOC_HH && window.DOC_HH.annual) {
      head("Household income from documents");
      para(`About ${money(window.DOC_HH.annual)} a year for ${window.DOC_HH.size} people, worked out from the documents read on this page. Check every number against the originals.`, { size: 9.5 });
    }

    head("Sources");
    para(text("srcList"), { size: 9, color: MUTED });
    para("Every number here comes from a published table, a document, or a calculation shown above. Programs set their own rules; " +
      "a housing counselor or lender must confirm eligibility. Find a HUD-approved counselor: consumerfinance.gov/find-a-housing-counselor", { size: 9, color: MUTED });

    // Footer with page numbers
    const pages = doc.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p); doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...MUTED);
      doc.text(`OCMEE Affordable Homes Program | Gap report | page ${p} of ${pages}`, M, H - 24);
    }
    return doc;
  }

  btn.addEventListener("click", async () => {
    btn.disabled = true; note.textContent = "Making the PDF...";
    try {
      const doc = build();
      const stamp = new Date().toISOString().slice(0, 10);
      const filename = `gap-report-${stamp}.pdf`;
      const blob = doc.output("blob");
      if (downloads) {
        try { await downloads.save({ filename, data: blob }); note.textContent = "Saved " + filename + "."; }
        catch (e) { note.textContent = e && e.code === "declined" ? "Download cancelled." : "Downloads are not available here."; }
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob); a.download = filename; document.body.append(a); a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
        note.textContent = "Downloaded " + filename + ".";
      }
    } catch (e) {
      note.textContent = "Could not make the PDF. Reload the page and try again.";
      console.error(e);
    } finally { btn.disabled = false; }
  });
  window.buildGapReport = build;
})();
