// Language support: English, Spanish, Vietnamese.
// Translates navigation, headings, key labels and the plain-language summary. Detailed numbers and formulas stay in English.
// Spanish and Vietnamese text was machine-written: have a native speaker review it before real use.
(() => {
  const $ = id => document.getElementById(id);
  const LANGS = { en: "English", es: "Español", vi: "Tiếng Việt" };
  const T = {
    tabCalc: ["Calculator", "Calculadora", "Máy tính"],
    tabDocs: ["Documents", "Documentos", "Giấy tờ"],
    tabOpts: ["Ways to shrink the gap", "Formas de reducir la diferencia", "Cách thu hẹp khoảng chênh lệch"],
    tabPlan: ["Action plan", "Plan de acción", "Kế hoạch hành động"],
    planTitle: ["Action plan: how to close this gap", "Plan de acción: cómo cubrir esta diferencia", "Kế hoạch hành động: cách bù khoản chênh lệch này"],
    tabInv: ["Get involved", "Participe", "Tham gia"],
    invTitle: ["Get involved: give, donate goods, volunteer", "Participe: done dinero, done artículos, sea voluntario", "Tham gia: quyên góp tiền, tặng đồ, làm tình nguyện"],
    tabMap: ["Map", "Mapa", "Bản đồ"],
    tabHist: ["History", "Historial", "Lịch sử"],
    h1: ["Does this home pencil, and who closes the gap?", "¿Alcanzan los números para esta casa, y quién cubre la diferencia?",
      "Căn nhà này có khả thi không, và ai sẽ bù khoản chênh lệch?"],
    k1: ["Cost to create one home", "Costo de construir una casa", "Chi phí xây một căn nhà"],
    k2: ["Affordable price (capped)", "Precio asequible (con límite)", "Giá vừa khả năng (có giới hạn)"],
    k3: ["Gap per home", "Diferencia por casa", "Khoản chênh lệch mỗi căn"],
    k4: ["Still open after confirmed sources", "Falta después de los fondos confirmados", "Còn thiếu sau các nguồn đã xác nhận"],
    docsTitle: ["Read documents", "Leer documentos", "Đọc giấy tờ"],
    optsTitle: ["Ways to shrink the gap", "Formas de reducir la diferencia", "Cách thu hẹp khoảng chênh lệch"],
    mapTitle: ["Projects on the map", "Proyectos en el mapa", "Các dự án trên bản đồ"],
    histTitle: ["Documents read", "Documentos leídos", "Giấy tờ đã đọc"],
    docLive: ["Live demo: read the commitment letter", "Demostración: leer la carta de compromiso", "Trình diễn: đọc thư cam kết tài trợ"],
    docSamples: ["Load sample documents", "Cargar documentos de ejemplo", "Tải giấy tờ mẫu"],
    dropMain: ["Drop PDFs or photos here", "Suelte aquí PDFs o fotos", "Thả tệp PDF hoặc ảnh vào đây"],
    addLand: ["Add land to the funding stack", "Agregar el terreno a las fuentes de fondos", "Thêm đất vào danh sách nguồn vốn"],
    plainTitle: ["What this means", "Qué significa esto", "Điều này có nghĩa là gì"],
    review: ["", "Traducción automática. Pida a una persona hablante nativa que la revise.",
      "Bản dịch tự động. Nhờ người nói tiếng Việt kiểm tra lại."],
  };
  const TIER = {
    eli: ["extremely low income", "ingresos extremadamente bajos", "thu nhập cực thấp"],
    vli: ["very low income", "ingresos muy bajos", "thu nhập rất thấp"],
    li: ["lower income", "ingresos bajos", "thu nhập thấp"],
    mod: ["moderate income", "ingresos moderados", "thu nhập trung bình"],
  };
  const IDX = { en: 0, es: 1, vi: 2 };
  let lang = "en";
  try { lang = localStorage.getItem("gl-lang") || "en"; } catch { /* storage blocked */ }
  if (!IDX.hasOwnProperty(lang)) lang = "en";

  const money = x => "$" + Math.round(Math.max(0, x)).toLocaleString("en-US");
  const setText = (el, txt) => {
    if (!el) return;
    // Keep child elements (like the History count) and replace only the first text node.
    const node = [...el.childNodes].find(c => c.nodeType === 3 && c.textContent.trim());
    if (node) node.textContent = txt + (el.children.length ? " " : ""); else el.textContent = txt;
  };

  function apply() {
    const i = IDX[lang];
    document.documentElement.lang = lang;
    ["tabCalc", "tabDocs", "tabOpts", "tabPlan", "tabInv", "tabMap", "tabHist", "docsTitle", "optsTitle", "planTitle", "invTitle", "mapTitle", "histTitle", "docLive", "docSamples", "addLand"]
      .forEach(id => setText($(id), T[id][i]));
    setText(document.querySelector("h1"), T.h1[i]);
    document.querySelectorAll(".strip .k").forEach((el, n) => setText(el, T["k" + (n + 1)][i]));
    const drop = document.querySelector("#docDrop b"); if (drop) drop.textContent = T.dropMain[i];
    $("plainTitle").textContent = T.plainTitle[i];
    $("langNote").textContent = T.review[i];
    $("langNote").hidden = !T.review[i];
    renderPlain();
  }

  // Plain-language summary, built from the calculator's own numbers (no new figures).
  function renderPlain() {
    const L = window.LAST; if (!L) return;
    const i = IDX[lang], m = L.m, tier = TIER[m.tierT.id][i];
    const v = { hh: m.hh, cap: money(m.cap), rate: L.rate.toFixed(2), price: money(Math.min(m.price, m.cost)),
      cost: money(m.cost), gap: money(m.gap), conf: money(L.conf), open: money(L.open) };
    const text = [
      `A ${tier} family of ${v.hh} can pay about ${v.cap} a month for housing. At today's rate of ${v.rate}%, that buys a home of about ${v.price}. ` +
      `This home costs ${v.cost} to build, so the gap is ${v.gap} per home. ` +
      (L.conf ? `Confirmed help covers ${v.conf}, leaving ${v.open}. ` : "No help is confirmed yet. ") +
      `Next step: ask a housing counselor which programs can close the gap.`,
      `Una familia de ${v.hh} personas con ${tier} puede pagar unos ${v.cap} al mes por vivienda. Con la tasa de hoy de ${v.rate}%, eso alcanza para una casa de unos ${v.price}. ` +
      `Construir esta casa cuesta ${v.cost}, así que la diferencia es de ${v.gap} por casa. ` +
      (L.conf ? `La ayuda confirmada cubre ${v.conf} y faltan ${v.open}. ` : "Todavía no hay ayuda confirmada. ") +
      `Siguiente paso: pregunte a un consejero de vivienda qué programas pueden cubrir la diferencia.`,
      `Một gia đình ${v.hh} người có ${tier} có thể trả khoảng ${v.cap} mỗi tháng cho nhà ở. Với lãi suất hôm nay là ${v.rate}%, số tiền đó mua được căn nhà khoảng ${v.price}. ` +
      `Căn nhà này tốn ${v.cost} để xây, nên khoản chênh lệch là ${v.gap} mỗi căn. ` +
      (L.conf ? `Khoản hỗ trợ đã xác nhận là ${v.conf}, còn thiếu ${v.open}. ` : "Chưa có khoản hỗ trợ nào được xác nhận. ") +
      `Bước tiếp theo: hỏi chuyên viên tư vấn nhà ở về các chương trình có thể bù khoản chênh lệch.`,
    ][i];
    $("plainText").textContent = text;
  }

  $("langSel").innerHTML = Object.entries(LANGS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("");
  $("langSel").value = lang;
  $("langSel").addEventListener("input", () => {
    lang = $("langSel").value;
    try { localStorage.setItem("gl-lang", lang); } catch { /* storage blocked */ }
    apply();
  });
  window.LANG = () => lang;
  window.LANG_NAME = () => ({ en: "English", es: "Spanish", vi: "Vietnamese" })[lang];
  window.renderPlain = renderPlain;
  apply();
})();
