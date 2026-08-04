/* Landing page — builds the dataset cards and the document teaser. */
(function () {
  "use strict";

  // The eleven thematic datasets (public copy; each opens the map).
  var THEMES = [
    { nm: "Topography", src: "Elevation, slope & hillshade — JAXA AW3D30", dot: "#9c8b6b", tier: "public" },
    { nm: "Forest cover", src: "Tropical moist forest extent — JRC TMF", dot: "#2ea56b", tier: "public" },
    { nm: "Forest change", src: "Loss, degradation & RADD alerts — TMF / Hansen", dot: "#ff4d4d", tier: "public" },
    { nm: "Fire", src: "Active-fire detections — NASA FIRMS", dot: "#ff8c42", tier: "public" },
    { nm: "Water", src: "Catchments, waterways & flows — HydroSHEDS / BASINS", dot: "#4aa8ff", tier: "public" },
    { nm: "Weather", src: "Climate normals & seasonality — WorldClim", dot: "#7fb0c9", tier: "public" },
    { nm: "Biodiversity", src: "PSP/NFI, surveys, sightings & IUCN Red List", dot: "#c98bd8", tier: "reg" },
    { nm: "Southern Oscillation Index", src: "ENSO state & fire risk — Australian BoM", dot: "#4aa8ff", tier: "public" },
    { nm: "Soil", src: "Soil resources & classification — PNGRIS", dot: "#c0895f", tier: "partner" },
    { nm: "Ecosystem services", src: "Carbon & service values — LUMENS", dot: "#5fc0a0", tier: "partner" },
    { nm: "Crop suitability", src: "Land evaluation — PNGLES with DAL", dot: "#d8c15f", tier: "partner" }
  ];
  var TIER_LABEL = { public: "PUBLIC", reg: "REGISTERED", partner: "PARTNER" };

  function badge(t) { return '<span class="badge ' + t + '">' + TIER_LABEL[t] + "</span>"; }

  var host = document.getElementById("datasetCards");
  host.innerHTML = THEMES.map(function (t) {
    return '<a class="card" href="map.html">' +
      '<div class="top"><span class="dot" style="background:' + t.dot + '"></span>' +
      '<span class="nm">' + t.nm + "</span></div>" +
      '<div class="src">' + t.src + "</div>" +
      '<div class="foot">' + badge(t.tier) + '<span class="arrow">→</span></div></a>';
  }).join("");

  // Document teaser — 3 most recent public/registered docs.
  var docs = (window.PORTAL_DOCS || []).slice()
    .sort(function (a, b) { return a.date < b.date ? 1 : -1; })
    .filter(function (d) { return d.tier !== "partner"; })
    .slice(0, 3);
  var TIER_DOT = { public: "#3ddc84", reg: "#4aa8ff", partner: "#f5b301" };
  document.getElementById("docTeaser").innerHTML = docs.map(function (d) {
    return '<a class="card" href="library.html">' +
      '<div class="top"><span class="dot" style="background:' + TIER_DOT[d.tier] + '"></span>' +
      '<span class="nm">' + d.title + "</span></div>" +
      '<div class="src">' + d.desc + "</div>" +
      '<div class="foot"><span class="badge">' + d.category + " · " + d.type +
      '</span><span class="arrow">→</span></div></a>';
  }).join("");
})();
