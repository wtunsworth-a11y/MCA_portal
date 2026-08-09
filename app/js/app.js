/*
 * Oro Data Portal — Phase 1 MVP map application
 * Renders the Managalas / Oro map with MapLibre GL JS, driven by config.js.
 */
(function () {
  "use strict";
  var CFG = window.PORTAL_CONFIG;

  // --- Build a MapLibre style from the configured basemaps -------------------
  var defaultBase = CFG.basemaps.find(function (b) { return b.default; }) || CFG.basemaps[0];
  var sources = {};
  var baseLayers = [];
  CFG.basemaps.forEach(function (b) {
    if (!b.tiles || !b.tiles.length) return;  // e.g. the "No basemap" option
    sources[b.id] = { type: "raster", tiles: b.tiles, tileSize: 256, attribution: b.attribution };
    baseLayers.push({
      id: "base-" + b.id, type: "raster", source: b.id,
      layout: { visibility: b.id === defaultBase.id ? "visible" : "none" }
    });
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
    if (l.requiresKey) {
      var k = CFG.keys[l.requiresKey];
      return { usable: !!k, reason: k ? "" : "Needs API key in config.js" };
    }
    if (l.requiresEndpoint) {
      var has = l.tiles && l.tiles[0];
      return { usable: !!has, reason: has ? "" : "Needs GEE tile endpoint in config.js" };
    }
    return { usable: true, reason: "" };
  }

  // --- Add live layers to the map -------------------------------------------
  function addLayer(l) {
    if (map.getSource("src-" + l.id)) return;
    if (l.kind === "raster") {
      var tiles = l.tiles;
      if (l.requiresKey && CFG.keys[l.requiresKey]) {
        tiles = l.tiles.map(function (t) { return t.replace(/{key}/g, CFG.keys[l.requiresKey]); });
      }
      map.addSource("src-" + l.id, { type: "raster", tiles: tiles, tileSize: 256, attribution: l.attribution });
      map.addLayer({ id: "lyr-" + l.id, type: "raster", source: "src-" + l.id,
        paint: { "raster-opacity": l.opacity != null ? l.opacity : 1 },
        layout: { visibility: l.visible ? "visible" : "none" } });
    } else if (l.kind === "geojson") {
      fetch(l.url).then(function (r) { return r.json(); }).then(function (gj) {
        map.addSource("src-" + l.id, { type: "geojson", data: gj });
        map.addLayer({ id: "lyr-" + l.id + "-fill", type: "fill", source: "src-" + l.id,
          paint: { "fill-color": l.style.fill, "fill-outline-color": l.style.color },
          layout: { visibility: l.visible ? "visible" : "none" } });
        var linePaint = { "line-color": l.style.color, "line-width": l.style.weight };
        if (l.style.dash) linePaint["line-dasharray"] = l.style.dash;
        map.addLayer({ id: "lyr-" + l.id, type: "line", source: "src-" + l.id,
          paint: linePaint, layout: { visibility: l.visible ? "visible" : "none" } });
      });
    } else if (l.kind === "firms") {
      var key = CFG.keys[l.requiresKey];
      if (!key) return;
      var a = l.api;
      var url = "https://firms.modaps.eosdis.nasa.gov/api/area/csv/" + key + "/" + a.source + "/" + a.area + "/" + a.days;
      fetch(url).then(function (r) { return r.text(); }).then(function (csv) {
        var feats = parseFirmsCsv(csv);
        map.addSource("src-" + l.id, { type: "geojson", data: { type: "FeatureCollection", features: feats } });
        map.addLayer({ id: "lyr-" + l.id, type: "circle", source: "src-" + l.id,
          paint: { "circle-radius": 4, "circle-color": "#ff3b30", "circle-stroke-color": "#fff", "circle-stroke-width": 0.6, "circle-opacity": 0.9 },
          layout: { visibility: visibleIds[l.id] ? "visible" : "none" } });
        l._count = feats.length;
        updateLegend();
      }).catch(function () {});
    }
  }

  // Parse a FIRMS area CSV (header row + rows) into GeoJSON point features.
  function parseFirmsCsv(csv) {
    var lines = (csv || "").trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    var head = lines[0].split(",");
    var la = head.indexOf("latitude"), lo = head.indexOf("longitude"),
        dt = head.indexOf("acq_date"), tm = head.indexOf("acq_time"), fr = head.indexOf("frp");
    if (la < 0 || lo < 0) return [];
    var out = [];
    for (var i = 1; i < lines.length; i++) {
      var c = lines[i].split(",");
      var lat = parseFloat(c[la]), lng = parseFloat(c[lo]);
      if (!isFinite(lat) || !isFinite(lng)) continue;
      out.push({ type: "Feature", geometry: { type: "Point", coordinates: [lng, lat] },
        properties: { date: dt >= 0 ? c[dt] : "", time: tm >= 0 ? c[tm] : "", frp: fr >= 0 ? c[fr] : "" } });
    }
    return out;
  }

  var visibleIds = {};
  CFG.layers.forEach(function (l) { if (l.visible && layerState(l).usable) visibleIds[l.id] = true; });

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
    var byTheme = {};
    CFG.layers.forEach(function (l) { (byTheme[l.theme] = byTheme[l.theme] || []).push(l); });

    Object.keys(byTheme).forEach(function (theme) {
      var group = document.createElement("div"); group.className = "theme";
      var h = document.createElement("h4"); h.textContent = theme; group.appendChild(h);

      byTheme[theme].forEach(function (l) {
        var st = layerState(l);
        var row = document.createElement("label"); row.className = "layer" + (st.usable ? "" : " disabled");
        var cb = document.createElement("input"); cb.type = "checkbox";
        cb.checked = !!l.visible && st.usable; cb.disabled = !st.usable;
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

  // Add data layers once the style is parsed. We key off "style.load" rather
  // than "load": "load" waits for the first full tile render, so on a slow or
  // unreachable basemap it can stall for a long time — we never want the layer
  // panel or the vector boundaries to wait on basemap tiles (important for the
  // low-bandwidth connections this portal must serve).
  function addDataLayers() {
    CFG.layers.forEach(function (l) { if (layerState(l).usable) addLayer(l); });
  }
  if (map.isStyleLoaded && map.isStyleLoaded()) addDataLayers();
  else map.on("style.load", addDataLayers);

  // The sidebar UI only reads config + the DOM, so build it immediately —
  // it must be usable even if the basemap never finishes loading.
  buildPanel();
  buildBasemapSwitch();
  updateLegend();
  document.getElementById("boundary-btn").addEventListener("click", function () {
    map.flyTo({ center: CFG.view.center, zoom: CFG.view.zoom });
  });
  var provBtn = document.getElementById("province-btn");
  if (provBtn) provBtn.addEventListener("click", function () {
    // Oro (Northern) Province bounds [SW, NE]
    map.fitBounds([[147.00, -9.98], [149.44, -8.00]], { padding: 30 });
  });
})();
