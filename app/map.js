// Map tab: sample projects on an atlas-style Orange County map, priced with the calculator's own math.
// The map is drawn here (no map tiles), because the claude.ai viewer blocks images from other sites.
(() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const money = x => (x < 0 ? "\u2212$" : "$") + Math.round(Math.abs(x)).toLocaleString("en-US");
  // Projection and county outlines come from atlas.js (US Census boundaries), so pins and land line up.
  const A = window.ATLAS;
  const H = A.H, W = A.W, k = A.k, s = A.s, LNG0 = A.lng0, LAT1 = A.lat1;
  const X = lng => (lng - LNG0) * k * s, Y = lat => (LAT1 - lat) * s;
  const TOWNS = [["Fullerton", 33.870, -117.925], ["Anaheim", 33.836, -117.914], ["Orange", 33.788, -117.853],
    ["Garden Grove", 33.774, -117.941], ["Santa Ana", 33.745, -117.868], ["Huntington Beach", 33.660, -117.999],
    ["Costa Mesa", 33.641, -117.919], ["Irvine", 33.684, -117.826], ["Newport Beach", 33.618, -117.929],
    ["Mission Viejo", 33.600, -117.672], ["Laguna Beach", 33.542, -117.783], ["San Clemente", 33.427, -117.612],
    ["Yorba Linda", 33.889, -117.813], ["Tustin", 33.746, -117.826], ["Westminster", 33.759, -117.994]];
  const MILES_PER_DEG_LAT = 69.05;

  // Static atlas layers, built once: ocean, shoreline water lines, land, borders, grid, labels, compass, scale, inset.
  function atlasBase() {
    const C = A.counties, land = [C.la, C.riv, C.sb, C.sd, C.oc].join("");
    let h = `<rect x="0" y="0" width="${W}" height="${H}" class="ocean"/>`;
    h += `<path d="${land}" class="wl wl1"/><path d="${land}" class="wl wl2"/><path d="${land}" class="wl wl3"/>`;
    h += `<path d="${C.la}${C.riv}${C.sb}${C.sd}" class="nb"/><path d="${C.oc}" class="oc"/>`;
    h += `<path d="${C.la}${C.riv}${C.sb}${C.sd}" class="border"/><path d="${C.oc}" class="ocline"/>`;
    // Graticule every 0.1 degree, labeled every 0.1 on the frame.
    const fmt = (v, pos, neg) => { const a = Math.abs(v), d = Math.floor(a + 1e-9), m = Math.round((a - d) * 60); return `${d}\u00b0${String(m).padStart(2, "0")}\u2032${v >= 0 ? pos : neg}`; };
    for (let lat = Math.ceil(A.lat0 * 10) / 10; lat <= A.lat1; lat = Math.round((lat + 0.1) * 10) / 10) {
      const y = Y(lat).toFixed(1);
      h += `<line x1="0" x2="${W}" y1="${y}" y2="${y}" class="grat"/><text x="${W - 6}" y="${y - 3}" text-anchor="end" class="gratl">${fmt(lat, "N", "S")}</text>`;
    }
    for (let lng = Math.ceil(A.lng0 * 10) / 10; lng <= A.lng1; lng = Math.round((lng + 0.1) * 10) / 10) {
      const x = X(lng).toFixed(1);
      h += `<line x1="${x}" x2="${x}" y1="0" y2="${H}" class="grat"/><text x="${+x + 3}" y="14" class="gratl">${fmt(lng, "E", "W")}</text>`;
    }
    // Region labels
    const lab = (t, lat, lng, cls, rot = 0) => `<text x="${X(lng).toFixed(1)}" y="${Y(lat).toFixed(1)}" class="${cls}" text-anchor="middle"${rot ? ` transform="rotate(${rot} ${X(lng).toFixed(1)} ${Y(lat).toFixed(1)})"` : ""}>${t}</text>`;
    h += lab("LOS ANGELES COUNTY", 33.95, -118.05, "rlabel") + lab("SAN BERNARDINO CO.", 33.962, -117.66, "rlabel")
      + lab("RIVERSIDE COUNTY", 33.80, -117.43, "rlabel", -62) + lab("SAN DIEGO CO.", 33.395, -117.43, "rlabel")
      + lab("ORANGE COUNTY", 33.535, -117.66, "oclabel", -36) + lab("Pacific Ocean", 33.615, -118.085, "sealabel");
    // Towns without a project pin
    for (const [nm, la, lo] of TOWNS) {
      if (PROJECTS.some(p => p.city === nm)) continue;
      h += `<circle cx="${X(lo).toFixed(1)}" cy="${Y(la).toFixed(1)}" r="2.2" class="town"/><text x="${(X(lo) + 5).toFixed(1)}" y="${(Y(la) + 3.5).toFixed(1)}" class="townl">${esc(nm)}</text>`;
    }
    // Compass rose
    const cx = X(-117.95), cy = Y(33.47);
    h += `<g class="compass" transform="translate(${cx.toFixed(1)} ${cy.toFixed(1)})"><circle r="30" class="cring"/><circle r="22" class="cring2"/>
      <path d="M0 -34 L6 0 L0 34 L-6 0Z" class="cneedle"/><path d="M0 -34 L6 0 L-6 0Z" class="cnorth"/><path d="M-34 0 L0 5 L34 0 L0 -5Z" class="cneedle"/>
      <text y="-39" text-anchor="middle" class="cN">N</text></g>`;
    // Scale bar: miles per pixel from the projection (latitude degrees are a fixed length).
    const pxPerMile = s / MILES_PER_DEG_LAT, sx = X(-118.05), sy = Y(33.385);
    h += `<g class="scale" transform="translate(${sx.toFixed(1)} ${sy.toFixed(1)})">`;
    for (let i = 0; i < 2; i++) h += `<rect x="${(i * 5 * pxPerMile).toFixed(1)}" y="0" width="${(5 * pxPerMile).toFixed(1)}" height="6" class="${i ? "sb2" : "sb1"}"/>`;
    h += `<text x="0" y="-5" class="scalel">0</text><text x="${(5 * pxPerMile).toFixed(1)}" y="-5" text-anchor="middle" class="scalel">5</text>
      <text x="${(10 * pxPerMile).toFixed(1)}" y="-5" text-anchor="middle" class="scalel">10 miles</text></g>`;
    // Locator inset: California with Orange County highlighted
    const I = A.inset, ix = 14, iy = H - I.h - 46;
    h += `<g transform="translate(${ix} ${iy})" class="inset"><rect x="-6" y="-20" width="${I.w + 12}" height="${I.h + 28}" rx="4" class="insetbox"/>
      <text x="${I.w / 2}" y="-7" text-anchor="middle" class="insetl">CALIFORNIA</text><path d="${I.ca}" class="insetca"/><path d="${I.oc}" class="insetoc"/></g>`;
    // Legend cartouche
    const lx = W - 200, ly = 26;
    h += `<g transform="translate(${lx} ${ly})" class="legendbox"><rect width="178" height="104" rx="4" class="insetbox"/>
      <text x="12" y="20" class="insetl">SAMPLE PROJECTS</text>
      <circle cx="20" cy="38" r="6" class="lg ok"/><text x="32" y="42" class="legl">Fully funded</text>
      <circle cx="20" cy="56" r="6" class="lg warn"/><text x="32" y="60" class="legl">Under 25% still open</text>
      <circle cx="20" cy="74" r="6" class="lg bad"/><text x="32" y="78" class="legl">25% or more still open</text>
      <text x="12" y="96" class="legl muted2">Pin size and number = homes</text></g>`;
    // Neatline frame
    h += `<rect x="3" y="3" width="${W - 6}" height="${H - 6}" class="frame"/><rect x="8" y="8" width="${W - 16}" height="${H - 16}" class="frame2"/>`;
    return h;
  }
  const BASE = atlasBase();
  const STAGES = ["Looking for land", "Land secured", "Design", "Permits", "Fundraising", "Under construction"];
  let selected = null;

  const TIER_NAME = id => (TIERS.find(t => t.id === id) || {}).name || id;
  function priced(p) {
    const rate = currentRate();
    const m = model(rate, { tier: p.tier, beds: p.beds, cost: p.cost, bd: 0 });
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
    let h = BASE;
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
