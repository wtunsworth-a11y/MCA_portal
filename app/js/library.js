/* Document archives — search-first interface + in-portal reader.
 *
 * Search-first by design: nothing is listed until the user searches, so the
 * collection is never presented as a browsable file tree. In production the
 * search runs server-side and returns only matching records; here it filters
 * the local sample in PORTAL_ARCHIVES.
 */
(function () {
  "use strict";
  var A = window.PORTAL_ARCHIVES || { registry: [], records: [] };
  var TIER_LABEL = { public: "PUBLIC", reg: "REGISTERED", partner: "PARTNER" };
  var MIN = 2, CAP = 25;
  var state = { archive: "all", q: "" };

  var tabs = document.getElementById("tabs");
  var list = document.getElementById("list");
  var meta = document.getElementById("meta");
  var qEl = document.getElementById("q");

  // --- archive tabs -------------------------------------------------------
  function tabHtml(a) {
    var planned = a.status !== "indexed";
    return '<button class="arch-tab' + (planned ? " planned" : "") + (state.archive === a.id ? " active" : "") +
      '" data-a="' + a.id + '" title="' + esc(a.blurb) + '">' + a.name +
      '<span class="n">' + (planned ? "planned" : a.docs + " docs") + "</span></button>";
  }
  tabs.innerHTML =
    '<button class="arch-tab' + (state.archive === "all" ? " active" : "") + '" data-a="all">All archives</button>' +
    A.registry.map(tabHtml).join("");
  tabs.addEventListener("click", function (e) {
    var b = e.target.closest(".arch-tab"); if (!b) return;
    state.archive = b.dataset.a;
    [].forEach.call(tabs.children, function (c) { c.classList.toggle("active", c.dataset.a === state.archive); });
    render();
  });

  qEl.addEventListener("input", function (e) { state.q = e.target.value.trim(); render(); });

  // --- helpers ------------------------------------------------------------
  function esc(s) { return (s || "").replace(/[&<>"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function hl(text, terms) {
    var out = esc(text);
    terms.forEach(function (t) {
      if (!t) return;
      var re = new RegExp("(" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "ig");
      out = out.replace(re, "<mark>$1</mark>");
    });
    return out;
  }
  function archName(id) { var r = A.registry.filter(function (x) { return x.id === id; })[0]; return r ? r.name : id; }

  // --- render -------------------------------------------------------------
  function render() {
    var terms = state.q ? state.q.toLowerCase().split(/\s+/) : [];
    if (!state.q || state.q.length < MIN) {
      meta.textContent = "";
      list.innerHTML =
        '<div class="empty-search"><div class="ic">🔎</div>' +
        "<h3>Search the archives</h3>" +
        "<p>Type a keyword — place, person, species, year — to find documents" +
        (state.archive === "all" ? " across all archives" : " in the " + archName(state.archive) + " archive") +
        ".<br />Results open in the in-portal reader.</p></div>";
      return;
    }
    var hits = A.records.filter(function (d) {
      if (state.archive !== "all" && d.archive !== state.archive) return false;
      var hay = (d.title + " " + d.keywords.join(" ") + " " + d.snippet).toLowerCase();
      return terms.every(function (t) { return hay.indexOf(t) !== -1; });
    });
    var total = hits.length;
    hits = hits.slice(0, CAP);
    meta.textContent = total + " result" + (total === 1 ? "" : "s") +
      (state.archive === "all" ? "" : " · " + archName(state.archive)) +
      ' · “' + state.q + '”' + (total > CAP ? " · refine to narrow" : "");
    if (!total) { list.innerHTML = '<div class="empty-search"><div class="ic">🗒️</div><h3>No documents match</h3><p>Try a different or broader keyword.</p></div>'; return; }

    list.innerHTML = hits.map(function (d) {
      var locked = d.tier !== "public";
      return '<div class="res' + (locked ? " locked" : "") + '">' +
        "<h3>" + hl(d.title, terms) + "</h3>" +
        '<div class="rmeta"><span>' + esc(archName(d.archive)) + "</span><span>·</span><span>" +
        esc(d.date) + "</span><span>·</span><span>" + d.pages + " pp</span><span>·</span><span>" +
        (TIER_LABEL[d.tier] || "PUBLIC") + "</span></div>" +
        '<div class="snip">' + hl(d.snippet, terms) + "</div>" +
        '<div class="kw">' + d.keywords.map(function (k) {
          return '<button data-k="' + esc(k) + '">' + esc(k) + "</button>"; }).join("") + "</div>" +
        '<button class="read" data-ref="' + d.ref + '">' +
        (locked ? "🔒 Sign in to read" : "Read in portal →") + "</button></div>";
    }).join("");
  }

  // keyword chip → search; read button → open reader
  list.addEventListener("click", function (e) {
    var kw = e.target.closest(".kw button");
    if (kw) { qEl.value = state.q = kw.dataset.k; render(); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    var rd = e.target.closest(".read");
    if (rd) openReader(rd.dataset.ref);
  });

  // --- in-portal reader ---------------------------------------------------
  var reader = document.getElementById("reader");
  var rStage = document.getElementById("rStage");
  function openReader(ref) {
    var d = A.records.filter(function (x) { return x.ref === ref; })[0]; if (!d) return;
    if (d.tier !== "public") { window.location.href = "index.html#access"; return; }
    document.getElementById("rTitle").textContent = d.title;
    document.getElementById("rSub").textContent = archName(d.archive) + " · " + d.date + " · " + d.pages + " pp";
    document.getElementById("rBand").textContent = "low-bandwidth mode";
    // Production: rStage gets an <iframe> streaming the document's server preview
    // route (e.g. /read/<ref>), which renders page-by-page and blocks download.
    rStage.innerHTML =
      '<div class="placeholder"><div class="pg">page 1 / ' + d.pages + "</div>" +
      "<p>This is the in-portal reader. In production the document streams here " +
      "page-by-page from the portal — it is not downloaded to your device and the " +
      "underlying file is never exposed.</p></div>";
    reader.classList.add("open"); reader.setAttribute("aria-hidden", "false");
  }
  function closeReader() { reader.classList.remove("open"); reader.setAttribute("aria-hidden", "true"); rStage.innerHTML = ""; }
  document.getElementById("rClose").addEventListener("click", closeReader);
  document.getElementById("scrim").addEventListener("click", closeReader);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeReader(); });

  render();
})();
