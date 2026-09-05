/*
 * Oro Data Portal — funders, partners & data-source credits.
 * ------------------------------------------------------------------
 * Single source of truth, rendered in two places:
 *   - a compact strip into  #siteCredits  (in every page footer)
 *   - the full detail into   #creditsFull  (on credits.html)
 *
 * Partner logos use an <img> that falls back to a text chip if the file
 * isn't present yet, so the credit reads correctly today and upgrades to
 * the real logo the moment you drop the file at the path below.
 *
 * TO ADD A LOGO: put the file at app/img/<file> (SVG preferred, or PNG on a
 * transparent/white background) matching the `logo` path in PARTNERS.
 * TO SET THE EU PROGRAMME LINE: edit FUNDING.programme below.
 */
(function () {
  "use strict";

  var FUNDING = {
    emblem: "img/eu-emblem.svg",
    line: "Funded by the European Union",
    // ↓↓↓ replace with the exact programme / action / grant text you must cite ↓↓↓
    programme: "under the [programme / action / grant number — to be confirmed]",
    disclaimer: "Views and opinions expressed are those of the authors only and do not " +
      "necessarily reflect those of the European Union or the funding programme. " +
      "Neither the European Union nor the granting authority can be held responsible for them."
  };

  // Funder + implementing/host + government partners (logos).
  var PARTNERS = [
    { name: "European Union", short: "European Union", url: "https://european-union.europa.eu",
      logo: "img/eu-emblem.svg", role: "Funder" },
    { name: "CIFOR-ICRAF", short: "CIFOR-ICRAF", url: "https://www.cifor-icraf.org",
      logo: "img/cifor-icraf.svg", role: "Implementing partner" },
    { name: "Oro Provincial Government", short: "Oro Provincial Government", url: "",
      logo: "img/opg.png", role: "Provincial partner" },
    { name: "Department of National Planning & Monitoring (PNG)", short: "DNPM", url: "",
      logo: "img/dnpm.png", role: "Government partner" }
  ];

  // Data sources surfaced through the portal, grouped by theme.
  var DATA = [
    { group: "Satellite imagery & basemaps", items: [
      { name: "Esri World Imagery", by: "Esri, Maxar, Earthstar Geographics", lic: "Esri terms of use" },
      { name: "Planet NICFI basemaps", by: "Planet / NICFI programme", lic: "NICFI programme terms" },
      { name: "OpenStreetMap", by: "© OpenStreetMap contributors", lic: "ODbL" },
      { name: "OpenTopoMap", by: "OpenTopoMap", lic: "CC-BY-SA" }
    ]},
    { group: "Forest cover & change", items: [
      { name: "Global Forest Change (tree cover, loss year)", by: "Hansen / UMD / Google / USGS / NASA", lic: "Free use with citation" },
      { name: "Tropical Moist Forest (TMF)", by: "European Commission JRC", lic: "Free use with citation" },
      { name: "ESA WorldCover 2021 (land cover)", by: "ESA WorldCover consortium", lic: "CC-BY 4.0" },
      { name: "RADD deforestation alerts", by: "Wageningen University (WUR) / Global Forest Watch", lic: "CC-BY 4.0" }
    ]},
    { group: "Fire", items: [
      { name: "Active fire detections (VIIRS / MODIS)", by: "NASA FIRMS / LANCE", lic: "Open data" }
    ]},
    { group: "Terrain & climate", items: [
      { name: "Elevation / hillshade (AW3D30 planned; Esri hillshade interim)", by: "JAXA / Esri", lic: "Provider terms" },
      { name: "Climate normals (annual rainfall)", by: "WorldClim", lic: "Free for academic use" },
      { name: "Southern Oscillation Index", by: "Australian Bureau of Meteorology", lic: "BoM terms" }
    ]},
    { group: "Water", items: [
      { name: "Catchments & waterways", by: "WWF HydroSHEDS", lic: "Free use with attribution" }
    ]},
    { group: "Protected areas & boundaries", items: [
      { name: "World Database on Protected Areas (WDPA)", by: "UNEP-WCMC & IUCN / Protected Planet", lic: "Protected Planet terms" },
      { name: "Administrative & interim protected-area boundaries", by: "PNG official sources / project", lic: "As provided" }
    ]},
    { group: "Document archives", items: [
      { name: "Managalas archive", by: "Partners With Melanesians", lic: "In-portal view only" },
      { name: "QABB catalogue", by: "Conservation International / OPRA and contributors", lic: "Catalogue only — pending permission" },
      { name: "CSIRO Land Research Series catalogue", by: "CSIRO", lic: "Catalogue only — no permission to share" }
    ]}
  ];

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return (s || "").replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  // A logo image that degrades to a text chip if the file is missing.
  function logo(p, big) {
    var wrap = el(p.url ? "a" : "span", "funder" + (big ? " big" : ""));
    if (p.url) { wrap.href = p.url; wrap.target = "_blank"; wrap.rel = "noopener"; }
    wrap.title = p.name + (p.role ? " — " + p.role : "");
    var img = new Image();
    img.alt = p.name; img.className = "funder-img";
    img.onerror = function () { wrap.replaceChild(el("span", "funder-chip", esc(p.short)), img); };
    img.src = p.logo;
    wrap.appendChild(img);
    return wrap;
  }

  // Compact footer strip: logos + funding line + link to full credits.
  function renderStrip(host) {
    host.innerHTML = "";
    var row = el("div", "funders");
    PARTNERS.forEach(function (p) { row.appendChild(logo(p, false)); });
    host.appendChild(row);
    var fund = el("div", "funding-line",
      '<img class="eu-mini" src="' + FUNDING.emblem + '" alt="European Union" /> ' +
      esc(FUNDING.line) + " " + esc(FUNDING.programme) +
      ' · <a href="credits.html">Credits &amp; data sources →</a>');
    host.appendChild(fund);
  }

  // Full credits page.
  function renderFull(host) {
    host.innerHTML = "";
    var f = el("section", "cr-fund");
    f.appendChild(el("img", "cr-emblem"));
    f.querySelector(".cr-emblem").src = FUNDING.emblem;
    f.querySelector(".cr-emblem").alt = "European Union";
    f.appendChild(el("div", null,
      '<div class="cr-fund-line">' + esc(FUNDING.line) + "</div>" +
      '<div class="cr-fund-prog">' + esc(FUNDING.programme) + "</div>" +
      '<p class="cr-disc">' + esc(FUNDING.disclaimer) + "</p>"));
    host.appendChild(el("h2", null, "Partners"));
    var prow = el("div", "funders big");
    PARTNERS.forEach(function (p) { prow.appendChild(logo(p, true)); });
    host.appendChild(prow);
    host.appendChild(el("h2", null, "Data sources"));
    host.appendChild(el("p", "cr-lead", "The portal brings together open and licensed datasets. Each is credited to its provider; use is governed by the licence shown."));
    DATA.forEach(function (g) {
      host.appendChild(el("h3", "cr-grp", esc(g.group)));
      var t = el("table", "cr-table",
        "<thead><tr><th>Dataset</th><th>Provider</th><th>Licence / terms</th></tr></thead><tbody>" +
        g.items.map(function (i) {
          return "<tr><td>" + esc(i.name) + "</td><td>" + esc(i.by) + "</td><td>" + esc(i.lic) + "</td></tr>";
        }).join("") + "</tbody>");
      host.appendChild(t);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var strip = document.getElementById("siteCredits");
    if (strip) renderStrip(strip);
    var full = document.getElementById("creditsFull");
    if (full) renderFull(full);
  });
})();
