/*
 * Oro Data Portal — Phase 1 MVP map application
 * Renders the Oro / Managalas map with MapLibre GL JS, driven by config.js.
 * GEE layers are pre-rendered by the update-gee GitHub Action as single PNG
 * images clipped to Oro and committed to data/gee_<key>.png; the map overlays
 * that same-origin image. This sidesteps CORS (Earth Engine's tile server does
 * not send CORS headers, which MapLibre's WebGL raster requires) and means the
 * browser never calls Earth Engine directly. data/gee_tiles.json lists the
 * image path + the bbox the image covers.
 */
(function () {
  "use strict";
  var CFG = window.PORTAL_CONFIG;
  var GEE = {};                               // { geeKey: { png } } from gee_tiles.json
  var GEE_BBOX = [146.8, -10.0, 149.7, -7.9]; // w,s,e,n the GEE images cover
  var visibleIds = {};
  var DEFOR = null;                           // deforestation time series (defor_series.json)
  var deforYear = null;                       // currently-selected slider year
  var deforTimer = null;                      // ▶ animation interval

  // --- Build a MapLibre style from the configured basemaps -------------------
  var defaultBase = CFG.basemaps.find(function (b) { return b.default; }) || CFG.basemaps[0];
  var sources = {}, baseLayers = [];
  CFG.basemaps.forEach(function (b) {
    if (!b.tiles || !b.tiles.length) return;  // e.g. the "No basemap" option
    sources[b.id] = { type: "raster", tiles: b.tiles, tileSize: 256, attribution: b.attribution };
    baseLayers.push({ id: "base-" + b.id, type: "raster", source: b.id,
      layout: { visibility: b.id === defaultBase.id ? "visible" : "none" } });
  });

  var map = new maplibregl.Map({
    container: "map",
    style: { version: 8, sources: sources, layers: baseLayers },
    center: CFG.view.center, zoom: CFG.view.zoom,
    minZoom: CFG.view.minZoom, maxZoom: CFG.view.maxZoom, attributionControl: false
  });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
  map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
  map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: "metric" }), "bottom-left");

  // --- Resolve a layer's usability ------------------------------------------
  function layerState(l) {
    if (l.kind === "backend") return { usable: false, reason: "Sign in for access" };
    if (l.kind === "gee") { var t = GEE[l.geeKey]; return { usable: !!(t && t.png), reason: (t && t.png) ? "" : "Coming soon" }; }
    if (l.kind === "defor_series") { var ok = !!(DEFOR && DEFOR.images && DEFOR.years && DEFOR.years.length); return { usable: ok, reason: ok ? "" : "Coming soon" }; }
    if (l.requiresKey) { var k = CFG.keys[l.requiresKey]; return { usable: !!k, reason: k ? "" : "Coming soon" }; }
    if (l.requiresEndpoint) { var has = l.tiles && l.tiles[0]; return { usable: !!has, reason: has ? "" : "Coming soon" }; }
    return { usable: true, reason: "" };
  }

  // --- Add live layers to the map -------------------------------------------
  function addLayer(l) {
    if (map.getSource("src-" + l.id)) return;
    if (l.kind === "gee") {
      // Single PNG clipped to Oro, committed same-origin by the update-gee Action.
      var g = GEE[l.geeKey];
      if (!g || !g.png) return;
      var b = GEE_BBOX, w = b[0], s = b[1], e = b[2], n = b[3];
      map.addSource("src-" + l.id, { type: "image",
        url: g.png + (g.png.indexOf("?") < 0 ? "?" : "&") + "t=" + Date.now(),
        coordinates: [[w, n], [e, n], [e, s], [w, s]] });
      map.addLayer({ id: "lyr-" + l.id, type: "raster", source: "src-" + l.id,
        paint: { "raster-opacity": l.opacity != null ? l.opacity : 1 },
        layout: { visibility: visibleIds[l.id] ? "visible" : "none" } });
    } else if (l.kind === "defor_series") {
      // Cumulative deforestation stack; the slider swaps this one image source.
      if (!DEFOR || !DEFOR.images) return;
      var db = DEFOR.bbox || GEE_BBOX, dw = db[0], ds = db[1], de = db[2], dn = db[3];
      if (deforYear == null) deforYear = DEFOR.years[DEFOR.years.length - 1];
      map.addSource("src-" + l.id, { type: "image", url: DEFOR.images[String(deforYear)],
        coordinates: [[dw, dn], [de, dn], [de, ds], [dw, ds]] });
      map.addLayer({ id: "lyr-" + l.id, type: "raster", source: "src-" + l.id,
        paint: { "raster-opacity": l.opacity != null ? l.opacity : 0.9 },
        layout: { visibility: visibleIds[l.id] ? "visible" : "none" } });
    } else if (l.kind === "raster") {
      var tiles = l.tiles;
      if (l.requiresKey && CFG.keys[l.requiresKey]) {
        tiles = l.tiles.map(function (t) { return t.replace(/{key}/g, CFG.keys[l.requiresKey]); });
      }
      map.addSource("src-" + l.id, { type: "raster", tiles: tiles, tileSize: 256, attribution: l.attribution });
      map.addLayer({ id: "lyr-" + l.id, type: "raster", source: "src-" + l.id,
        paint: { "raster-opacity": l.opacity != null ? l.opacity : 1 },
        layout: { visibility: visibleIds[l.id] ? "visible" : "none" } });
    } else if (l.kind === "geojson") {
      fetch(l.url).then(function (r) { return r.json(); }).then(function (gj) {
        map.addSource("src-" + l.id, { type: "geojson", data: gj });
        map.addLayer({ id: "lyr-" + l.id + "-fill", type: "fill", source: "src-" + l.id,
          paint: { "fill-color": l.style.fill, "fill-outline-color": l.style.color },
          layout: { visibility: visibleIds[l.id] ? "visible" : "none" } });
        var linePaint = { "line-color": l.style.color, "line-width": l.style.weight };
        if (l.style.dash) linePaint["line-dasharray"] = l.style.dash;
        map.addLayer({ id: "lyr-" + l.id, type: "line", source: "src-" + l.id,
          paint: linePaint, layout: { visibility: visibleIds[l.id] ? "visible" : "none" } });
      });
    } else if (l.kind === "points") {
      // cache-bust: this file is refreshed periodically, so always fetch the latest
      var bust = l.url + (l.url.indexOf("?") < 0 ? "?" : "&") + "t=" + Date.now();
      fetch(bust).then(function (r) { return r.json(); }).then(function (gj) {
        map.addSource("src-" + l.id, { type: "geojson", data: gj });
        map.addLayer({ id: "lyr-" + l.id, type: "circle", source: "src-" + l.id,
          paint: { "circle-radius": 4, "circle-color": (l.style && l.style.color) || "#ff3b30",
                   "circle-stroke-color": "#fff", "circle-stroke-width": 0.6, "circle-opacity": 0.9 },
          layout: { visibility: visibleIds[l.id] ? "visible" : "none" } });
        updateLegend();
      }).catch(function () {});
    }
  }

  function setVisible(l, on) {
    // GEE / deforestation images are added lazily on first toggle rather than
    // preloading them all on map init.
    if (on && (l.kind === "gee" || l.kind === "defor_series") && !map.getSource("src-" + l.id)) addLayer(l);
    var ids = ["lyr-" + l.id, "lyr-" + l.id + "-fill"];
    ids.forEach(function (id) { if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", on ? "visible" : "none"); });
    visibleIds[l.id] = on;
    if (l.kind === "defor_series") toggleDeforCtl(on);
    updateLegend();
  }

  // --- Legend (reflects the currently-visible layers) -----------------------
  function escapeHtml(s) { return (s || "").replace(/[&<>"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function swatch(color, label, line) {
    return '<div class="lg-row"><i class="lg-sw' + (line ? " line" : "") + '" style="background:' + color + '"></i>' +
      '<span>' + escapeHtml(label) + "</span></div>";
  }
  function updateLegend() {
    var box = document.getElementById("legend"); if (!box) return;
    var rows = [];
    CFG.layers.forEach(function (l) {
      if (!visibleIds[l.id]) return;
      if (l.legend && l.legend.length) {
        rows.push('<div class="lg-t">' + escapeHtml(l.name) + "</div>");
        l.legend.forEach(function (g) { rows.push(swatch(g.color, g.label)); });
      } else if (l.kind === "geojson" && l.style) {
        rows.push(swatch(l.style.color, l.name, true));
      }
    });
    box.innerHTML = rows.length ? '<div class="lg-h">Legend</div>' + rows.join("") : "";
    box.style.display = rows.length ? "" : "none";
  }

  // --- Build the layer panel, grouped by theme ------------------------------
  function buildPanel() {
    var panel = document.getElementById("layers");
    panel.innerHTML = "";
    var byTheme = {}, order = [];
    CFG.layers.forEach(function (l) { if (!byTheme[l.theme]) { byTheme[l.theme] = []; order.push(l.theme); } byTheme[l.theme].push(l); });
    order.forEach(function (theme) {
      var group = document.createElement("div"); group.className = "theme";
      var h = document.createElement("h4"); h.textContent = theme; group.appendChild(h);
      byTheme[theme].forEach(function (l) {
        var st = layerState(l);
        var row = document.createElement("label"); row.className = "layer" + (st.usable ? "" : " disabled");
        var cb = document.createElement("input"); cb.type = "checkbox";
        cb.checked = !!visibleIds[l.id]; cb.disabled = !st.usable;
        cb.addEventListener("change", function () { setVisible(l, cb.checked); });
        var span = document.createElement("span"); span.className = "name"; span.textContent = l.name;
        row.appendChild(cb); row.appendChild(span);
        if (!st.usable) { var tag = document.createElement("em"); tag.className = "tag"; tag.textContent = st.reason; row.appendChild(tag); }
        if (l.legend) l.legend.forEach(function (lg) {
          var sw = document.createElement("i"); sw.className = "swatch"; sw.style.background = lg.color; sw.title = lg.label; row.appendChild(sw);
        });
        group.appendChild(row);
      });
      panel.appendChild(group);
    });
  }

  // --- Basemap switcher ------------------------------------------------------
  function buildBasemapSwitch() {
    var sel = document.getElementById("basemap");
    sel.innerHTML = "";
    CFG.basemaps.forEach(function (b) {
      var o = document.createElement("option"); o.value = b.id; o.textContent = b.name; o.selected = b.default; sel.appendChild(o);
    });
    sel.addEventListener("change", function () {
      CFG.basemaps.forEach(function (b) {
        var id = "base-" + b.id;
        if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", b.id === sel.value ? "visible" : "none");
      });
    });
  }

  // --- Deforestation timeline slider (drives the defor_series image source) --
  function setDeforIndex(i) {
    if (!DEFOR) return;
    i = Math.max(0, Math.min(DEFOR.years.length - 1, i));
    deforYear = DEFOR.years[i];
    var r = document.getElementById("defor-range"); if (r) r.value = i;
    var lab = document.getElementById("defor-year"); if (lab) lab.textContent = deforYear;
    var src = map.getSource("src-defor_timeline");
    if (src && src.updateImage) src.updateImage({ url: DEFOR.images[String(deforYear)] });
    [i + 1, i - 1, i + 2].forEach(function (k) {   // preload neighbours for smooth scrubbing
      if (k >= 0 && k < DEFOR.years.length) { var im = new Image(); im.src = DEFOR.images[String(DEFOR.years[k])]; }
    });
  }
  function stopPlay() { if (deforTimer) { clearInterval(deforTimer); deforTimer = null; }
    var p = document.getElementById("defor-play"); if (p) p.textContent = "▶"; }
  function startPlay() {
    var p = document.getElementById("defor-play"); if (p) p.textContent = "⏸";
    deforTimer = setInterval(function () {
      var r = document.getElementById("defor-range"); var i = (r ? +r.value : 0) + 1;
      if (i > DEFOR.years.length - 1) i = 0;
      setDeforIndex(i);
    }, 700);
  }
  function buildDeforCtl() {
    if (document.getElementById("defor-ctl") || !DEFOR) return;
    var last = DEFOR.years.length - 1;
    var box = document.createElement("div"); box.id = "defor-ctl"; box.hidden = true;
    var play = document.createElement("button"); play.id = "defor-play"; play.type = "button";
    play.title = "Play / pause"; play.textContent = "▶";
    var range = document.createElement("input"); range.type = "range"; range.id = "defor-range";
    range.min = 0; range.max = last; range.step = 1; range.value = last;
    range.setAttribute("aria-label", "Deforestation year");
    var lab = document.createElement("span"); lab.id = "defor-year"; lab.textContent = DEFOR.years[last];
    box.appendChild(play); box.appendChild(range); box.appendChild(lab);
    document.getElementById("map").appendChild(box);
    range.addEventListener("input", function () { stopPlay(); setDeforIndex(+range.value); });
    play.addEventListener("click", function () { deforTimer ? stopPlay() : startPlay(); });
  }
  function toggleDeforCtl(on) {
    if (on) buildDeforCtl();
    var box = document.getElementById("defor-ctl"); if (box) box.hidden = !on;
    if (!on) stopPlay();
  }

  function addDataLayers() { CFG.layers.forEach(function (l) {
    if (!layerState(l).usable) return;
    if ((l.kind === "gee" || l.kind === "defor_series") && !visibleIds[l.id]) return;  // lazy — added when toggled on
    addLayer(l);
  }); }
  function markVisible() { CFG.layers.forEach(function (l) { if (l.visible && layerState(l).usable) visibleIds[l.id] = true; }); }

  // --- Synchronous init: boundaries, fire and all non-GEE layers must NEVER
  // wait on the GEE fetch. We key data-layer adding off "style.load" (not
  // "load") so a slow/unreachable basemap never stalls the vector boundaries or
  // the panel — important for low-bandwidth Oro. addLayer is idempotent.
  markVisible();
  map.on("style.load", addDataLayers);
  if (map.isStyleLoaded && map.isStyleLoaded()) addDataLayers();
  buildPanel();
  buildBasemapSwitch();
  updateLegend();
  document.getElementById("boundary-btn").addEventListener("click", function () {
    map.flyTo({ center: CFG.view.center, zoom: CFG.view.zoom });
  });
  var provBtn = document.getElementById("province-btn");
  if (provBtn) provBtn.addEventListener("click", function () {
    map.fitBounds([[147.00, -9.98], [149.44, -8.00]], { padding: 30 });
  });

  // --- GEE image paths arrive asynchronously (refreshed by the update-gee Action);
  // enable those layers when they land. Always resolves — a missing file just
  // leaves the GEE layers showing "Coming soon".
  fetch("data/gee_tiles.json?t=" + Date.now())
    .then(function (r) { return r.ok ? r.json() : {}; })
    .catch(function () { return {}; })
    .then(function (j) {
      GEE = (j && j.layers) || {};
      if (j && j.bbox && j.bbox.length === 4) GEE_BBOX = j.bbox;
      markVisible();
      if (map.isStyleLoaded && map.isStyleLoaded()) addDataLayers();  // add now-usable GEE layers (idempotent)
      buildPanel();     // rebuild so GEE rows switch from "awaiting" to enabled
      updateLegend();
    });

  // --- Deforestation time series (pre-rendered by the update-defor-series Action).
  fetch("data/defor_series.json?t=" + Date.now())
    .then(function (r) { return r.ok ? r.json() : null; })
    .catch(function () { return null; })
    .then(function (j) {
      if (!j || !j.images || !j.years || !j.years.length) return;
      DEFOR = j; deforYear = j.years[j.years.length - 1];
      markVisible();
      if (map.isStyleLoaded && map.isStyleLoaded()) addDataLayers();
      buildPanel();     // rebuild so the timeline row switches from "Coming soon" to enabled
      updateLegend();
      CFG.layers.forEach(function (l) { if (l.kind === "defor_series" && visibleIds[l.id]) toggleDeforCtl(true); });
    });
})();
