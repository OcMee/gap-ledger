// Map tab: sample projects on an atlas-style Orange County map, priced with the calculator's own math.
// The map is drawn here (no map tiles), because the claude.ai viewer blocks images from other sites.
// Zoom and pan: county outlines sit in one group that is moved and scaled; labels, pins, compass, scale bar and
// legend are redrawn in screen space, so text and symbols stay the same size at any zoom.
(() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const money = x => (x < 0 ? "−$" : "$") + Math.round(Math.abs(x)).toLocaleString("en-US");
  // Projection and county outlines come from atlas.js (US Census boundaries), so pins and land line up.
  const A = window.ATLAS;
  const k = A.k, s = A.s, LNG0 = A.lng0, LAT1 = A.lat1, WW = A.W, WH = A.H;
  const VW = A.view.w, VH = A.view.h;
  const MILES_PER_DEG_LAT = 69.05, PX_PER_MILE = s / MILES_PER_DEG_LAT;
  // World (unzoomed) pixel coordinates
  const bx = lng => (lng - LNG0) * k * s, by = lat => (LAT1 - lat) * s;
  // View: center in world pixels and zoom. z = 1 is the original Orange County frame.
  const HOME = { cx: A.view.cx, cy: A.view.cy, z: 1 };
  const ZMIN = Math.max(VW / WW, VH / WH), ZMAX = 6;
  let view = { ...HOME };
  const clampView = v => {
    const z = Math.min(ZMAX, Math.max(ZMIN, v.z));
    const hw = VW / 2 / z, hh = VH / 2 / z;
    return { z, cx: Math.min(WW - hw, Math.max(hw, v.cx)), cy: Math.min(WH - hh, Math.max(hh, v.cy)) };
  };
  const X = lng => (bx(lng) - view.cx) * view.z + VW / 2, Y = lat => (by(lat) - view.cy) * view.z + VH / 2;
  const lngAt = x => ((x - VW / 2) / view.z + view.cx) / (k * s) + LNG0;
  const latAt = y => LAT1 - ((y - VH / 2) / view.z + view.cy) / s;

  const TOWNS = [["Fullerton", 33.870, -117.925], ["Anaheim", 33.836, -117.914], ["Orange", 33.788, -117.853],
    ["Garden Grove", 33.774, -117.941], ["Santa Ana", 33.745, -117.868], ["Huntington Beach", 33.660, -117.999],
    ["Costa Mesa", 33.641, -117.919], ["Irvine", 33.684, -117.826], ["Newport Beach", 33.618, -117.929],
    ["Mission Viejo", 33.600, -117.672], ["Laguna Beach", 33.542, -117.783], ["San Clemente", 33.427, -117.612],
    ["Yorba Linda", 33.889, -117.813], ["Tustin", 33.746, -117.826], ["Westminster", 33.759, -117.994]];
  // Larger cities outside Orange County, shown for orientation when zoomed out (approximate city centers).
  const FAR = [["Los Angeles", 34.052, -118.244], ["Long Beach", 33.770, -118.194], ["Pomona", 34.055, -117.750],
    ["Ontario", 34.063, -117.651], ["Riverside", 33.953, -117.396], ["Corona", 33.875, -117.566],
    ["Temecula", 33.494, -117.148], ["Oceanside", 33.196, -117.380], ["Escondido", 33.119, -117.086],
    ["San Bernardino", 34.108, -117.290], ["Torrance", 33.836, -118.341], ["Santa Clarita", 34.392, -118.543]];

  // Static county shapes, in world pixels, built once. Strokes keep their screen width at any zoom.
  const C = A.counties;
  const nbs = ["la", "riv", "sb", "sd", "ven", "imp", "kern"].map(x => C[x] || "").join("");
  const land = nbs + C.oc;
  const NS = ` vector-effect="non-scaling-stroke"`;
  const WORLD = `<path d="${land}" class="wl wl1"${NS}/><path d="${land}" class="wl wl2"${NS}/><path d="${land}" class="wl wl3"${NS}/>
    <path d="${nbs}" class="nb"/><path d="${C.oc}" class="oc"/>
    <path d="${nbs}" class="border"${NS}/><path d="${C.oc}" class="ocline"${NS}/>`;

  const svg = $("mapSvg");
  svg.setAttribute("viewBox", `0 0 ${VW} ${VH}`);
  svg.innerHTML = `<rect x="0" y="0" width="${VW}" height="${VH}" class="ocean"/><g id="mapWorld">${WORLD}</g><g id="mapDyn"></g><g id="mapFix"></g>`;
  const gWorld = $("mapWorld"), gDyn = $("mapDyn"), gFix = $("mapFix");

  let selected = null, zipHit = null;
  // Straight-line miles between two points (flat-earth approximation, fine at county scale).
  const miles = (la1, lo1, la2, lo2) => Math.hypot((la2 - la1) * MILES_PER_DEG_LAT, (lo2 - lo1) * MILES_PER_DEG_LAT * Math.cos((la1 + la2) / 2 * Math.PI / 180));
  const dist = p => zipHit ? miles(zipHit.lat, zipHit.lng, p.lat, p.lng) : null;

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
  const visibleList = () => {
    const filt = $("mapFilter").value, beds = $("mapBeds").value;
    return PROJECTS.filter(p => (!filt || p.tier === filt) && (!beds || String(p.beds) === beds || (beds === "3" && p.beds >= 3)));
  };

  // ---------- screen-space layers ----------
  function drawDyn() {
    gWorld.setAttribute("transform", `translate(${(VW / 2 - view.cx * view.z).toFixed(2)} ${(VH / 2 - view.cy * view.z).toFixed(2)}) scale(${view.z.toFixed(4)})`);
    const z = view.z, inView = (x, y, m = 40) => x > -m && x < VW + m && y > -m && y < VH + m;
    let h = "";
    // Graticule: spacing grows when zoomed out, labels on the frame edge.
    const step = z >= 2.5 ? 0.05 : z >= 0.8 ? 0.1 : 0.25;
    const fmt = (v, pos, neg) => { const a = Math.abs(v), d = Math.floor(a + 1e-9), m = Math.round((a - d) * 60); return `${d}°${String(m).padStart(2, "0")}′${v >= 0 ? pos : neg}`; };
    const la0 = latAt(VH), la1 = latAt(0), lo0 = lngAt(0), lo1 = lngAt(VW);
    for (let i = Math.ceil(la0 / step); i * step <= la1; i++) {
      const lat = i * step, y = Y(lat).toFixed(1);
      h += `<line x1="0" x2="${VW}" y1="${y}" y2="${y}" class="grat"/><text x="${VW - 6}" y="${y - 3}" text-anchor="end" class="gratl">${fmt(lat, "N", "S")}</text>`;
    }
    for (let i = Math.ceil(lo0 / step); i * step <= lo1; i++) {
      const lng = i * step, x = X(lng).toFixed(1);
      h += `<line x1="${x}" x2="${x}" y1="0" y2="${VH}" class="grat"/><text x="${+x + 3}" y="14" class="gratl">${fmt(lng, "E", "W")}</text>`;
    }
    // Region labels
    const lab = (t, lat, lng, cls, rot = 0) => { const x = X(lng), y = Y(lat); if (!inView(x, y, 200)) return "";
      return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" class="${cls}" text-anchor="middle"${rot ? ` transform="rotate(${rot} ${x.toFixed(1)} ${y.toFixed(1)})"` : ""}>${t}</text>`; };
    // Close in, labels sit just across the county line; zoomed out, they move to the middle of each county.
    if (z >= 0.9) h += lab("LOS ANGELES COUNTY", 33.95, -118.05, "rlabel") + lab("SAN BERNARDINO CO.", 33.962, -117.66, "rlabel")
      + lab("RIVERSIDE COUNTY", 33.80, -117.43, "rlabel", -62) + lab("SAN DIEGO CO.", 33.395, -117.43, "rlabel")
      + lab("ORANGE COUNTY", 33.535, -117.66, "oclabel", -36) + lab("Pacific Ocean", 33.615, -118.085, "sealabel");
    else h += lab("LOS ANGELES COUNTY", 34.30, -118.30, "rlabel") + lab("SAN BERNARDINO CO.", 34.25, -117.45, "rlabel")
      + lab("RIVERSIDE COUNTY", 33.72, -116.85, "rlabel") + lab("SAN DIEGO COUNTY", 33.02, -116.85, "rlabel")
      + lab("VENTURA CO.", 34.50, -118.95, "rlabel") + lab("Pacific Ocean", 33.10, -118.12, "sealabel");
    // Towns without a project pin; outer cities only when zoomed out enough to need them
    const towns = TOWNS.filter(([nm]) => !PROJECTS.some(p => p.city === nm)).concat(z < 1.2 ? FAR : []);
    for (const [nm, la, lo] of towns) {
      const x = X(lo), y = Y(la); if (!inView(x, y, 10)) continue;
      h += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.2" class="town"/><text x="${(x + 5).toFixed(1)}" y="${(y + 3.5).toFixed(1)}" class="townl">${esc(nm)}</text>`;
    }
    // ZIP search area
    if (zipHit) {
      h += `<circle cx="${X(zipHit.lng).toFixed(1)}" cy="${Y(zipHit.lat).toFixed(1)}" r="${(zipHit.radius * PX_PER_MILE * z).toFixed(1)}" class="ziparea"/>`;
    }
    // Pins
    const list = visibleList();
    for (const p of list) {
      const r = priced(p), cx = X(p.lng), cy = Y(p.lat), rad = 9 + Math.sqrt(p.homes) * 2;
      if (!inView(cx, cy, 30)) continue;
      const far = zipHit && dist(p) > zipHit.radius;
      h += `<g class="pin ${r.level}${selected === p.id ? " sel" : ""}${far ? " far" : ""}" data-id="${p.id}" tabindex="0" role="button"
        aria-label="${esc(p.name)}, ${esc(p.city)}, ${p.homes} homes, open gap ${money(r.open)} per home">
        <title>${esc(p.name)}, ${esc(p.city)}: ${money(r.open)} open per home</title>
        <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${rad}"/><text x="${cx.toFixed(1)}" y="${(cy + 4).toFixed(1)}" text-anchor="middle" class="pinn">${p.homes}</text></g>`;
    }
    if (zipHit) {
      const zx = X(zipHit.lng), zy = Y(zipHit.lat), right = zx < VW - 200;
      h += `<circle cx="${zx.toFixed(1)}" cy="${zy.toFixed(1)}" r="6" class="zipdot"/>
        <text x="${(right ? zx + 10 : zx - 10).toFixed(1)}" y="${(zy - 10).toFixed(1)}" text-anchor="${right ? "start" : "end"}" class="zipl">${esc(zipHit.zip)} · ${esc(zipHit.city)}</text>`;
    }
    // Only the selected project gets a text label, drawn last so it sits on top and never blocks other pins.
    const sp = list.find(p => p.id === selected);
    if (sp) {
      const r = priced(sp), cx = X(sp.lng), cy = Y(sp.lat), rad = 9 + Math.sqrt(sp.homes) * 2;
      const right = cx < VW - 260, tx = right ? cx + rad + 6 : cx - rad - 6, anchor = right ? "start" : "end";
      h += `<g class="pinlabel"><text x="${tx.toFixed(1)}" y="${(cy - 2).toFixed(1)}" text-anchor="${anchor}" class="pinl">${esc(sp.name)}</text>
        <text x="${tx.toFixed(1)}" y="${(cy + 13).toFixed(1)}" text-anchor="${anchor}" class="pins">${esc(sp.city)} · ${money(r.open)} open per home</text></g>`;
    }
    gDyn.innerHTML = h;
    drawFix();
  }

  // Fixed furniture: compass, scale bar (updates with zoom), locator inset, legend, frame.
  function drawFix() {
    let h = "";
    const cx = 265, cy = VH - 80;
    h += `<g class="compass" transform="translate(${cx} ${cy})"><circle r="30" class="cring"/><circle r="22" class="cring2"/>
      <path d="M0 -34 L6 0 L0 34 L-6 0Z" class="cneedle"/><path d="M0 -34 L6 0 L-6 0Z" class="cnorth"/><path d="M-34 0 L0 5 L34 0 L0 -5Z" class="cneedle"/>
      <text y="-39" text-anchor="middle" class="cN">N</text></g>`;
    const ppm = PX_PER_MILE * view.z;
    const seg = [0.5, 1, 2, 5, 10, 20, 25, 50].find(m => m * ppm >= 55) || 50;
    const sx = 186, sy = VH - 32;
    h += `<g class="scale" transform="translate(${sx} ${sy})">`;
    for (let i = 0; i < 2; i++) h += `<rect x="${(i * seg * ppm).toFixed(1)}" y="0" width="${(seg * ppm).toFixed(1)}" height="6" class="${i ? "sb2" : "sb1"}"/>`;
    h += `<text x="0" y="-5" class="scalel">0</text><text x="${(seg * ppm).toFixed(1)}" y="-5" text-anchor="middle" class="scalel">${seg}</text>
      <text x="${(2 * seg * ppm).toFixed(1)}" y="-5" text-anchor="middle" class="scalel">${2 * seg} miles</text></g>`;
    const I = A.inset, ix = 14, iy = VH - I.h - 46;
    h += `<g transform="translate(${ix} ${iy})" class="inset"><rect x="-6" y="-20" width="${I.w + 12}" height="${I.h + 28}" rx="4" class="insetbox"/>
      <text x="${I.w / 2}" y="-7" text-anchor="middle" class="insetl">CALIFORNIA</text><path d="${I.ca}" class="insetca"/><path d="${I.oc}" class="insetoc"/></g>`;
    const lx = VW - 200, ly = 26;
    h += `<g transform="translate(${lx} ${ly})" class="legendbox"><rect width="178" height="104" rx="4" class="insetbox"/>
      <text x="12" y="20" class="insetl">SAMPLE PROJECTS</text>
      <circle cx="20" cy="38" r="6" class="lg ok"/><text x="32" y="42" class="legl">Fully funded</text>
      <circle cx="20" cy="56" r="6" class="lg warn"/><text x="32" y="60" class="legl">Under 25% still open</text>
      <circle cx="20" cy="74" r="6" class="lg bad"/><text x="32" y="78" class="legl">25% or more still open</text>
      <text x="12" y="96" class="legl muted2">Pin size and number = homes</text></g>`;
    h += `<rect x="3" y="3" width="${VW - 6}" height="${VH - 6}" class="frame"/><rect x="8" y="8" width="${VW - 16}" height="${VH - 16}" class="frame2"/>`;
    gFix.innerHTML = h;
    $("mapZoomOut").disabled = view.z <= ZMIN + 1e-6;
    $("mapZoomIn").disabled = view.z >= ZMAX - 1e-6;
  }

  function draw() {
    drawDyn();
    // list view (also the accessible / phone-friendly version of the map)
    const list = visibleList();
    const sorted = list.map(p => [p, priced(p)]).sort((a, b) => zipHit ? dist(a[0]) - dist(b[0]) : b[1].open - a[1].open);
    $("mapList").innerHTML = sorted.map(([p, r]) => `<tr class="${selected === p.id ? "now" : ""}">
      <td><button class="linkbtn" data-pick="${p.id}">${esc(p.name)}</button><div class="small muted">${esc(p.city)} · ${esc(p.stage)}${zipHit ? ` · ${dist(p).toFixed(1)} mi from ${esc(zipHit.zip)}` : ""}</div></td>
      <td class="r num">${p.homes}</td><td>${p.beds} bd · ${esc(TIER_NAME(p.tier))}</td>
      <td class="r num">${money(r.m.gap)}</td><td class="r num"><span class="pill ${r.level === "ok" ? "ok" : r.level === "warn" ? "warn" : "bad"}">${money(r.open)}</span></td></tr>`).join("")
      || `<tr><td colspan="5" class="muted">No sample projects match these filters.</td></tr>`;
    const tot = sorted.reduce((a, [p, r]) => a + r.open * p.homes, 0), homes = sorted.reduce((a, [p]) => a + p.homes, 0);
    $("mapTotals").textContent = `${sorted.length} projects · ${homes} homes · ${money(tot)} still open across all of them at ${currentRate().toFixed(2)}%`;
    card();
  }

  // ---------- zoom and pan ----------
  const setView = v => { view = clampView(v); drawDyn(); };
  // Zoom keeping the point under (px, py) in place.
  const zoomAt = (f, px = VW / 2, py = VH / 2) => {
    const wx = (px - VW / 2) / view.z + view.cx, wy = (py - VH / 2) / view.z + view.cy, z = Math.min(ZMAX, Math.max(ZMIN, view.z * f));
    setView({ z, cx: wx - (px - VW / 2) / z, cy: wy - (py - VH / 2) / z });
  };
  const toSvg = e => { const r = svg.getBoundingClientRect(); return [(e.clientX - r.left) * VW / r.width, (e.clientY - r.top) * VH / r.height]; };
  $("mapZoomIn").addEventListener("click", () => zoomAt(1.6));
  $("mapZoomOut").addEventListener("click", () => zoomAt(1 / 1.6));
  $("mapZoomHome").addEventListener("click", () => zipHit ? fitZip() : setView(HOME));
  svg.addEventListener("dblclick", e => { e.preventDefault(); const [x, y] = toSvg(e); zoomAt(e.shiftKey ? 1 / 1.6 : 1.6, x, y); });
  // Ctrl/Cmd + wheel (and trackpad pinch) zooms; plain scrolling still scrolls the page.
  svg.addEventListener("wheel", e => { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); const [x, y] = toSvg(e); zoomAt(Math.exp(-e.deltaY * 0.004), x, y); }, { passive: false });
  let drag = null, moved = false;
  svg.addEventListener("pointerdown", e => {
    if (e.button !== 0) return;
    drag = { x: e.clientX, y: e.clientY, cx: view.cx, cy: view.cy, id: e.pointerId }; moved = false;
  });
  svg.addEventListener("pointermove", e => {
    if (!drag || e.pointerId !== drag.id) return;
    const r = svg.getBoundingClientRect(), dx = (e.clientX - drag.x) * VW / r.width, dy = (e.clientY - drag.y) * VH / r.height;
    if (!moved && Math.hypot(dx, dy) < 4) return;
    if (!moved) { moved = true; svg.setPointerCapture(drag.id); svg.classList.add("dragging"); }
    setView({ z: view.z, cx: drag.cx - dx / view.z, cy: drag.cy - dy / view.z });
  });
  const endDrag = () => { drag = null; svg.classList.remove("dragging"); };
  svg.addEventListener("pointerup", endDrag); svg.addEventListener("pointercancel", endDrag);
  // Keyboard: arrows pan, +/- zoom, 0 resets (when the map itself has focus).
  svg.addEventListener("keydown", e => {
    if (e.target !== svg) return;
    const d = 80 / view.z, keys = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d] };
    if (keys[e.key]) { e.preventDefault(); setView({ ...view, cx: view.cx + keys[e.key][0], cy: view.cy + keys[e.key][1] }); }
    else if (e.key === "+" || e.key === "=") zoomAt(1.6); else if (e.key === "-") zoomAt(1 / 1.6); else if (e.key === "0") setView(HOME);
  });

  function card() {
    const p = PROJECTS.find(x => x.id === selected);
    if (!p) { if (zipHit) zipCard(); else $("mapCard").innerHTML = `<p class="small muted">Search a ZIP code, or select a pin or a row to see the project's gap and funding.</p>`; return; }
    const r = priced(p);
    $("mapCard").innerHTML = `<div class="flexrow"><h3 style="margin:0">${esc(p.name)}</h3><span class="pill info">${esc(p.stage)}</span></div>
      ${zipHit ? `<button class="linkbtn small" id="mapBackZip">← Back to ZIP ${esc(zipHit.zip)} results</button>` : ""}
      <p class="small muted">${esc(p.city)}${zipHit ? ` (${dist(p).toFixed(1)} mi from ${esc(zipHit.zip)})` : ""} · ${p.homes} homes · ${p.beds} bedrooms · ${esc(TIER_NAME(p.tier))} buyers · sample project</p>
      <div class="calc">Cost to create one home: <b>${money(p.cost)}</b><br>
        Affordable price (${esc(TIER_NAME(p.tier).toLowerCase())}, ${p.beds + 1} people, ${r.rate.toFixed(2)}%): <b>${money(Math.min(r.m.price, p.cost))}</b><br>
        Gap per home: <b>${money(r.m.gap)}</b><br>
        Confirmed sources: <b>${money(r.conf)}</b>${r.pend ? ` · pending or unconfirmed: ${money(r.pend)}` : ""}<br>
        Still open per home: <b>${money(r.open)}</b> · project total <b>${money(r.open * p.homes)}</b></div>
      ${p.sources.length ? `<ul class="small" style="margin:8px 0 0;padding-left:18px">${p.sources.map(x => `<li>${esc(x.name)}: ${money(x.amount)}/home, ${esc(STATUSES[x.status].toLowerCase())}</li>`).join("")}</ul>` : `<p class="small" style="margin-top:8px">No funding sources yet.</p>`}
      <div class="applyrow"><button class="primary" id="mapOpen">Open in calculator</button>
        <a class="small" href="https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=13/${p.lat}/${p.lng}" target="_blank" rel="noopener">See ${esc(p.city)} on OpenStreetMap</a></div>`;
    if ($("mapBackZip")) $("mapBackZip").onclick = () => { selected = null; draw(); };
    $("mapOpen").onclick = () => {
      $("cost").value = p.cost; $("beds").value = p.beds; $("tier").value = p.tier; $("homes").value = p.homes;
      sources.splice(0, sources.length, ...p.sources.map(x => ({ ...x })));
      renderSources(); calc();
      location.hash = "#calculator";
      window.scrollTo(0, 0);
    };
  }

  // ZIP search: where is it, what can a family pay there, what is nearby, and where to look for real homes.
  function zipCard() {
    const z = zipHit, L = window.LAST;
    const near = PROJECTS.map(p => [p, dist(p), priced(p)]).sort((a, b) => a[1] - b[1]);
    const inR = near.filter(x => x[1] <= z.radius);
    const price = L ? money(Math.min(L.m.price, L.m.cost)) : "";
    const who = L ? `a ${esc(L.m.tierT.name.toLowerCase())} family of ${L.m.hh}` : "a family";
    const row = ([p, d, r]) => `<li><button class="linkbtn" data-pick="${p.id}">${esc(p.name)}</button>, ${esc(p.city)}: ${d.toFixed(1)} mi · ${p.homes} homes · ${money(r.open)} still open per home</li>`;
    $("mapCard").innerHTML = `<div class="flexrow"><h3 style="margin:0">ZIP ${esc(z.zip)} · ${esc(z.city)}</h3><span class="pill info">Orange County</span></div>
      <div class="calc" style="margin-top:8px">What ${who} can pay here: <b>${price}</b> at ${L ? L.rate.toFixed(2) : ""}%<br>
        <span class="muted">Income limits are set for the whole county, so this cap is the same in every Orange County ZIP. Change the family on the Calculator tab.</span></div>
      <h3>Sample projects within ${z.radius} miles</h3>
      ${inR.length ? `<ul class="small" style="margin:0;padding-left:18px">${inR.map(row).join("")}</ul>`
        : `<p class="small">None within ${z.radius} miles. Nearest: <button class="linkbtn" data-pick="${near[0][0].id}">${esc(near[0][0].name)}</button>, ${near[0][1].toFixed(1)} mi away.</p>`}
      <p class="small muted" style="margin-top:4px">Sample projects are fictional, and all are in Orange County.</p>
      <h3>Look for real homes</h3>
      <ul class="small" style="margin:0;padding-left:18px">
        <li>Income-restricted homes are usually listed by the city housing office or a nonprofit, not on listing sites. <button class="linkbtn" id="mapAskHelp">Talk to a housing counselor</button></li>
        <li><a href="https://www.zillow.com/homes/for_sale/${encodeURIComponent(z.zip)}_rb/" target="_blank" rel="noopener">Homes for sale in ${esc(z.zip)} on Zillow</a>: market-rate. Filter to ${price || "the price above"} or less; most will cost more.</li>
        <li><a href="https://www.openstreetmap.org/?mlat=${z.lat}&mlon=${z.lng}#map=14/${z.lat}/${z.lng}" target="_blank" rel="noopener">See ${esc(z.zip)} on OpenStreetMap</a></li>
      </ul>
      <p class="small muted" style="margin-top:6px">ZIP location is an approximate center point. Distances are straight-line miles.</p>`;
    if ($("mapAskHelp")) $("mapAskHelp").onclick = () => window.openHelp?.("help");
  }
  $("mapCard").addEventListener("click", e => { const id = e.target.dataset?.pick; if (id) { selected = id; draw(); } });

  // Zoom so the whole search circle fits, centered on the ZIP.
  function fitZip() {
    const rr = zipHit.radius * PX_PER_MILE;
    setView({ cx: bx(zipHit.lng), cy: by(zipHit.lat), z: Math.min(2.5, 0.9 * Math.min(VW, VH) / (2 * rr)) });
  }
  function searchZip() {
    const z = $("mapZip").value.trim(), note = $("mapZipNote");
    if (!/^\d{5}$/.test(z)) { note.textContent = "Enter a 5-digit ZIP code, like 92701."; return; }
    const hit = (window.OC_ZIPS || {})[z];
    if (!hit) { note.textContent = `${z} is not in our Orange County list. ZIP search covers Orange County only.`; return; }
    zipHit = { zip: z, lat: hit[0], lng: hit[1], city: hit[2], radius: +$("mapRadius").value };
    selected = null;
    const n = PROJECTS.filter(p => dist(p) <= zipHit.radius).length;
    note.textContent = `${z} is in ${hit[2]}. ${n} sample ${n === 1 ? "project" : "projects"} within ${zipHit.radius} miles.`;
    $("mapZipClear").hidden = false;
    fitZip();
    draw();
  }
  $("mapZipForm").addEventListener("submit", e => { e.preventDefault(); searchZip(); });
  $("mapRadius").addEventListener("change", () => { if (zipHit) searchZip(); });
  $("mapZip").addEventListener("input", () => { $("mapZip").value = $("mapZip").value.replace(/\D/g, "").slice(0, 5); });
  $("mapZipClear").addEventListener("click", () => {
    zipHit = null; $("mapZip").value = ""; $("mapZipClear").hidden = true;
    $("mapZipNote").textContent = "Orange County ZIP codes. Shows sample projects nearby and what a family can pay there.";
    view = { ...HOME };
    draw();
  });

  const pickPin = e => { const g = e.target.closest(".pin"); if (g) { selected = g.dataset.id; draw(); } };
  svg.addEventListener("click", e => { if (moved) { moved = false; return; } pickPin(e); });
  svg.addEventListener("keydown", e => { const g = e.target.closest(".pin"); if (g && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); selected = g.dataset.id; draw(); } });
  $("mapList").addEventListener("click", e => { const id = e.target.dataset.pick; if (id) { selected = id; draw(); } });
  ["mapFilter", "mapBeds"].forEach(id => $(id).addEventListener("input", draw));
  $("mapFilter").innerHTML = `<option value="">All income tiers</option>` + TIERS.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join("");
  window.drawMap = draw;
  draw();
})();
