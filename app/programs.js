// Program atlas: a small radial map of programs and loan types for the current household.
// Status rules are deliberately simple and explained on click. "May fit" never means approved.
// Income limits come from the 2026 State Income Limits table already in limits.js; everything else defaults to "check".
(() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const money = x => "$" + Math.round(Math.max(0, x)).toLocaleString("en-US");
  const k = x => "$" + Math.round(x / 1000) + "K";
  let picked = null;

  // Household: documents on file win; otherwise the co-buyer card on Ways to shrink the gap (sample: Herreras).
  function household() {
    if (window.DOC_HH && window.DOC_HH.annual) return { ...window.DOC_HH, from: "documents on file" };
    const n = id => parseFloat($(id)?.value) || 0;
    return { annual: n("cb1Inc") + n("cb2Inc"), size: Math.min(8, Math.max(1, Math.round(n("cb1Size") + n("cb2Size")))), gig: false, from: "Ways to shrink the gap tab" };
  }

  function programs(hh) {
    const t = LIMIT_TABLES.find(x => x.id === "state-2026-rev").rows;
    const low = t["Low (80%)"][hh.size - 1], mod = t["Moderate (120%)"][hh.size - 1];
    const L = window.LAST, price = L ? Math.min(L.m.price, L.m.cost) : 0;
    const under80 = hh.annual <= low, under120 = hh.annual <= mod;
    const lim80 = `${money(hh.annual)} vs about ${money(low)} (80% limit, ${hh.size} people, 2026 State table)`;
    const P = (hub, name, st, why, verify) => ({ hub, name, st, why, verify });
    return [
      P("dp", "CalHFA MyHome", under120 ? "fit" : "check", under120 ? `Deferred down-payment loan. Income looks under the moderate range: ${money(hh.annual)} vs ${money(mod)}. CalHFA uses its own limits.` : "Income may be above CalHFA limits.", "CalHFA-approved lender"),
      P("dp", "Dream For All", "check", "Shared appreciation loan. Needs a first-generation buyer and an open funding round.", "CalHFA (check if a round is open)"),
      P("dp", "City help", under80 ? "check" : "no", under80 ? `City silent seconds usually need income under 80%: ${lim80}. Funds are often limited: confirm they are available.` : `Income is above the usual 80% city limit: ${lim80}.`, "City housing division"),
      P("dp", "County MAP", under80 ? "check" : "no", under80 ? `County down-payment loans usually need income under 80%. ${lim80}. Funding is not confirmed.` : `Income is above the usual 80% limit. ${lim80}.`, "County housing department"),
      P("loan", "FHA", "fit", "No income cap; 3.5% down; mortgage insurance for the life of most loans.", "Any FHA lender"),
      P("loan", "Conventional", "fit", "Standard loan, as low as 3% down for first-time buyers with good credit.", "Any lender"),
      P("loan", "HomeReady", under80 ? "fit" : "no", under80 ? `Low-down-payment loan with income under 80% of area median: ${lim80}.` : `Income is above the 80% cap: ${lim80}.`, "Fannie Mae lenders"),
      P("loan", "CalHFA loan", under120 ? "fit" : "check", "State first mortgage, pairs with MyHome or Dream For All.", "CalHFA-approved lender"),
      P("loan", "GSFA", "check", "Golden State Finance Authority programs. Terms and limits change: check before counting.", "GSFA-approved lender"),
      P("loan", "VA", "check", "Only for veterans, service members and some spouses. Ask the family.", "VA lender"),
      P("loan", "Rate buydown", "check", "Lowers the rate for a cost up front. Try it on Ways to shrink the gap.", "Seller, builder or program"),
      P("loan", "ARM", "check", "Lower first rate, but the payment can rise. Risky on a tight budget.", "Housing counselor"),
      P("loan", "Non-QM", hh.gig ? "check" : "no", hh.gig ? "For irregular or gig income lenders cannot document the usual way. Usually more expensive." : "For income that cannot be documented the usual way. Higher cost; not needed here.", "Specialty lender"),
      P("loan", "USDA", "no", "Rural areas only; most of Orange County is not eligible (likely).", "USDA eligibility map"),
      P("loan", "Jumbo", "no", `Only for very large loans. This home's affordable price is about ${money(price)}.`, "Lender"),
      P("np", "Habitat OC", under80 ? "fit" : "no", under80 ? `Sweat-equity homeownership, usually for incomes about 30% to 80% of area median: ${lim80}.` : `Usually for incomes under 80%: ${lim80}.`, "Habitat for Humanity of Orange County"),
      P("np", "Land trust", under120 ? "check" : "no", "Below-market homes with a resale cap. Waitlists vary.", "Community land trust"),
      P("np", "Counseling", "fit", "Free or low-cost HUD-approved homebuyer counseling. Most programs require it.", "consumerfinance.gov counselor finder"),
    ];
  }

  function render() {
    if (!$("progSvg") || ($("mapView").hidden && !$("progDialog").open)) return;
    const hh = household(), list = programs(hh);
    const W = 700, H = 480, cx = 330, cy = 220;
    // Hubs sit around the household; each hub's programs fan out in an arc pointing away from the center.
    const HUBS = { dp: { name: "Down payment help", x: 195, y: 125, span: 150, r: [76, 76] },
                   loan: { name: "Loan types", x: 490, y: 205, span: 280, r: [76, 112] },
                   np: { name: "Nonprofit path", x: 320, y: 372, span: 130, r: [72, 72] } };
    let h = `<defs><radialGradient id="pg" r="0.6"><stop offset="0" stop-color="var(--accent-soft)"/><stop offset="1" stop-color="var(--surface)" stop-opacity="0"/></radialGradient></defs>
      <rect width="${W}" height="${H}" fill="url(#pg)"/>`;
    const nodes = [];
    for (const [key, hub] of Object.entries(HUBS)) {
      const leaves = list.filter(p => p.hub === key), n = leaves.length;
      const away = Math.atan2(hub.y - cy, hub.x - cx) * 180 / Math.PI;
      leaves.forEach((p, i) => {
        const deg = away - hub.span / 2 + hub.span * (n === 1 ? 0.5 : i / (n - 1)), a = deg * Math.PI / 180;
        const r = hub.r[i % 2];
        const x = hub.x + Math.cos(a) * r, y = hub.y + Math.sin(a) * r, c = Math.cos(a);
        nodes.push({ ...p, x, y, hx: hub.x, hy: hub.y, anchor: c > 0.25 ? "start" : c < -0.25 ? "end" : "middle", dy: Math.sin(a) });
      });
      const anyFit = leaves.some(p => p.st === "fit");
      h += `<line x1="${cx}" y1="${cy}" x2="${hub.x}" y2="${hub.y}" class="pl ${anyFit ? "fit" : "no"}"/>`;
    }
    for (const p of nodes) h += `<line x1="${p.hx}" y1="${p.hy}" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}" class="pl ${p.st}"/>`;
    for (const [key, hub] of Object.entries(HUBS)) {
      // Hub name on the side facing the household, away from its own programs.
      const ang = Math.atan2(hub.y - cy, hub.x - cx), lx = hub.x - Math.cos(ang) * 30, ly = hub.y - Math.sin(ang) * 30 + 5;
      h += `<circle cx="${hub.x}" cy="${hub.y}" r="15" class="phub"/><text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" class="phubl">${hub.name}</text>`;
    }
    for (const p of nodes) {
      const lx = p.anchor === "start" ? p.x + 12 : p.anchor === "end" ? p.x - 12 : p.x;
      const ly = p.anchor === "middle" ? p.y + (p.dy > 0 ? 25 : -16) : p.y + 4.5;
      h += `<g class="pn ${p.st}${picked === p.name ? " sel" : ""}" data-p="${esc(p.name)}" tabindex="0" role="button" aria-label="${esc(p.name)}: ${p.st === "fit" ? "may fit" : p.st === "check" ? "to check" : "not for now"}">
        <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${p.st === "no" ? 6 : 9}"/><circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="16" class="hit"/>
        <text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="${p.anchor}">${esc(p.name)}</text></g>`;
    }
    h += `<circle cx="${cx}" cy="${cy}" r="50" class="pcenter-halo"/><circle cx="${cx}" cy="${cy}" r="41" class="pcenter"/>
      <text x="${cx}" y="${cy - 3}" text-anchor="middle" class="pc1">${hh.size} ${hh.size === 1 ? "person" : "people"}</text>
      <text x="${cx}" y="${cy + 15}" text-anchor="middle" class="pc2">${k(hh.annual)}</text>`;
    $("progSvg").innerHTML = h;
    const c = s => list.filter(p => p.st === s).length;
    $("progCount").textContent = `${c("fit")} may fit, ${c("check")} to check, ${c("no")} not for now`;
    $("progFrom").textContent = `Household: ${money(hh.annual)}/year, ${hh.size} people, from the ${hh.from}.`;
    const sel = list.find(p => p.name === picked);
    $("progWhy").innerHTML = sel
      ? `<b>${esc(sel.name)}</b> <span class="pill ${sel.st === "fit" ? "ok" : sel.st === "check" ? "warn" : "bad"}">${sel.st === "fit" ? "May fit" : sel.st === "check" ? "To check" : "Not for now"}</span><br>${esc(sel.why)}<br><span class="muted">Verify with: ${esc(sel.verify)}</span>`
      : "Click a program to see why it is marked this way.";
  }

  const pick = e => { const g = e.target.closest(".pn"); if (g) { picked = g.dataset.p; render(); } };
  $("progSvg").addEventListener("click", pick);
  $("progSvg").addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(e); } });
  // Enlarge: move the whole panel into a dialog (keeps its click handlers), then move it back on close.
  const panel = $("progSvg").closest(".progpanel"), home = panel.parentNode, dlg = $("progDialog");
  function enlarge() {
    if (dlg.open) return;
    $("progDialogBody").append(panel);
    dlg.showModal();
    render();
  }
  $("progBig").addEventListener("click", enlarge);
  // Clicking the atlas (not a program dot) while small opens it large.
  $("progSvg").addEventListener("click", e => { if (!dlg.open && !e.target.closest(".pn")) enlarge(); });
  $("progClose").addEventListener("click", () => dlg.close());
  dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener("close", () => { home.append(panel); render(); });
  window.renderPrograms = render;
  render();
})();
