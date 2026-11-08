/* Landing page — builds the dataset cards and the document teaser. */
(function () {
  "use strict";

  // The eleven thematic datasets (public copy; each opens the map).
  var THEMES = [
    { nm: "Topography", src: "Shaded relief — Esri (JAXA AW3D30 to follow)", dot: "#9c8b6b", tier: "public" },
    { nm: "Forest cover", src: "Tree cover 2000 (Hansen) & forest 2020 (JRC GFC2020)", dot: "#2ea56b", tier: "public" },
    { nm: "Forest change", src: "Loss & near-real-time alerts — Hansen / GLAD-L / JRC TMF", dot: "#ff4d4d", tier: "public" },
    { nm: "Fire", src: "Active-fire detections — NASA FIRMS", dot: "#ff8c42", tier: "public" },
    { nm: "Water", src: "Catchments, waterways & flows — HydroSHEDS / BASINS", dot: "#4aa8ff", tier: "public" },
    { nm: "Weather", src: "Climate normals & seasonality — WorldClim", dot: "#7fb0c9", tier: "public" },
    { nm: "Biodiversity", src: "PSP/NFI, surveys, sightings & IUCN Red List", dot: "#c98bd8", tier: "reg" },
    { nm: "Southern Oscillation Index", src: "ENSO state & fire risk — NOAA CPC", dot: "#4aa8ff", tier: "public" },
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
  // Live fire card — read the committed FIRMS feed and show the real count.
  (function () {
    var big = document.getElementById("fireBig"), sub = document.getElementById("fireSub");
    if (!big) return;
    fetch("data/fires.geojson").then(function (r) { return r.json(); }).then(function (d) {
      var n = (d.features || []).length;
      var days = d.days || null;
      big.textContent = String(n);
      sub.textContent = "VIIRS/MODIS active-fire detections" +
        (days ? " · last " + days + " day" + (days === 1 ? "" : "s") : "") + " (NASA FIRMS)";
    }).catch(function () {
      big.textContent = "—";
      sub.textContent = "Fire feed unavailable — open the fire layer on the map.";
    });
  })();

  // Live GLAD-L card — read the committed GLAD summary (count of >=2 ha clearing
  // alerts in the last 90 days to the feed's latest date).
  (function () {
    var big = document.getElementById("gladBig"), sub = document.getElementById("gladSub");
    if (!big) return;
    fetch("data/glad.json").then(function (r) { return r.json(); }).then(function (d) {
      if (d && typeof d.events_gt2ha === "number") {
        big.textContent = String(d.events_gt2ha);
        var to = "";
        if (d.data_latest) { var dt = new Date(d.data_latest);
          if (!isNaN(dt)) to = " to " + dt.toLocaleDateString(undefined, { month: "short", year: "numeric" }); }
        sub.textContent = "Landsat clearing alerts >2 ha · " + (d.window_days || 90) + " days" + to +
          (typeof d.area_ha === "number" ? " · " + d.area_ha.toLocaleString() + " ha" : "") +
          " (GLAD-L / UMD)";
      } else {
        big.style.fontSize = "22px"; big.style.lineHeight = "1.3";
        big.textContent = "GLAD-L";
        sub.textContent = "Near-real-time Landsat clearing alerts — feed is being wired in.";
      }
    }).catch(function () {
      big.style.fontSize = "22px"; big.style.lineHeight = "1.3";
      big.textContent = "GLAD-L";
      sub.textContent = "Landsat deforestation alerts >2 ha · last 90 days (GLAD-L / UMD).";
    });
  })();

  // Live SOI card — read the committed NOAA CPC SOI feed.
  (function () {
    var big = document.getElementById("soiBig"), sub = document.getElementById("soiSub");
    if (!big) return;
    fetch("data/soi.json").then(function (r) { return r.json(); }).then(function (d) {
      if (d && typeof d.value === "number") {
        big.textContent = (d.value > 0 ? "+" : "") + d.value.toFixed(1);
        sub.textContent = (d.phase || "SOI") + (d.month ? " · " + d.month : "") +
          " · " + (d.source || "NOAA CPC SOI");
      } else {
        big.style.fontSize = "22px"; big.style.lineHeight = "1.3";
        big.textContent = "ENSO watch";
        sub.textContent = "Southern Oscillation Index feed is being wired in (NOAA CPC).";
      }
    }).catch(function () {
      big.style.fontSize = "22px"; big.style.lineHeight = "1.3";
      big.textContent = "ENSO watch";
      sub.textContent = "Southern Oscillation Index — ENSO state & drier-phase fire risk.";
    });
  })();

  var TIER_DOT = { public: "#3ddc84", reg: "#4aa8ff", partner: "#f5b301" };
  var reg = (window.PORTAL_ARCHIVES && window.PORTAL_ARCHIVES.registry) || [];
  document.getElementById("archiveCards").innerHTML = reg.map(function (a) {
    var indexed = a.status === "indexed";
    return '<a class="card" href="library.html">' +
      '<div class="top"><span class="dot" style="background:' + TIER_DOT[a.tier] + '"></span>' +
      '<span class="nm">' + a.name + "</span></div>" +
      '<div class="src">' + a.blurb + "</div>" +
      '<div class="foot"><span class="badge">' +
      (a.restricted ? a.docs + " titles · catalogue" : (indexed ? a.docs + " docs · " + a.pages + " pp" : "planned")) +
      '</span><span class="arrow">→</span></div></a>';
  }).join("");
})();
