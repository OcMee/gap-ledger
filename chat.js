// Help chat and contact support.
// On claude.ai, questions go to Claude on the viewer's own account, with the page's current numbers as the only facts it may use.
// Elsewhere (or if the viewer says no), quick answers are built in code from the same numbers, and support contacts are always shown.
// Nothing typed here is stored or sent anywhere except to Claude when the viewer presses Send.
(() => {
  const $ = id => document.getElementById(id);
  const money = x => "$" + Math.round(Math.max(0, x)).toLocaleString("en-US");
  const get = (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
  const put = (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } };
  const txt = id => ($(id)?.innerText || "").trim();
  let sample = null, ctl = null, turns = [];

  const fab = $("chatFab"), panel = $("chatPanel"), log = $("chatLog"), box = $("chatInput"), send = $("chatSend"), stop = $("chatStop");

  (async () => {
    try { sample = window.claude ? await window.claude.use("sample") : null; } catch { sample = null; }
    $("chatMode").textContent = sample ? "Answers by Claude, using only the numbers on this page." : "Quick answers from this page. Full chat works on the claude.ai copy.";
  })();

  // ---------- open / close / tabs ----------
  const open = v => {
    panel.hidden = !v; fab.setAttribute("aria-expanded", String(v));
    if (v) { if (!log.children.length) greet(); setTimeout(() => box.focus(), 50); }
  };
  fab.addEventListener("click", () => open(panel.hidden));
  $("chatClose").addEventListener("click", () => { open(false); fab.focus(); });
  panel.addEventListener("keydown", e => { if (e.key === "Escape") { open(false); fab.focus(); } });
  const tab = which => {
    for (const t of ["ask", "help"]) {
      $("chatTab-" + t).setAttribute("aria-selected", String(t === which));
      $("chatPane-" + t).hidden = t !== which;
    }
    if (which === "help") renderHelp();
  };
  $("chatTab-ask").addEventListener("click", () => tab("ask"));
  window.openHelp = (which = "ask") => { open(true); tab(which); };
  $("chatTab-help").addEventListener("click", () => tab("help"));

  // ---------- messages ----------
  function bubble(who, text) {
    const b = document.createElement("div");
    b.className = "msg " + who;
    b.textContent = text;
    log.append(b); log.scrollTop = log.scrollHeight;
    return b;
  }
  function greet() {
    bubble("bot", "Hi. I can explain the numbers on this page: the price cap, the gap, and the ways to close it. I can't give legal or loan advice, but I can point you to someone who can.");
  }

  // The page's current facts. Claude may use only these.
  function facts() {
    const L = window.LAST;
    if (!L) return "The calculator has not run yet.";
    const m = L.m;
    const src = (typeof sources !== "undefined" ? sources : []).filter(s => s.name || s.amount)
      .map(s => `- ${s.name || "(unnamed)"}: ${money(s.amount || 0)} per home, ${s.status}${s.src ? ` (from: ${s.src})` : ""}`).join("\n") || "- none entered";
    const progs = [...document.querySelectorAll("#progSvg .pn")].map(g => g.getAttribute("aria-label")).filter(Boolean).join("; ");
    const hh = window.DOC_HH && window.DOC_HH.annual ? `Household income from documents: about ${money(window.DOC_HH.annual)} a year, ${window.DOC_HH.size} people.` : "No household documents applied.";
    return [
      `Income tier: ${m.tierT.name}. Household size: ${m.hh} (bedrooms + 1). Mortgage rate used: ${L.rate.toFixed(2)}%.`,
      `Cost to build one home: ${money(m.cost)}. Price the family can pay (capped): ${money(Math.min(m.price, m.cost))}. Gap per home: ${money(m.gap)}.`,
      `Confirmed funding per home: ${money(L.conf)}. Still open per home: ${money(L.open)}. Homes in project: ${L.homes}.`,
      `How the cap is worked out:\n${txt("capCalc")}`,
      `Income table:\n${txt("limitCalc").replace(/Open source PDF.*/, "")}`,
      `Plain summary: ${txt("plainText")}`,
      `Funding stack:\n${src}`,
      `Rate sensitivity (rate, price, gap, change):\n${[...document.querySelectorAll("#sens tbody tr")].map(r => r.innerText.replace(/\s+/g, " ").trim()).join("\n")}`,
      `Ways to shrink the gap (current results): buydown: ${txt("bdRes")}; land trust: ${txt("landRes")}; co-buyers: ${txt("cbRes")}; shared equity: ${txt("eqRes")}.`,
      progs ? `Program atlas statuses (may fit / to check / not for now; "may fit" never means approved): ${progs}.` : "",
      hh,
    ].filter(Boolean).join("\n\n").slice(0, 12000);
  }

  const RULES = () => `You are the help assistant on the OCMEE Affordable Homes Program page (Gap Ledger), a calculator that shows whether an income-restricted home in Orange County, California "pencils" and who can close the gap.

Rules:
- Plain language, middle-school reading level. Short: under 120 words unless asked for detail.
- Use ONLY the numbers in PAGE DATA below. Never invent numbers, rates, program terms, deadlines or eligibility. If the answer is not in PAGE DATA, say you don't know and suggest a HUD-approved housing counselor (Contact support tab).
- Do not give legal, tax or lending advice. Explain, flag risks, and point to a human next step.
- "May fit" never means approved. Programs set their own rules.
- If someone shares an SSN, account number or full address, tell them not to share it here.
- Reply in the language the person writes in. Plain text, no headings; short lists are fine.

PAGE DATA (current numbers on the page):
${facts()}`;

  // ---------- quick answers built in code (no Claude needed) ----------
  const QUICK = {
    "What is the gap?": () => {
      const L = window.LAST; if (!L) return "The calculator has not run yet.";
      const m = L.m;
      return `It costs ${money(m.cost)} to build one home. A ${m.tierT.name.toLowerCase()} family of ${m.hh} can pay about ${money(Math.min(m.price, m.cost))} at ${L.rate.toFixed(2)}%. The difference, ${money(m.gap)}, is the gap. After confirmed money, ${money(L.open)} is still open.`;
    },
    "How is the price worked out?": () => {
      const L = window.LAST; if (!L) return "The calculator has not run yet.";
      return `State law (Health and Safety Code 50052.5) caps housing cost at a share of the area median income. Step by step:\n\n${txt("capCalc")}`;
    },
    "What can close the gap?": () =>
      `Options on the "Ways to shrink the gap" tab:\n- Rate buydown: ${txt("bdRes")}\n- Land trust: ${txt("landRes")}\n- Co-buyers: ${txt("cbRes")}\n- Shared equity loan: ${txt("eqRes")}\nOnly confirmed money counts. A housing counselor can tell you which ones are open now.`,
    "What if rates change?": () => {
      const rows = [...document.querySelectorAll("#sens tbody tr")].map(r => [...r.cells].map(c => c.innerText.trim()));
      const lo = rows[0], hi = rows[rows.length - 1];
      return lo && hi ? `At ${lo[0]} the family could pay ${lo[1]} (gap ${lo[2]}). At ${hi[0]} it drops to ${hi[1]} (gap ${hi[2]}). The full table is on the Calculator tab.` : "See the rate table on the Calculator tab.";
    },
    "Who can I talk to?": () => { tab("help"); return "I opened the Contact support tab. A free HUD-approved housing counselor is the best first call."; },
  };
  $("chatChips").innerHTML = Object.keys(QUICK).map(q => `<button type="button" class="chip">${q}</button>`).join("");
  $("chatChips").addEventListener("click", e => {
    const q = e.target.closest(".chip")?.textContent; if (!q) return;
    if (sample && q !== "Who can I talk to?") { box.value = q; ask(); return; }
    bubble("me", q); bubble("bot", QUICK[q]());
  });

  // ---------- ask Claude ----------
  async function ask() {
    const q = box.value.trim(); if (!q || ctl) return;
    box.value = ""; bubble("me", q);
    if (!sample) {
      const hit = Object.keys(QUICK).find(k => q.toLowerCase().includes(k.toLowerCase().replace(/[?]/g, "").split(" ").slice(-2).join(" ")));
      bubble("bot", hit ? QUICK[hit]() : "Full answers work on the claude.ai copy of this page. Try a quick question above, or open Contact support to reach a person.");
      return;
    }
    turns.push({ role: "user", content: q });
    turns = turns.slice(-12);
    const b = bubble("bot", "Thinking...");
    ctl = new AbortController(); send.hidden = true; stop.hidden = false;
    try {
      const { text, truncated } = await sample([{ role: "user", content: RULES() }, ...turns], {
        cache: false, modelTier: "quick", signal: ctl.signal, onText: ({ text }) => { b.textContent = text; log.scrollTop = log.scrollHeight; },
      });
      b.textContent = text + (truncated ? "\n\n(Cut short. Ask for less at a time.)" : "");
      turns.push({ role: "assistant", content: text });
    } catch (e) {
      const keep = e && e.text;
      b.textContent = keep || "";
      const why = {
        cancelled: "", not_granted: "Claude is not allowed on this page. Quick answers and Contact support still work.",
        sampling_disabled: "Claude is not available for this account. Quick answers and Contact support still work.",
        rate_limited: "Too many questions at once. Wait a minute, then try again.", refused: "I can't answer that one. Try asking another way, or contact support.",
      }[e && e.code] ?? "Something went wrong. Try again, or use Contact support.";
      if (why) bubble("bot note", why);
      if (!keep) b.remove();
      if (["not_granted", "sampling_disabled", "not_declared", "capability_disabled", "capability_removed"].includes(e && e.code)) sample = null;
      turns.pop();
    } finally { ctl = null; send.hidden = false; stop.hidden = true; }
  }
  send.addEventListener("click", ask);
  stop.addEventListener("click", () => ctl && ctl.abort());
  box.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); } });

  // ---------- contact support ----------
  function summary() {
    const L = window.LAST; if (!L) return "";
    const m = L.m;
    return `Numbers from the Gap Ledger page:\n- Cost per home: ${money(m.cost)}\n- Price the family can pay: ${money(Math.min(m.price, m.cost))} (${m.tierT.name}, ${m.hh} people, ${L.rate.toFixed(2)}%)\n- Gap per home: ${money(m.gap)}\n- Still open after confirmed money: ${money(L.open)}`;
  }
  function renderHelp() {
    const email = get("gl-support-email", "");
    $("supEmail").value = email;
    const last = turns.filter(t => t.role === "user").slice(-1)[0]?.content || "";
    const body = `Hello,\n\nI have a question about the affordable homes program.\n\n${last ? "My question: " + last + "\n\n" : ""}${summary()}\n\nThank you.`;
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const a = $("supMail");
    a.hidden = !ok;
    if (ok) a.href = `mailto:${email}?subject=${encodeURIComponent("Question about the affordable homes program")}&body=${encodeURIComponent(body)}`;
    $("supMailNote").textContent = ok ? "Opens your email app with the numbers filled in. You choose what to send." : "Staff: add the program's support email to turn on the email button. Saved in this browser only.";
    $("supCopy").onclick = async () => {
      try { await navigator.clipboard.writeText(body); $("supCopyNote").textContent = "Copied. Paste it into an email or text to your counselor."; }
      catch { $("supCopyNote").textContent = "Copy is blocked here. Select the text in your email app instead."; }
    };
  }
  $("supEmail").addEventListener("change", () => { put("gl-support-email", $("supEmail").value.trim()); renderHelp(); });
})();
