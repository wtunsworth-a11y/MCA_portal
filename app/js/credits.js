/*
 * Oro Data Portal — funders, partners & data-source credits.
 * ------------------------------------------------------------------
 * Attribution differs by placement (per the project's rules):
 *   - EVERY page footer (#siteCredits): EU + CIFOR-ICRAF + Oro Provincial Gov.
 *   - Title page (home) + Acknowledgements page (credits.html) show the FULL set:
 *     EU + EU-FCCB + CIFOR-ICRAF + Oro Provincial Gov + PNG National Government.
 * Logos render on a white band because the EU "Funded by" lockup and the colour
 * crests need a light background to stay legible on the dark site.
 */
(function () {
  "use strict";

  var FUNDING = {
    lockup: "img/eu-funded.png",   // official "Funded by the European Union" lockup (horizontal)
    programme: "under the EU-FCCB programme (Papua New Guinea)",
    disclaimer: "Views and opinions expressed are those of the authors only and do not " +
      "necessarily reflect those of the European Union or the funding programme. " +
      "Neither the European Union nor the granting authority can be held responsible for them."
  };

  // Partner logos (the EU funder is shown via the funding lockup above).
  var P = {
    fccb:  { name: "EU-FCCB — Papua New Guinea", short: "EU-FCCB PNG", url: "", logo: "img/eu-fccb.png" },
    cifor: { name: "CIFOR-ICRAF", short: "CIFOR-ICRAF", url: "https://www.cifor-icraf.org", logo: "img/cifor-icraf.png" },
    opg:   { name: "Oro Provincial Government", short: "Oro Provincial Government", url: "", logo: "img/opg.png" },
    gov:   { name: "Government of Papua New Guinea", short: "PNG Government", url: "", logo: "img/dnpm.png" }
  };
  // Every page: EU + CIFOR-ICRAF + OPG.
  var FOOTER_PARTNERS = [P.cifor, P.opg];
  // Title & acknowledgements pages: full set.
  var FULL_PARTNERS = [P.fccb, P.cifor, P.opg, P.gov];

  var DATA = [
    { group: "Satellite imagery & basemaps", items: [
      { name: "Esri World Imagery", by: "Esri, Maxar, Earthstar Geographics", lic: "Esri terms of use" },
      { name: "Planet NICFI basemaps", by: "Planet / NICFI programme", lic: "NICFI programme terms" },
      { name: "OpenStreetMap", by: "© OpenStreetMap contributors", lic: "ODbL" },
      { name: "OpenTopoMap", by: "OpenTopoMap", lic: "CC-BY-SA" }
    ]},
    { group: "Forest cover & change", items: [
      { name: "Global Forest Change (tree cover, loss year) — v1.13 / 2025", by: "Hansen / UMD / Google / USGS / NASA", lic: "Free use with citation" },
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

  function logo(p) {
    var wrap = el(p.url ? "a" : "span", "funder");
    if (p.url) { wrap.href = p.url; wrap.target = "_blank"; wrap.rel = "noopener"; }
    wrap.title = p.name;
    var img = new Image();
    img.alt = p.name; img.className = "funder-img";
    img.onerror = function () { wrap.replaceChild(el("span", "funder-chip", esc(p.short)), img); };
    img.src = p.logo;
    wrap.appendChild(img);
    return wrap;
  }

  function euLockup() {
    var a = el("a", "eu-lockup-wrap");
    a.href = "https://european-union.europa.eu"; a.target = "_blank"; a.rel = "noopener";
    a.title = "Funded by the European Union";
    a.innerHTML = '<img class="eu-lockup" src="' + FUNDING.lockup + '" alt="Funded by the European Union" />';
    return a;
  }

  // A white band: EU lockup + the given partner logos.
  function band(host, partners, withLink) {
    host.innerHTML = "";
    var row = el("div", "funders");
    row.appendChild(euLockup());
    partners.forEach(function (p) { row.appendChild(logo(p)); });
    host.appendChild(row);
    if (withLink) {
      host.appendChild(el("div", "funding-line",
        esc("Funded by the European Union " + FUNDING.programme) +
        ' · <a href="credits.html">Credits &amp; data sources →</a>'));
    }
  }

  function renderFull(host) {
    host.innerHTML = "";
    var f = el("section", "cr-fund");
    f.appendChild(el("img", "cr-lockup"));
    f.querySelector(".cr-lockup").src = FUNDING.lockup;
    f.querySelector(".cr-lockup").alt = "Funded by the European Union";
    f.appendChild(el("div", null,
      '<div class="cr-fund-prog">' + esc(FUNDING.programme) + "</div>" +
      '<p class="cr-disc">' + esc(FUNDING.disclaimer) + "</p>"));
    host.appendChild(f);

    host.appendChild(el("h2", null, "Partners"));
    var pb = el("div", "funders big band");
    FULL_PARTNERS.forEach(function (p) { pb.appendChild(logo(p)); });
    host.appendChild(pb);

    host.appendChild(el("h2", null, "Data sources"));
    host.appendChild(el("p", "cr-lead", "The portal brings together open and licensed datasets. Each is credited to its provider; use is governed by the licence shown."));
    DATA.forEach(function (g) {
      host.appendChild(el("h3", "cr-grp", esc(g.group)));
      host.appendChild(el("table", "cr-table",
        "<thead><tr><th>Dataset</th><th>Provider</th><th>Licence / terms</th></tr></thead><tbody>" +
        g.items.map(function (i) { return "<tr><td>" + esc(i.name) + "</td><td>" + esc(i.by) + "</td><td>" + esc(i.lic) + "</td></tr>"; }).join("") +
        "</tbody>"));
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var footer = document.getElementById("siteCredits");   // every page
    // data-set="full" (home/title page) shows all partners; default shows EU+CIFOR+OPG.
    if (footer) band(footer, footer.getAttribute("data-set") === "full" ? FULL_PARTNERS : FOOTER_PARTNERS, true);
    var full = document.getElementById("creditsFull");     // acknowledgements page
    if (full) renderFull(full);
  });
})();
