/* Document library — category filter + search over PORTAL_DOCS. */
(function () {
  "use strict";
  var DOCS = (window.PORTAL_DOCS || []).slice()
    .sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  var CATS = ["All"].concat(Object.keys(DOCS.reduce(function (m, d) { m[d.category] = 1; return m; }, {})));
  var TIER_LABEL = { public: "PUBLIC", reg: "REGISTERED", partner: "PARTNER" };
  var TIER_CLASS = { public: "public", reg: "reg", partner: "partner" };

  var state = { cat: "All", q: "" };
  var chips = document.getElementById("chips");
  var list = document.getElementById("list");
  var meta = document.getElementById("meta");

  chips.innerHTML = CATS.map(function (c) {
    return '<button class="chip' + (c === "All" ? " active" : "") + '" data-cat="' + c + '">' + c + "</button>";
  }).join("");
  chips.addEventListener("click", function (e) {
    var b = e.target.closest(".chip"); if (!b) return;
    state.cat = b.dataset.cat;
    [].forEach.call(chips.children, function (c) { c.classList.toggle("active", c === b); });
    render();
  });
  document.getElementById("q").addEventListener("input", function (e) {
    state.q = e.target.value.trim().toLowerCase(); render();
  });

  function fmtDate(d) {
    var p = d.split("-"); var mo = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return (p[1] ? mo[+p[1] - 1] + " " : "") + p[0];
  }

  function render() {
    var items = DOCS.filter(function (d) {
      if (state.cat !== "All" && d.category !== state.cat) return false;
      if (state.q) {
        var hay = (d.title + " " + d.desc + " " + d.category).toLowerCase();
        if (hay.indexOf(state.q) === -1) return false;
      }
      return true;
    });
    meta.textContent = items.length + " document" + (items.length === 1 ? "" : "s") +
      (state.cat === "All" ? "" : " · " + state.cat) + (state.q ? ' · “' + state.q + '”' : "");
    if (!items.length) { list.innerHTML = '<div class="empty">No documents match your search.</div>'; return; }
    list.innerHTML = items.map(function (d) {
      return '<a class="doc" href="#" onclick="return false" title="Placeholder — link to the real file/backend record">' +
        '<div class="ic">' + d.type + "</div>" +
        "<div><div class=\"t\">" + d.title + "</div>" +
        '<div class="d">' + d.desc + "</div>" +
        '<div class="meta"><span>' + fmtDate(d.date) + "</span><span>·</span><span>" + d.size + "</span>" +
        '<span class="badge ' + TIER_CLASS[d.tier] + '">' + TIER_LABEL[d.tier] + "</span></div></div>" +
        '<div class="right"><span class="badge">' + d.category + '</span>' +
        '<span class="dl">' + (d.tier === "public" ? "Download ↓" : "Sign in to access") + "</span></div></a>";
    }).join("");
  }
  render();
})();
