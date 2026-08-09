/*
 * Oro Data Portal — Phase 1 MVP map application
 * Renders the Oro / Managalas map with MapLibre GL JS, driven by config.js.
 * GEE layers get their tile URLs from data/gee_tiles.json (refreshed by the
 * update-gee GitHub Action); the browser never calls Earth Engine directly.
 */
(function () {
  "use strict";
  var CFG = window.PORTAL_CONFIG;
  var GEE = {};            // { geeKey: { url, attribution } } from gee_tiles.json
  var visibleIds = {};

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
    if (l.kind === "backend") return { usable: false, reason: "Requires login (see access tiers)" };
    if (l.kind === "gee") { var t = GEE[l.geeKey]; return { usable: !!(t && t.url), reason: (t && t.url) ? "" : "Awaiting the GEE update job" }; }
    if (l.requiresKey) { var k = CFG.keys[l.requiresKey]; return { usable: !!k, reason: k ? "" : "Needs API key in config.js" }; }
    if (l.requiresEndpoint) { var has = l.tiles && l.tiles[0]; return { usable: !!has, reason: has ? "" : "Needs GEE tile endpoint in config.js" }; }
    return { usable: true, reason: "" };
  }

  // --- Add live layers to the map -------------------------------------------
  function addLayer(l) {
    if (map.getSource("src-" + l.id)) return;
    if (l.kind === "raster" || l.kind === "gee") {
      var tiles;
      if (l.kind === "gee") {
        if (!GEE[l.geeKey] || !GEE[l.geeKey].url) return;
        tiles = [GEE[l.geeKey].url];
      } else {
        tiles = l.tiles;
        if (l.requiresKey && CFG.keys[l.requiresKey]) {
          tiles = l.tiles.map(function (t) { return t.replace(/{key}/g, CFG.keys[l.requiresKey]); });
        }
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
    var ids = ["lyr-" + l.id, "lyr-" + l.id + "-fill"];
    ids.forEach(function (id) { if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", on ? "visible" : "none"); });
    visibleIds[l.id] = on;
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

  function addDataLayers() { CFG.layers.forEach(function (l) { if (layerState(l).usable) addLayer(l); }); }

  // Build the UI once we know which GEE layers are available. We key data-layer
  // adding off "style.load" (not "load") so a slow/unreachable basemap never
  // stalls the vector boundaries or the panel — important for low-bandwidth Oro.
  function startUI() {
    CFG.layers.forEach(function (l) { if (l.visible && layerState(l).usable) visibleIds[l.id] = true; });
    if (map.isStyleLoaded && map.isStyleLoaded()) addDataLayers();
    else map.on("style.load", addDataLayers);
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
  }

  // Load the Earth Engine tile URLs (refreshed by the update-gee Action), then
  // build the UI. Always resolves — a missing/failed file just means GEE layers
  // show as "awaiting the GEE update job".
  fetch("data/gee_tiles.json?t=" + Date.now())
    .then(function (r) { return r.ok ? r.json() : {}; })
    .catch(function () { return {}; })
    .then(function (j) { GEE = (j && j.layers) || {}; startUI(); });
})();
