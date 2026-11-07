// Action plan tab: turns the current gap into ordered steps, partners and links.
// Amounts come only from the calculator (cost, land cost, buydown math, sources). Program amounts are never invented:
// steps that depend on a program say "amount set by the program" and offer to add a pending line to the funding stack.
(() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const money = x => "$" + Math.round(Math.max(0, x)).toLocaleString("en-US");
  const KEY = "gl-plan-done";
  let done = {};
  try { done = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { done = {}; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(done)); } catch { /* storage blocked */ } };

  // Who to work with. Links are national or state directories and agencies; local offices change, so each says how to find them.
  const PARTNERS = [
    { id: "counsel", who: "HUD-approved housing counseling agency", what: "Free or low-cost homebuyer education and one-on-one counseling. Many programs require a certificate from one.",
      find: "Search by ZIP code", url: "https://www.consumerfinance.gov/find-a-housing-counselor/", sure: "Certain" },
    { id: "calhfa", who: "CalHFA and a CalHFA-approved lender", what: "State first mortgages and down-payment programs (deferred loans, shared appreciation when a round is open).",
      find: "Program and lender lists", url: "https://www.calhfa.ca.gov", sure: "Certain (agency). Verify program windows." },
    { id: "city", who: "City or county housing division", what: "Local silent-second loans, inclusionary and density-bonus homes, fee waivers, surplus land.",
      find: "Search \u201c[city name] housing division\u201d on the city website", url: "", sure: "Certain (type). Programs differ by city." },
    { id: "hcd", who: "CA Department of Housing and Community Development (HCD)", what: "State funds passed through cities and nonprofits (for example CalHome and HOME), plus the income limits this page uses.",
      find: "Grants and funding pages", url: "https://www.hcd.ca.gov", sure: "Certain (agency)" },
    { id: "clt", who: "Community land trust", what: "Holds the land so the family buys only the house; keeps homes affordable at resale.",
      find: "National directory of land trusts and shared-equity programs", url: "https://groundedsolutions.org", sure: "Likely. Verify which trusts serve Orange County." },
    { id: "habitat", who: "Local Habitat for Humanity affiliate or similar builder", what: "Sweat-equity homeownership, volunteer builds, home repair.",
      find: "Find the local affiliate", url: "https://www.habitat.org", sure: "Certain (organization). Verify local programs." },
    { id: "fhlb", who: "Member bank of the Federal Home Loan Bank of San Francisco", what: "Some member banks offer matched down-payment grants and affordable housing grants to projects.",
      find: "Programs and member banks", url: "https://www.fhlbsf.com", sure: "Likely. Verify current grant rounds." },
    { id: "employer", who: "Large local employers", what: "Employer-assisted housing: forgivable loans, matched savings, or co-investing in workforce homes.",
      find: "Ask HR or the local chamber of commerce", url: "", sure: "Likely (exists at some employers)" },
    { id: "donor", who: "Community foundations, faith groups and individual donors", what: "Gifts to the project or a down-payment fund. Use the donor view to show what each gift closes.",
      find: "Local community foundation", url: "", sure: "Certain (type)" },
    { id: "legal", who: "Legal aid or a real estate attorney", what: "Co-ownership agreements for co-buyers, and review of resale restrictions before signing.",
      find: "Local legal aid society or state bar referral", url: "https://www.calbar.ca.gov", sure: "Certain (state bar)" },
  ];

  function steps(L) {
    const m = L.m, land = parseFloat($("landCost").value) || 0;
    const m0 = model(L.rate, { bd: 0 }), q = model(L.rate, { bd: 0.25 });
    const per25 = Math.max(0, m0.gap - q.gap); // net gap change for a 0.25% buydown, after its cost
    const landIn = sources.some(s => s.land);
    return [
      { id: "ready", title: "Get the family ready", who: ["counsel"],
        how: "Book homebuyer counseling. Gather pay stubs, bank statements and tax returns. Pay down pay-later and card debt. Start a matched savings account if one is offered.",
        closes: "Does not close the gap by itself, but most programs below require it.", tab: "documents", tabLabel: "Read the family's documents" },
      { id: "land", title: "Take the land out of the price", who: ["clt", "city"],
        how: "Ask a community land trust or the city to hold the land. The family buys only the house, with a resale cap.",
        closes: land ? `Up to ${money(land)} per home (the land cost on the Ways to shrink the gap tab).${landIn ? " Already in your funding stack." : ""}` : "Enter the land cost on the Ways to shrink the gap tab.",
        action: landIn ? null : ["Add land to the stack", () => $("addLand").click()] },
      { id: "local", title: "Stack city and county help", who: ["city", "hcd"],
        how: "Ask the city housing division about silent-second loans, inclusionary units, fee waivers and state funds it passes through (for example CalHome or HOME).",
        closes: "Amount set by each program. Add each one to the stack as Applied / pending until you have a commitment letter.",
        action: ["Add a city source", () => addSource("City silent second (enter program)", "City")] },
      { id: "state", title: "Add state down-payment programs", who: ["calhfa"],
        how: "Have the family pre-approved by a CalHFA lender. Check which down-payment programs are open now and whether the family qualifies (first-time, first-generation, income).",
        closes: "Amount set by the program and often limited to funding windows. Do not count it until the lender confirms it.",
        action: ["Add a state source", () => addSource("State down-payment program (enter name)", "Down-payment program")] },
      { id: "rate", title: "Lower the monthly cost", who: ["calhfa", "fhlb"],
        how: "Ask the builder, seller or a program to fund a rate buydown. Keep HOA dues low. Check below-market first mortgages from community banks.",
        closes: `At ${L.rate.toFixed(2)}%, each 0.25% buydown lowers the gap by about ${money(per25)} per home after its cost (rule of thumb: 1 point per 0.25%).`,
        tab: "options", tabLabel: "Try a buydown" },
      { id: "private", title: "Bring in employers, banks and donors", who: ["employer", "fhlb", "donor", "habitat"],
        how: "Ask large employers about workforce housing help, member banks about grants, and donors about a gift per home. Volunteer builds can lower labor cost.",
        closes: L.open > 0 ? `What is still open: ${money(L.open)} per home${L.homes > 1 ? `, ${money(L.open * L.homes)} for all ${L.homes} homes` : ""}.` : "Nothing left to close at these inputs.",
        action: ["Add a donor line", () => addSource("Donor or employer (enter name)", "Donor")] },
      { id: "protect", title: "Close carefully and protect the home", who: ["legal", "counsel"],
        how: "Review the loan, resale restriction and any co-ownership agreement before signing. Set aside money for supplemental tax bills, insurance changes and repairs.",
        closes: "Keeps the family in the home after purchase." },
    ];
  }

  function addSource(name, type) {
    sources.push({ name, type, status: "pending", amount: 0, src: "Enter the program's terms" });
    renderSources(); calc();
    $("planNote").textContent = `Added "${name}" to the funding stack on the Calculator tab as Applied / pending. Enter the amount from the program.`;
  }

  function render() {
    const L = window.LAST; if (!L || $("planView").hidden) return;
    const m = L.m;
    const st = steps(L);
    const n = st.filter(s => done[s.id]).length;
    $("planHead").innerHTML = `A <b>${esc(m.tierT.name.toLowerCase())}</b> family of <b>${m.hh}</b> \u00b7 home costs <b>${money(m.cost)}</b> \u00b7
      affordable price <b>${money(Math.min(m.price, m.cost))}</b> \u00b7 gap <b>${money(m.gap)}</b> \u00b7 confirmed <b>${money(L.conf)}</b> \u00b7
      still open <b>${money(L.open)}</b> per home. <span class="muted">${n} of ${st.length} steps done.</span>`;
    $("planSteps").innerHTML = st.map((s, i) => `<li class="step${done[s.id] ? " done" : ""}">
      <div class="stepnum">${i + 1}</div>
      <div class="stepbody">
        <div class="flexrow"><h3 style="margin:0;text-transform:none;letter-spacing:0;color:var(--ink);font-size:16px">${esc(s.title)}</h3>
          <label class="small"><input type="checkbox" data-done="${s.id}" ${done[s.id] ? "checked" : ""} style="width:auto"> Done</label></div>
        <p class="small">${esc(s.how)}</p>
        <p class="small"><b>What it can close:</b> ${esc(s.closes)}</p>
        <p class="small"><b>Work with:</b> ${s.who.map(w => `<button class="linkbtn" data-goto="${w}">${esc(PARTNERS.find(p => p.id === w).who)}</button>`).join(" \u00b7 ")}</p>
        ${s.action || s.tab ? `<div class="applyrow">${s.action ? `<button data-act="${s.id}">${esc(s.action[0])}</button>` : ""}${s.tab ? `<a href="#${s.tab}">${esc(s.tabLabel)}</a>` : ""}</div>` : ""}
      </div></li>`).join("");
    $("planSteps").querySelectorAll("[data-goto]").forEach(b => b.onclick = () => { const r = $("plan-" + b.dataset.goto); r.scrollIntoView({ behavior: "smooth", block: "center" }); r.classList.add("now"); setTimeout(() => r.classList.remove("now"), 1600); });
    $("planSteps").querySelectorAll("[data-act]").forEach(b => b.onclick = () => st.find(s => s.id === b.dataset.act).action[1]());
    $("planPartners").innerHTML = PARTNERS.map(p => `<tr id="plan-${p.id}"><td><b>${esc(p.who)}</b></td><td class="small">${esc(p.what)}</td>
      <td class="small">${p.url ? `<a href="${p.url}" target="_blank" rel="noopener">${esc(p.find)}</a>` : esc(p.find)}</td><td class="small muted">${esc(p.sure)}</td></tr>`).join("");
  }

  function asText() {
    const L = window.LAST, m = L.m;
    const st = steps(L);
    return [`Gap plan: ${m.tierT.name} family of ${m.hh}. Cost ${money(m.cost)}, affordable price ${money(Math.min(m.price, m.cost))}, gap ${money(m.gap)}, confirmed ${money(L.conf)}, still open ${money(L.open)} per home.`, "",
      ...st.map((s, i) => `${i + 1}. ${s.title}${done[s.id] ? " (done)" : ""}\n   ${s.how}\n   Can close: ${s.closes}\n   Work with: ${s.who.map(w => PARTNERS.find(p => p.id === w).who).join("; ")}`),
      "", "Partners:", ...PARTNERS.map(p => `- ${p.who}: ${p.what} ${p.url || p.find} (${p.sure})`),
      "", "Not legal or lending advice. Verify every program's current terms."].join("\n");
  }

  $("planSteps").addEventListener("change", e => {
    const id = e.target.dataset.done; if (!id) return;
    done[id] = e.target.checked; save(); render();
  });
  $("planCopy").addEventListener("click", async () => {
    const txt = asText();
    try { await navigator.clipboard.writeText(txt); $("planNote").textContent = "Plan copied. Paste it into an email or document."; }
    catch { $("planText").hidden = false; $("planText").value = txt; $("planText").select(); $("planNote").textContent = "Copy did not work here. The plan is selected below: press Ctrl+C (or Cmd+C)."; }
  });
  $("planReset").addEventListener("click", () => { done = {}; save(); render(); });
  window.renderPlan = render;
  render();
})();
