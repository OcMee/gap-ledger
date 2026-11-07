// Get involved tab: give money, donate goods, volunteer.
// No payments and no data collection: money goes through the nonprofit's own donation page, and the volunteer
// form only builds a message the person copies and sends themselves. Nothing typed here leaves the browser.
(() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const money = x => "$" + Math.round(Math.max(0, x)).toLocaleString("en-US");
  const get = (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
  const put = (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } };

  const GOODS = [
    ["Furniture", "Sofas, tables, chairs, dressers, bed frames in good condition"],
    ["Appliances", "Working refrigerators, washers, dryers, stoves (ask about age limits)"],
    ["Building materials", "New or clean lumber, tile, flooring, doors, windows, paint (unopened)"],
    ["Tools", "Hand and power tools in working order"],
    ["Home goods", "Lighting, cabinets, fixtures, kitchenware"],
  ];
  const ROLES = [
    ["build", "Build crew", "Framing, roofing, drywall and painting with a site lead. No experience needed; training and safety gear on site.", "Half or full day"],
    ["finish", "Painting and landscaping", "Interior paint, fences, planting drought-tolerant yards. Good for families and groups age 16+ (ask for the program's age rules).", "Half day"],
    ["events", "Events and sign-in", "Volunteer check-in, water and lunch, groundbreaking and home dedication events.", "2 to 4 hours"],
    ["office", "Paperwork help and translation", "Help families gather documents, or translate for Spanish and Vietnamese speakers. Training provided; no legal advice.", "Flexible, can be remote"],
    ["trades", "Skilled trades", "Licensed electricians, plumbers and roofers who can lead or inspect work.", "By project"],
    ["store", "Resale store", "Sort, price and move donated furniture and building materials.", "Half day"],
  ];

  function projects() {
    const L = window.LAST;
    const list = [{ id: "calc", name: "Home on the Calculator tab", open: L ? L.open : 0, homes: L ? L.homes : 1 }];
    for (const p of (window.PROJECTS || [])) {
      const m = model(currentRate(), { tier: p.tier, beds: p.beds, cost: p.cost, bd: 0 });
      const conf = p.sources.filter(s => s.status === "confirmed").reduce((a, s) => a + s.amount, 0);
      list.push({ id: p.id, name: `${p.name}, ${p.city} (sample)`, open: Math.max(0, m.gap - conf), homes: p.homes });
    }
    return list;
  }

  function renderGive() {
    const list = projects(), sel = $("giveProject"), cur = sel.value;
    sel.innerHTML = list.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join("");
    sel.value = list.some(p => p.id === cur) ? cur : "calc";
    const p = list.find(x => x.id === sel.value), gift = parseFloat($("giveAmt").value) || 0;
    $("giveOut").innerHTML = !gift ? "Enter an amount to see what it closes."
      : p.open <= 0 ? `${esc(p.name)} has no open gap at these inputs. Your gift could go to another project.`
      : gift >= p.open
        ? `Your <b>${money(gift)}</b> closes the open gap on <b>${Math.floor(gift / p.open)}</b> ${Math.floor(gift / p.open) === 1 ? "home" : "homes"} (${money(p.open)} each)${p.homes > 1 ? ` of the ${p.homes} in this project` : ""}.`
        : `Your <b>${money(gift)}</b> closes <b>${(gift / p.open * 100).toFixed(1)}%</b> of the ${money(p.open)} still open on one home. ${Math.ceil(p.open / gift)} gifts this size close it.`;
    const url = get("gl-donate-url", "");
    $("giveUrl").value = url;
    $("giveGo").hidden = !/^https:\/\//.test(url);
    if (/^https:\/\//.test(url)) $("giveGo").href = url;
  }

  function renderGoods() {
    $("goodsList").innerHTML = GOODS.map(([k, v]) => `<li><b>${esc(k)}</b>: ${esc(v)}</li>`).join("");
    const val = parseFloat($("goodsVal").value) || 0;
    $("goodsOut").innerHTML = val
      ? `If the store resells these for about <b>${money(val)}</b> (your estimate), that money can go into the funding stack as earned revenue.`
      : "Enter your own estimate of what the items would resell for.";
  }

  function renderVol() {
    $("volRoles").innerHTML = ROLES.map(([id, t, d, time]) => `<label class="role">
      <input type="checkbox" value="${id}" ${get("gl-vol-" + id, "") === "1" ? "checked" : ""}>
      <span><b>${esc(t)}</b><span class="small muted"> · ${esc(time)}</span><br><span class="small">${esc(d)}</span></span></label>`).join("");
  }

  function volMessage() {
    const roles = [...$("volRoles").querySelectorAll("input:checked")].map(i => ROLES.find(r => r[0] === i.value)[1]);
    const name = $("volName").value.trim(), langs = $("volLang").value.trim(), when = $("volWhen").value.trim();
    return `Hello,\n\nI would like to volunteer with your affordable homeownership program.\n\n` +
      `Name: ${name || "(your name)"}\nInterested in: ${roles.length ? roles.join(", ") : "(pick one or more roles)"}\n` +
      `Languages: ${langs || "English"}\nAvailable: ${when || "(days and times)"}\n\nPlease send me the next build days and any training I need.\n\nThank you.`;
  }

  // ---- wiring ----
  ["giveAmt", "giveProject"].forEach(id => $(id).addEventListener("input", renderGive));
  $("giveUrl").addEventListener("change", () => { put("gl-donate-url", $("giveUrl").value.trim()); renderGive(); });
  $("goodsVal").addEventListener("input", renderGoods);
  $("goodsAdd").addEventListener("click", () => {
    const val = Math.round(parseFloat($("goodsVal").value) || 0); if (!val) return;
    sources.push({ name: "Donated goods resale (estimate)", type: "Earned revenue", status: "unconfirmed", amount: val, src: "Donor's estimate on the Get involved tab" });
    renderSources(); calc();
    $("goodsNote").textContent = `Added ${money(val)} to the funding stack as "Funds not confirmed". Change it to Confirmed once the items sell.`;
  });
  $("volRoles").addEventListener("change", e => { if (e.target.value) put("gl-vol-" + e.target.value, e.target.checked ? "1" : ""); });
  $("volMake").addEventListener("click", async () => {
    const msg = volMessage();
    $("volText").value = msg; $("volText").hidden = false;
    try { await navigator.clipboard.writeText(msg); $("volNote").textContent = "Message copied. Paste it into an email to the nonprofit's volunteer coordinator."; }
    catch { $("volText").select(); $("volNote").textContent = "Copy did not work here. The message is selected below: press Ctrl+C (or Cmd+C)."; }
  });


  // ---- vehicle donation ----
  function renderCar() {
    const sell = $("carMode").value === "sell";
    $("carValRow").hidden = !sell; $("carAddRow").hidden = !sell;
    const val = parseFloat($("carVal").value) || 0;
    const L = window.LAST, open = L ? L.open : 0;
    $("carOut").innerHTML = !sell
      ? "The money does not go into the gap, but a reliable car helps a family get to work, keep steady income and qualify for a loan. The program matches the car with a family."
      : !val ? "Enter your estimate to see what the sale could close."
      : open > 0 ? `If it sells for about <b>${money(val)}</b>, that closes <b>${(val / open * 100).toFixed(1)}%</b> of the ${money(open)} still open on the home on the Calculator tab.`
      : `If it sells for about <b>${money(val)}</b>, that money can go to another project.`;
  }
  ["carMode", "carVal"].forEach(id => $(id).addEventListener("input", renderCar));
  $("carAdd").addEventListener("click", () => {
    const val = Math.round(parseFloat($("carVal").value) || 0); if (!val) return;
    sources.push({ name: `Donated vehicle sale (${$("carDesc").value.trim() || "estimate"})`, type: "Donor", status: "unconfirmed", amount: val, src: "Donor's estimate; real amount known after sale" });
    renderSources(); calc();
    $("carNote").textContent = `Added ${money(val)} to the funding stack as "Funds not confirmed". Change it to Confirmed once the car sells.`;
  });
  $("carMsg").addEventListener("click", async () => {
    const sell = $("carMode").value === "sell";
    const msg = `Hello,\n\nI would like to donate a vehicle to your affordable homeownership program.\n\n` +
      `Vehicle: ${$("carDesc").value.trim() || "(year, make, model)"}\n` +
      `I would like it to: ${sell ? "be sold, with the money going toward building homes" : "go to a family who needs reliable transport"}\n` +
      `I have the title in my name: (yes / no)\nCar location and pickup times: (where and when)\n\n` +
      `Please tell me the next steps and the paperwork you need.\n\nThank you.`;
    $("carText").value = msg; $("carText").hidden = false;
    try { await navigator.clipboard.writeText(msg); $("carNote").textContent = "Message copied. Paste it into an email to the nonprofit."; }
    catch { $("carText").select(); $("carNote").textContent = "Copy did not work here. The message is selected below: press Ctrl+C (or Cmd+C)."; }
  });
  window.renderInvolved = () => { if (!$("involvedView").hidden) { renderGive(); renderGoods(); renderCar(); } };
  renderVol(); renderGive(); renderGoods(); renderCar();
})();
