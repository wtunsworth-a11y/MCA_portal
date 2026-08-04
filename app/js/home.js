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

  // Archive cards — the historical document collections.
  var TIER_DOT = { public: "#3ddc84", reg: "#4aa8ff", partner: "#f5b301" };
  var reg = (window.PORTAL_ARCHIVES && window.PORTAL_ARCHIVES.registry) || [];
  document.getElementById("archiveCards").innerHTML = reg.map(function (a) {
    var indexed = a.status === "indexed";
    return '<a class="card" href="library.html">' +
      '<div class="top"><span class="dot" style="background:' + TIER_DOT[a.tier] + '"></span>' +
      '<span class="nm">' + a.name + "</span></div>" +
      '<div class="src">' + a.blurb + "</div>" +
      '<div class="foot"><span class="badge">' +
      (indexed ? a.docs + " docs · " + a.pages + " pp" : "planned") +
      '</span><span class="arrow">→</span></div></a>';
  }).join("");
})();
