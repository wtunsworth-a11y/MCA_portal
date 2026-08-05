/* Document archives — search-first interface + in-portal reader.
 *
 * Search-first by design: nothing is listed until the user searches, so the
 * collection is never presented as a browsable file tree.
 *
 * The Managalas archive is the real 229-document index (full OCR text) loaded
 * from data/mca_archive.json. Search runs over title + keywords + full text.
 * (Interim: the index is loaded client-side. Production moves it server-side so
 * the full text is never shipped to the browser — see docs/06.)
 */
(function () {
  "use strict";
  var A = window.PORTAL_ARCHIVES || { registry: [], records: [] };
  var TIER_LABEL = { public: "PUBLIC", reg: "REGISTERED", partner: "PARTNER" };
  var MIN = 2, CAP = 30;
  var state = { archive: "all", q: "" };
  var loaded = false, loadError = false;

  var tabs = document.getElementById("tabs");
  var list = document.getElementById("list");
  var meta = document.getElementById("meta");
  var qEl = document.getElementById("q");

  // --- load the real Managalas index --------------------------------------
  fetch("data/mca_archive.json")
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (docs) {
      A.records = docs.map(function (d) {
        d.archive = "managalas";
        return d;
      });
      loaded = true;
      render();
    })
    .catch(function () { loadError = true; render(); });

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

  // Build a snippet from the full text centred on the first matched term.
  function contextSnippet(d, terms) {
    var text = d.text || d.snippet || "";
    var low = text.toLowerCase(), pos = -1;
    for (var i = 0; i < terms.length; i++) {
      var p = low.indexOf(terms[i]);
      if (p !== -1 && (pos === -1 || p < pos)) pos = p;
    }
    if (pos === -1) return (d.snippet || text.slice(0, 240)).trim();
    var start = Math.max(0, pos - 90), end = Math.min(text.length, pos + 150);
    var frag = (start > 0 ? "… " : "") + text.slice(start, end).replace(/\s+/g, " ").trim() + (end < text.length ? " …" : "");
    return frag;
  }

  // --- render -------------------------------------------------------------
  function render() {
    var terms = state.q ? state.q.toLowerCase().split(/\s+/).filter(Boolean) : [];
    if (!state.q || state.q.length < MIN) {
      meta.textContent = "";
      var hint = loadError
        ? "Could not load the archive index. Serve the app over http:// (not file://) and reload."
        : (loaded ? "" : "Loading the Managalas index (229 documents)…");
      list.innerHTML =
        '<div class="empty-search"><div class="ic">🔎</div>' +
        "<h3>Search the archives</h3>" +
        "<p>Type a keyword — place, person, species, year — to search the full text of documents" +
        (state.archive === "all" ? " across all archives" : " in the " + archName(state.archive) + " archive") +
        ".<br />Results open in the in-portal reader.</p>" +
        (hint ? '<p class="sub" style="margin-top:10px;color:var(--faint)">' + esc(hint) + "</p>" : "") +
        "</div>";
      return;
    }
    if (!loaded) { meta.textContent = ""; list.innerHTML = '<div class="empty-search"><div class="ic">⏳</div><h3>Loading index…</h3></div>'; return; }

    var hits = A.records.filter(function (d) {
      if (state.archive !== "all" && d.archive !== state.archive) return false;
      var hay = (d.title + " " + (d.keywords || []).join(" ") + " " + (d.text || d.snippet || "")).toLowerCase();
      return terms.every(function (t) { return hay.indexOf(t) !== -1; });
    });
    var total = hits.length;
    hits = hits.slice(0, CAP);
    meta.textContent = total + " result" + (total === 1 ? "" : "s") +
      (state.archive === "all" ? "" : " · " + archName(state.archive)) +
      ' · “' + state.q + '”' + (total > CAP ? " · showing first " + CAP : "");
    if (!total) { list.innerHTML = '<div class="empty-search"><div class="ic">🗒️</div><h3>No documents match</h3><p>Try a different or broader keyword.</p></div>'; return; }

    list.innerHTML = hits.map(function (d) {
      var locked = d.tier !== "public";
      var when = d.year || "";
      var kws = (d.keywords || []).slice(0, 8);
      return '<div class="res' + (locked ? " locked" : "") + '">' +
        "<h3>" + hl(d.title, terms) + "</h3>" +
        '<div class="rmeta"><span>' + esc(archName(d.archive)) + "</span>" +
        (when ? "<span>·</span><span>" + esc(when) + "</span>" : "") +
        (d.folder ? "<span>·</span><span>" + esc(d.folder) + "</span>" : "") +
        "<span>·</span><span>" + (d.pages || "?") + " pp</span>" +
        (d.dup ? '<span>·</span><span title="possible duplicate">⚠ dup</span>' : "") +
        "<span>·</span><span>" + (TIER_LABEL[d.tier] || "PUBLIC") + "</span></div>" +
        '<div class="snip">' + hl(contextSnippet(d, terms), terms) + "</div>" +
        '<div class="kw">' + kws.map(function (k) {
          return '<button data-k="' + esc(k) + '">' + esc(k) + "</button>"; }).join("") + "</div>" +
        '<button class="read" data-ref="' + esc(d.ref) + '">' +
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
    document.getElementById("rSub").textContent =
      archName(d.archive) + (d.year ? " · " + d.year : "") + " · " + (d.pages || "?") + " pp";
    document.getElementById("rBand").textContent = d.size || "";
    // In-portal reader: embed the document's Drive preview (view-only, page-by-page).
    // Production replaces this with a backend streaming route that also blocks download.
    if (d.driveId) {
      rStage.innerHTML = '<iframe title="' + esc(d.title) + '" src="https://drive.google.com/file/d/' +
        esc(d.driveId) + '/preview" style="width:100%;height:100%;border:0;background:#fff" ' +
        'allow="autoplay" loading="lazy"></iframe>';
    } else {
      rStage.innerHTML = '<div class="placeholder"><p>No preview available for this document.</p></div>';
    }
    reader.classList.add("open"); reader.setAttribute("aria-hidden", "false");
  }
  function closeReader() { reader.classList.remove("open"); reader.setAttribute("aria-hidden", "true"); rStage.innerHTML = ""; }
  document.getElementById("rClose").addEventListener("click", closeReader);
  document.getElementById("scrim").addEventListener("click", closeReader);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeReader(); });

  render();
})();
