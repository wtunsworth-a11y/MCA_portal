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
      map.addSource("src-" + l.id, { type: "raster", tiles: l.tiles, tileSize: 256, attribution: l.attribution });
      map.addLayer({ id: "lyr-" + l.id, type: "raster", source: "src-" + l.id,
        paint: { "raster-opacity": l.opacity != null ? l.opacity : 1 },
        layout: { visibility: l.visible ? "visible" : "none" } });
    } else if (l.kind === "geojson") {
      fetch(l.url).then(function (r) { return r.json(); }).then(function (gj) {
        map.addSource("src-" + l.id, { type: "geojson", data: gj });
        map.addLayer({ id: "lyr-" + l.id + "-fill", type: "fill", source: "src-" + l.id,
          paint: { "fill-color": l.style.fill, "fill-outline-color": l.style.color },
          layout: { visibility: l.visible ? "visible" : "none" } });
        map.addLayer({ id: "lyr-" + l.id, type: "line", source: "src-" + l.id,
          paint: { "line-color": l.style.color, "line-width": l.style.weight },
          layout: { visibility: l.visible ? "visible" : "none" } });
      });
    }
  }

  function setVisible(l, on) {
    var ids = ["lyr-" + l.id, "lyr-" + l.id + "-fill"];
    ids.forEach(function (id) { if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", on ? "visible" : "none"); });
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
        map.setLayoutProperty("base-" + b.id, "visibility", b.id === sel.value ? "visible" : "none");
      });
    });
  }

  map.on("load", function () {
    CFG.layers.forEach(function (l) { if (layerState(l).usable) addLayer(l); });
    buildPanel();
    buildBasemapSwitch();
    document.getElementById("boundary-btn").addEventListener("click", function () {
      map.flyTo({ center: CFG.view.center, zoom: CFG.view.zoom });
    });
  });
})();
