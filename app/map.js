// Map tab: sample projects on a schematic Orange County map, priced with the calculator's own math.
// The map is drawn here (no map tiles), because the claude.ai viewer blocks images from other sites.
(() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const money = x => (x < 0 ? "\u2212$" : "$") + Math.round(Math.abs(x)).toLocaleString("en-US");
  const H = 640, LNG0 = -118.08, LNG1 = -117.56, LAT0 = 33.40, LAT1 = 33.93;
  // Equirectangular projection with longitude scaled by cos(latitude) so shapes are not stretched.
  const k = Math.cos(33.7 * Math.PI / 180);
  const s = H / (LAT1 - LAT0), W = Math.round((LNG1 - LNG0) * k * s);
  const X = lng => (lng - LNG0) * k * s, Y = lat => (LAT1 - lat) * s;
  // Approximate coastline from Seal Beach to San Clemente (schematic, not survey grade).
  const COAST = [[33.80, -118.25], [33.76, -118.13], [33.74, -118.10], [33.70, -118.05], [33.66, -118.01], [33.63, -117.96],
    [33.61, -117.92], [33.60, -117.88], [33.58, -117.84], [33.54, -117.79], [33.50, -117.75], [33.46, -117.70],
    [33.43, -117.63], [33.38, -117.57]];
  const TOWNS = [["Fullerton", 33.870, -117.925], ["Anaheim", 33.836, -117.914], ["Orange", 33.788, -117.853],
    ["Garden Grove", 33.774, -117.941], ["Santa Ana", 33.745, -117.868], ["Huntington Beach", 33.660, -117.999],
    ["Costa Mesa", 33.641, -117.919], ["Irvine", 33.684, -117.826], ["Newport Beach", 33.618, -117.929],
    ["Mission Viejo", 33.600, -117.672], ["Laguna Beach", 33.542, -117.783], ["San Clemente", 33.427, -117.612],
    ["Yorba Linda", 33.889, -117.813], ["Tustin", 33.746, -117.826], ["Westminster", 33.759, -117.994]];
  const STAGES = ["Looking for land", "Land secured", "Design", "Permits", "Fundraising", "Under construction"];
  let selected = null;

  const TIER_NAME = id => (TIERS.find(t => t.id === id) || {}).name || id;
  function priced(p) {
    const rate = currentRate();
    const m = model(rate, { tier: p.tier, beds: p.beds, cost: p.cost });
    const sum = st => p.sources.filter(x => st.includes(x.status)).reduce((a, x) => a + x.amount, 0);
    const conf = sum(["confirmed"]), pend = sum(["pending", "unconfirmed"]);
    const open = Math.max(0, m.gap - conf);
    const share = p.cost ? open / p.cost : 0;
    const level = open <= 0.5 ? "ok" : share < 0.25 ? "warn" : "bad";
    return { m, conf, pend, open, share, level, rate };
  }

  function draw() {
    const filt = $("mapFilter").value, beds = $("mapBeds").value;
    const list = PROJECTS.filter(p => (!filt || p.tier === filt) && (!beds || String(p.beds) === beds || (beds === "3" && p.beds >= 3)));
    const coastPath = COAST.map(([la, lo], i) => `${i ? "L" : "M"}${X(lo).toFixed(1)} ${Y(la).toFixed(1)}`).join("");
    const ocean = `${coastPath}L${X(-117.2).toFixed(1)} ${H + 400}L-600 ${H + 400}L-600 ${Y(33.80).toFixed(1)}L${X(-118.13).toFixed(1)} ${Y(33.80).toFixed(1)}Z`;
    let h = `<rect x="-600" y="-400" width="${W + 1200}" height="${H + 800}" class="land"/><path d="${ocean}" class="ocean"/><path d="${coastPath}" class="coast"/>`;
    h += `<text x="${X(-118.08)}" y="${Y(33.50)}" class="sea">Pacific Ocean</text>`;
    for (const [nm, la, lo] of TOWNS) {
      if (PROJECTS.some(p => p.city === nm)) continue;
      h += `<circle cx="${X(lo)}" cy="${Y(la)}" r="2.5" class="town"/><text x="${X(lo) + 6}" y="${Y(la) + 4}" class="townl">${esc(nm)}</text>`;
    }
    for (const p of list) {
      const r = priced(p), cx = X(p.lng), cy = Y(p.lat), rad = 9 + Math.sqrt(p.homes) * 2;
      h += `<g class="pin ${r.level}${selected === p.id ? " sel" : ""}" data-id="${p.id}" tabindex="0" role="button"
        aria-label="${esc(p.name)}, ${esc(p.city)}, ${p.homes} homes, open gap ${money(r.open)} per home">
        <title>${esc(p.name)}, ${esc(p.city)}: ${money(r.open)} open per home</title>
        <circle cx="${cx}" cy="${cy}" r="${rad}"/><text x="${cx}" y="${cy + 4}" text-anchor="middle" class="pinn">${p.homes}</text></g>`;
    }
    // Only the selected project gets a text label, drawn last so it sits on top and never blocks other pins.
    const sp = list.find(p => p.id === selected);
    if (sp) {
      const r = priced(sp), cx = X(sp.lng), cy = Y(sp.lat), rad = 9 + Math.sqrt(sp.homes) * 2;
      const right = cx < W - 260, tx = right ? cx + rad + 6 : cx - rad - 6, anchor = right ? "start" : "end";
      h += `<g class="pinlabel"><text x="${tx}" y="${cy - 2}" text-anchor="${anchor}" class="pinl">${esc(sp.name)}</text>
        <text x="${tx}" y="${cy + 13}" text-anchor="${anchor}" class="pins">${esc(sp.city)} \u00b7 ${money(r.open)} open per home</text></g>`;
    }
    $("mapSvg").setAttribute("viewBox", `0 0 ${W} ${H}`);
    $("mapSvg").innerHTML = h;
    // list view (also the accessible / phone-friendly version of the map)
    const sorted = list.map(p => [p, priced(p)]).sort((a, b) => b[1].open - a[1].open);
    $("mapList").innerHTML = sorted.map(([p, r]) => `<tr class="${selected === p.id ? "now" : ""}">
      <td><button class="linkbtn" data-pick="${p.id}">${esc(p.name)}</button><div class="small muted">${esc(p.city)} \u00b7 ${esc(p.stage)}</div></td>
      <td class="r num">${p.homes}</td><td>${p.beds} bd \u00b7 ${esc(TIER_NAME(p.tier))}</td>
      <td class="r num">${money(r.m.gap)}</td><td class="r num"><span class="pill ${r.level === "ok" ? "ok" : r.level === "warn" ? "warn" : "bad"}">${money(r.open)}</span></td></tr>`).join("")
      || `<tr><td colspan="5" class="muted">No sample projects match these filters.</td></tr>`;
    const tot = sorted.reduce((a, [p, r]) => a + r.open * p.homes, 0), homes = sorted.reduce((a, [p]) => a + p.homes, 0);
    $("mapTotals").textContent = `${sorted.length} projects \u00b7 ${homes} homes \u00b7 ${money(tot)} still open across all of them at ${currentRate().toFixed(2)}%`;
    card();
  }

  function card() {
    const p = PROJECTS.find(x => x.id === selected);
    if (!p) { $("mapCard").innerHTML = `<p class="small muted">Select a pin or a row to see the project's gap and funding.</p>`; return; }
    const r = priced(p);
    $("mapCard").innerHTML = `<div class="flexrow"><h3 style="margin:0">${esc(p.name)}</h3><span class="pill info">${esc(p.stage)}</span></div>
      <p class="small muted">${esc(p.city)} \u00b7 ${p.homes} homes \u00b7 ${p.beds} bedrooms \u00b7 ${esc(TIER_NAME(p.tier))} buyers \u00b7 sample project</p>
      <div class="calc">Cost to create one home: <b>${money(p.cost)}</b><br>
        Affordable price (${esc(TIER_NAME(p.tier).toLowerCase())}, ${p.beds + 1} people, ${r.rate.toFixed(2)}%): <b>${money(Math.min(r.m.price, p.cost))}</b><br>
        Gap per home: <b>${money(r.m.gap)}</b><br>
        Confirmed sources: <b>${money(r.conf)}</b>${r.pend ? ` \u00b7 pending or unconfirmed: ${money(r.pend)}` : ""}<br>
        Still open per home: <b>${money(r.open)}</b> \u00b7 project total <b>${money(r.open * p.homes)}</b></div>
      ${p.sources.length ? `<ul class="small" style="margin:8px 0 0;padding-left:18px">${p.sources.map(x => `<li>${esc(x.name)}: ${money(x.amount)}/home, ${esc(STATUSES[x.status].toLowerCase())}</li>`).join("")}</ul>` : `<p class="small" style="margin-top:8px">No funding sources yet.</p>`}
      <div class="applyrow"><button class="primary" id="mapOpen">Open in calculator</button>
        <a class="small" href="https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=13/${p.lat}/${p.lng}" target="_blank" rel="noopener">See ${esc(p.city)} on OpenStreetMap</a></div>`;
    $("mapOpen").onclick = () => {
      $("cost").value = p.cost; $("beds").value = p.beds; $("tier").value = p.tier; $("homes").value = p.homes;
      sources.splice(0, sources.length, ...p.sources.map(x => ({ ...x })));
      renderSources(); calc();
      location.hash = "#calculator";
      window.scrollTo(0, 0);
    };
  }

  $("mapSvg").addEventListener("click", e => { const g = e.target.closest(".pin"); if (g) { selected = g.dataset.id; draw(); } });
  $("mapSvg").addEventListener("keydown", e => { const g = e.target.closest(".pin"); if (g && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); selected = g.dataset.id; draw(); } });
  $("mapList").addEventListener("click", e => { const id = e.target.dataset.pick; if (id) { selected = id; draw(); } });
  ["mapFilter", "mapBeds"].forEach(id => $(id).addEventListener("input", draw));
  $("mapFilter").innerHTML = `<option value="">All income tiers</option>` + TIERS.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join("");
  window.drawMap = draw;
  draw();
})();
