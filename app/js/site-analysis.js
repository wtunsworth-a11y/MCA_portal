/* Site analysis (pilot) — define an Area of Interest and get a local report.
 *
 * Input:  draw a polygon, drop a point (buffered), or upload GeoJSON / KML.
 * Output: area + overlap with the MCA and Oro Province, computed in the browser
 *         (no Earth Engine). Satellite themes (forest loss, canopy, fire, …) are
 *         listed as pending until GEE is connected.
 */
(function () {
  "use strict";

  // ---- geometry helpers (vanilla, geodesic) --------------------------------
  var R = 6378137, D2R = Math.PI / 180, R2D = 180 / Math.PI;
  function ringAreaM2(ring) {
    var a = 0, n = ring.length;
    if (n < 3) return 0;
    for (var i = 0; i < n; i++) {
      var p1 = ring[i], p2 = ring[(i + 1) % n];
      a += (p2[0] - p1[0]) * D2R * (2 + Math.sin(p1[1] * D2R) + Math.sin(p2[1] * D2R));
    }
    return Math.abs(a * R * R / 2);
  }
  function dest(lng, lat, d, brng) {
    var ang = d / R, th = brng * D2R, ph1 = lat * D2R, la1 = lng * D2R;
    var ph2 = Math.asin(Math.sin(ph1) * Math.cos(ang) + Math.cos(ph1) * Math.sin(ang) * Math.cos(th));
    var la2 = la1 + Math.atan2(Math.sin(th) * Math.sin(ang) * Math.cos(ph1),
                               Math.cos(ang) - Math.sin(ph1) * Math.sin(ph2));
    return [la2 * R2D, ph2 * R2D];
  }
  function circleRing(lng, lat, radiusM, steps) {
    steps = steps || 64; var ring = [];
    for (var i = 0; i <= steps; i++) ring.push(dest(lng, lat, radiusM, i * 360 / steps));
    return ring;
  }
  function bboxOf(ring) {
    var xmin = 180, ymin = 90, xmax = -180, ymax = -90;
    ring.forEach(function (p) {
      if (p[0] < xmin) xmin = p[0]; if (p[0] > xmax) xmax = p[0];
      if (p[1] < ymin) ymin = p[1]; if (p[1] > ymax) ymax = p[1];
    });
    return [xmin, ymin, xmax, ymax];
  }
  function centroidOf(ring) {
    var x = 0, y = 0, n = ring.length;
    for (var i = 0; i < n; i++) { x += ring[i][0]; y += ring[i][1]; }
    return [x / n, y / n];
  }
  function pointInRing(pt, ring) {
    var x = pt[0], y = pt[1], inside = false;
    for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      var xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  }
  // normalise a GeoJSON geometry to a list of polygons; each polygon = [outerRing, hole, …]
  function polysOf(geom) {
    if (!geom) return [];
    if (geom.type === "Polygon") return [geom.coordinates];
    if (geom.type === "MultiPolygon") return geom.coordinates;
    return [];
  }
  function pointInPolys(pt, polys) {
    for (var p = 0; p < polys.length; p++) {
      var rings = polys[p];
      if (pointInRing(pt, rings[0])) {
        var inHole = false;
        for (var h = 1; h < rings.length; h++) if (pointInRing(pt, rings[h])) { inHole = true; break; }
        if (!inHole) return true;
      }
    }
    return false;
  }
  // fraction of the AOI area that lies within `polys`, by grid sampling
  function coverage(aoiRing, polys, N) {
    N = N || 64;
    var bb = bboxOf(aoiRing), inAoi = 0, inBoth = 0;
    for (var i = 0; i <= N; i++) {
      for (var j = 0; j <= N; j++) {
        var pt = [bb[0] + (bb[2] - bb[0]) * i / N, bb[1] + (bb[3] - bb[1]) * j / N];
        if (pointInRing(pt, aoiRing)) { inAoi++; if (pointInPolys(pt, polys)) inBoth++; }
      }
    }
    return inAoi ? inBoth / inAoi : 0;
  }

  // ---- state ---------------------------------------------------------------
  var map, mode = null, verts = [], lastPoint = null, aoiRing = null;
  var oroPolys = [], paList = [];  // paList: [{ name, polys }] — MCA + other Oro PAs
  // Post-2020 forest-clearance events (for the EUDR screen). null = not loaded.
  var deforPost2020 = null;        // [{ polys, areaM2, centroid, bbox }]
  var deforMeta = null;            // { updated, cutoff, min_ha, status }
  var nonForest2020 = null;        // GFC2020 non-forest-2020 patches (same shape)
  var nonForestReady = false;      // true only once the real export (status ok) has loaded

  var esri = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
  try {
    var b = (window.PORTAL_CONFIG.basemaps || []).filter(function (x) { return x.id === "esri"; })[0];
    if (b && b.tiles && b.tiles[0]) esri = b.tiles[0];
  } catch (e) {}

  function el(id) { return document.getElementById(id); }

  // ---- init map ------------------------------------------------------------
  map = new maplibregl.Map({
    container: "sa-map",
    style: { version: 8, sources: { basemap: { type: "raster", tiles: [esri], tileSize: 256, attribution: "Imagery © Esri" } },
             layers: [{ id: "basemap", type: "raster", source: "basemap" }] },
    center: [148.45, -9.1], zoom: 7.2, attributionControl: true
  });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

  function emptyFC() { return { type: "FeatureCollection", features: [] }; }

  map.on("load", function () {
    // Oro Province boundary (also the clip reference for "within Oro")
    fetch("data/oro_province.geojson").then(function (r) { return r.json(); }).then(function (gj) {
      var g = gj.features[0].geometry;
      oroPolys = polysOf(g);
      map.addSource("oro_province", { type: "geojson", data: gj });
      map.addLayer({ id: "oro_province-line", type: "line", source: "oro_province",
        paint: { "line-color": "#7fd1ff", "line-width": 1.6, "line-dasharray": [5, 4] } });
      try { var bb = bboxOf(g.type === "Polygon" ? g.coordinates[0] : g.coordinates[0][0]);
            map.fitBounds([[bb[0], bb[1]], [bb[2], bb[3]]], { padding: 30 }); } catch (e) {}
    });
    // Managalas Conservation Area (a protected area, styled as the flagship)
    fetch("data/managalas.geojson").then(function (r) { return r.json(); }).then(function (gj) {
      var g = gj.features[0].geometry;
      paList.push({ name: "Managalas Conservation Area", polys: polysOf(g) });
      map.addSource("managalas", { type: "geojson", data: gj });
      map.addLayer({ id: "managalas-line", type: "line", source: "managalas",
        paint: { "line-color": "#ffd54a", "line-width": 2.4 } });
    });
    // Other Oro protected areas (WDPA + interim), all counted in overlap
    fetch("data/oro_pas.geojson").then(function (r) { return r.json(); }).then(function (gj) {
      (gj.features || []).forEach(function (f) {
        paList.push({ name: (f.properties && f.properties.name) || "Protected area", polys: polysOf(f.geometry) });
      });
      map.addSource("oro_pas", { type: "geojson", data: gj });
      map.addLayer({ id: "oro_pas-fill", type: "fill", source: "oro_pas", paint: { "fill-color": "#57c98a", "fill-opacity": 0.08 } });
      map.addLayer({ id: "oro_pas-line", type: "line", source: "oro_pas", paint: { "line-color": "#57c98a", "line-width": 1.8, "line-dasharray": [4, 3] } });
      if (aoiRing) analyse(aoiRing);  // refresh if a site was drawn before PAs loaded
    }).catch(function () {});
    // Post-2020 forest clearances (Hansen >= 2021, >=0.5 ha) — the EUDR signal
    fetch("data/oro_defor_post2020.geojson").then(function (r) { return r.json(); }).then(function (gj) {
      deforMeta = { updated: gj.updated, cutoff: gj.cutoff, min_ha: gj.min_ha, status: gj.status || "ok" };
      deforPost2020 = (gj.features || []).map(function (f) {
        var polys = polysOf(f.geometry);
        var areaM2 = 0; polys.forEach(function (p) { if (p[0]) areaM2 += ringAreaM2(p[0]); });
        var or = polys[0] && polys[0][0];
        return { polys: polys, areaM2: areaM2, centroid: or ? centroidOf(or) : null,
                 bbox: or ? bboxOf(or) : null };
      });
      map.addSource("defor2020", { type: "geojson", data: gj });
      map.addLayer({ id: "defor2020-fill", type: "fill", source: "defor2020",
        paint: { "fill-color": "#ff3b30", "fill-opacity": 0.55 } });
      map.addLayer({ id: "defor2020-line", type: "line", source: "defor2020",
        paint: { "line-color": "#ff3b30", "line-width": 1 } });
      if (aoiRing) analyse(aoiRing);  // refresh if a site was drawn before this loaded
    }).catch(function () { deforPost2020 = []; deforMeta = { status: "unavailable" }; });
    // Non-forest in 2020 (JRC GFC2020 v2) — the complement used for the three-way
    // EUDR split. Loaded for sampling only (not drawn, to keep the map uncluttered).
    fetch("data/oro_nonforest2020.geojson").then(function (r) { return r.json(); }).then(function (gj) {
      nonForestReady = gj.status === "ok";
      nonForest2020 = (gj.features || []).map(function (f) {
        var polys = polysOf(f.geometry);
        var areaM2 = 0; polys.forEach(function (p) { if (p[0]) areaM2 += ringAreaM2(p[0]); });
        var or = polys[0] && polys[0][0];
        return { polys: polys, areaM2: areaM2, centroid: or ? centroidOf(or) : null, bbox: or ? bboxOf(or) : null };
      });
      if (aoiRing) analyse(aoiRing);
    }).catch(function () { nonForest2020 = []; });
    // AOI layers
    map.addSource("aoi", { type: "geojson", data: emptyFC() });
    map.addLayer({ id: "aoi-fill", type: "fill", source: "aoi", paint: { "fill-color": "#2c6cf0", "fill-opacity": 0.18 } });
    map.addLayer({ id: "aoi-line", type: "line", source: "aoi", paint: { "line-color": "#2c6cf0", "line-width": 2.2 } });
    map.addSource("draw", { type: "geojson", data: emptyFC() });
    map.addLayer({ id: "draw-line", type: "line", source: "draw", paint: { "line-color": "#ff9d2e", "line-width": 2, "line-dasharray": [2, 1] } });
    map.addLayer({ id: "draw-pt", type: "circle", source: "draw", filter: ["==", "$type", "Point"],
      paint: { "circle-radius": 4, "circle-color": "#ff9d2e", "circle-stroke-color": "#fff", "circle-stroke-width": 1.5 } });
  });

  function setAOI(ring) {
    aoiRing = ring;
    var fc = ring ? { type: "FeatureCollection", features: [{ type: "Feature", geometry: { type: "Polygon", coordinates: [ring] }, properties: {} }] } : emptyFC();
    if (map.getSource("aoi")) map.getSource("aoi").setData(fc);
    if (ring) analyse(ring); else el("sa-report").innerHTML = emptyReport();
  }
  function setDraw(fc) { if (map.getSource("draw")) map.getSource("draw").setData(fc || emptyFC()); }

  // ---- modes ---------------------------------------------------------------
  function setMode(m) {
    mode = m; verts = []; setDraw(emptyFC());
    ["mode-point", "mode-polygon"].forEach(function (id) { el(id).classList.toggle("on", el(id).dataset.m === m); });
    el("sa-finish").style.display = m === "polygon" ? "" : "none";
    el("sa-buffer-wrap").style.display = m === "point" ? "" : "none";
    map.getCanvas().style.cursor = m ? "crosshair" : "";
    if (m === "polygon") map.doubleClickZoom.disable(); else map.doubleClickZoom.enable();
  }

  map.on("click", function (e) {
    var lng = e.lngLat.lng, lat = e.lngLat.lat;
    if (mode === "point") {
      lastPoint = [lng, lat];
      setAOI(circleRing(lng, lat, bufferM()));
    } else if (mode === "polygon") {
      verts.push([lng, lat]);
      var feats = [{ type: "Feature", geometry: { type: "LineString", coordinates: verts.concat(verts.length > 2 ? [verts[0]] : []) }, properties: {} }];
      verts.forEach(function (v) { feats.push({ type: "Feature", geometry: { type: "Point", coordinates: v }, properties: {} }); });
      setDraw({ type: "FeatureCollection", features: feats });
    }
  });
  map.on("dblclick", function (e) { if (mode === "polygon") { e.preventDefault(); finishPolygon(); } });

  function finishPolygon() {
    if (verts.length < 3) return;
    var ring = verts.slice(); ring.push(ring[0]);
    setDraw(emptyFC()); verts = []; lastPoint = null;
    setAOI(ring); setMode(null);
  }
  function bufferM() { var v = parseFloat(el("sa-buffer").value); return isFinite(v) && v > 0 ? v : 500; }

  // ---- upload --------------------------------------------------------------
  function parseCoordStr(s) {
    return s.trim().split(/\s+/).map(function (t) { var c = t.split(","); return [parseFloat(c[0]), parseFloat(c[1])]; })
      .filter(function (p) { return isFinite(p[0]) && isFinite(p[1]); });
  }
  function fromGeoJSON(obj) {
    var f = obj.type === "FeatureCollection" ? obj.features[0] : (obj.type === "Feature" ? obj : { geometry: obj });
    var g = f.geometry || f;
    if (g.type === "Polygon") return { poly: g.coordinates[0] };
    if (g.type === "MultiPolygon") return { poly: g.coordinates[0][0] };
    if (g.type === "Point") return { point: g.coordinates };
    return null;
  }
  function fromKML(str) {
    var xml = new DOMParser().parseFromString(str, "text/xml");
    var poly = xml.querySelector("Polygon coordinates");
    if (poly) return { poly: parseCoordStr(poly.textContent) };
    var pt = xml.querySelector("Point coordinates");
    if (pt) { var c = parseCoordStr(pt.textContent)[0]; return c ? { point: c } : null; }
    return null;
  }
  function handleFile(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var txt = reader.result, parsed = null;
      try {
        if (/\.kml$/i.test(file.name)) parsed = fromKML(txt);
        else parsed = fromGeoJSON(JSON.parse(txt));
      } catch (e) { parsed = null; }
      if (!parsed) { alert("Could not read a polygon or point from that file. Use GeoJSON or KML."); return; }
      var ring = parsed.poly ? parsed.poly : circleRing(parsed.point[0], parsed.point[1], bufferM());
      lastPoint = parsed.point || null;
      setMode(null); setAOI(ring);
      try { var bb = bboxOf(ring); map.fitBounds([[bb[0], bb[1]], [bb[2], bb[3]]], { padding: 60, maxZoom: 13 }); } catch (e) {}
    };
    reader.readAsText(file);
  }

  // ---- report --------------------------------------------------------------
  function fmt(n, d) { return n.toLocaleString(undefined, { maximumFractionDigits: d == null ? 0 : d }); }
  function emptyReport() {
    return '<div class="sa-empty">Define a site to see its report — draw a polygon, drop a point, or upload a boundary.</div>';
  }
  function rel(pct, name) {
    if (pct > 0.995) return "entirely within " + name;
    if (pct > 0.005) return fmt(pct * 100, 1) + "% within " + name;
    return "outside " + name;
  }
  // EUDR screen: detect post-2020 forest clearances intersecting the plot.
  // Fast + shape-robust: bbox pre-filter to nearby clearings, then (a) a robust
  // intersection test for the event COUNT and (b) grid sampling for the ha of
  // overlap (so it works for concave/odd shapes, not just centroids).
  function bbIntersect(a, b) { return !(a[2] < b[0] || a[0] > b[2] || a[3] < b[1] || a[1] > b[3]); }
  function stepN(arr) { return Math.max(1, Math.floor(arr.length / 12)); }
  // Sum the real area (m²) of every polygon in `list` that intersects the plot,
  // bbox-pre-filtered, using robust vertex/centroid tests (resolution-independent;
  // edge polygons counted in full — conservative).
  function sumIntersect(ring, plotCentroid, list) {
    var pbb = bboxOf(ring);
    var cand = list.filter(function (d) { return d.bbox && bbIntersect(pbb, d.bbox); });
    var count = 0, m2 = 0;
    cand.forEach(function (d) {
      var hit = (d.centroid && pointInRing(d.centroid, ring)) ||
                (plotCentroid && pointInPolys(plotCentroid, d.polys));
      var or = d.polys[0] && d.polys[0][0], i;
      if (!hit && or) { for (i = 0; i < or.length; i += stepN(or)) { if (pointInRing(or[i], ring)) { hit = true; break; } } }
      if (!hit) { for (i = 0; i < ring.length; i += stepN(ring)) { if (pointInPolys(ring[i], d.polys)) { hit = true; break; } } }
      if (hit) { count++; m2 += d.areaM2; }
    });
    return { count: count, m2: m2 };
  }
  function eudrScreen(ring, plotCentroid) {
    if (deforPost2020 == null) return { loaded: false };
    var plotHa = ringAreaM2(ring) / 1e4;
    var cl = deforPost2020.length ? sumIntersect(ring, plotCentroid, deforPost2020) : { count: 0, m2: 0 };
    var clearedHa = Math.min(cl.m2 / 1e4, plotHa);
    var res = { loaded: true, count: cl.count, plotHa: plotHa, clearedHa: clearedHa,
                pct: plotHa ? Math.min(100, clearedHa / plotHa * 100) : 0, meta: deforMeta };
    // three-way split using GFC2020 non-forest-2020 (only when the real export loaded)
    if (nonForest2020 != null && nonForestReady) {
      var nf = nonForest2020.length ? sumIntersect(ring, plotCentroid, nonForest2020) : { count: 0, m2: 0 };
      var preNF = Math.min(nf.m2 / 1e4, plotHa);
      var forest2020 = Math.max(0, plotHa - preNF);
      var cleared = Math.min(clearedHa, forest2020);        // clearings sit within forest-2020
      res.threeWay = true;
      res.preNonForestHa = preNF;
      res.clearedHa = cleared;
      res.standingHa = Math.max(0, forest2020 - cleared);
      res.pct = plotHa ? Math.min(100, cleared / plotHa * 100) : 0;
    }
    return res;
  }
  function pctStr(p) { return (p > 0 && p < 0.1) ? "<0.1%" : fmt(p, 1) + "%"; }
  function eudrPanel(e) {
    if (!e.loaded) return '<div class="sa-note"><b>EUDR screen</b><br/>Post-2020 clearance layer not loaded.</div>';
    var src = e.meta && e.meta.min_ha ? (" Minimum mapped clearing " + e.meta.min_ha + " ha.") : "";
    var caveat = '<div class="sa-eudr-caveat">Screening indication only, from the global Hansen/JRC ' +
      'forest products — <b>not</b> an authoritative or legal EUDR determination.' + src +
      ' Hectares are summed from mapped clearings that intersect the plot (edge clearings counted in full).</div>';
    var cls = e.pct <= 0 ? "ok" : (e.pct < 5 ? "warn" : "flag");
    var icon = e.pct <= 0 ? "🟢" : (e.pct < 5 ? "🟡" : "🔴");
    var head = e.pct <= 0
      ? "no post-2020 deforestation detected"
      : pctStr(e.pct) + " of the plot cleared since 2020";
    var tail = e.pct <= 0 ? "" : (e.pct < 5
      ? " Review the cleared portion before sourcing."
      : " Flag for due diligence before sourcing.");
    var bar, rows, pH = e.plotHa || 1;
    if (e.threeWay) {
      var stPct = e.standingHa / pH * 100, nfPct = e.preNonForestHa / pH * 100;
      bar = '<div class="sa-eudr-bar">' +
        '<span class="standing" style="width:' + stPct.toFixed(1) + '%"></span>' +
        '<span class="nonforest" style="width:' + nfPct.toFixed(1) + '%"></span>' +
        '<span class="cleared" style="width:' + e.pct.toFixed(1) + '%"></span></div>';
      rows = '<div class="sa-eudr-rows">' +
        '<div><span class="sw standing"></span>Standing forest (forest in 2020, uncleared): <b>' + pctStr(stPct) + '</b> · ' + fmt(e.standingHa, 1) + ' ha</div>' +
        '<div><span class="sw nonforest"></span>Pre-2020 non-forest (existing land use): <b>' + pctStr(nfPct) + '</b> · ' + fmt(e.preNonForestHa, 1) + ' ha</div>' +
        '<div><span class="sw cleared"></span>Cleared since 2020: <b>' + pctStr(e.pct) + '</b> · ' + fmt(e.clearedHa, 1) + ' ha' +
        (e.count ? ' · ' + e.count + ' event' + (e.count === 1 ? "" : "s") : "") + '</div></div>';
    } else {
      var freePct = Math.max(0, 100 - e.pct), freeHa = Math.max(0, e.plotHa - e.clearedHa);
      bar = '<div class="sa-eudr-bar">' +
        '<span class="free" style="width:' + freePct.toFixed(1) + '%"></span>' +
        '<span class="cleared" style="width:' + e.pct.toFixed(1) + '%"></span></div>';
      rows = '<div class="sa-eudr-rows">' +
        '<div><span class="sw free"></span>Deforestation-free (apparent): <b>' + pctStr(freePct) + '</b> · ' + fmt(freeHa, 1) + ' ha</div>' +
        '<div><span class="sw cleared"></span>Post-2020 clearing: <b>' + pctStr(e.pct) + '</b> · ' + fmt(e.clearedHa, 1) + ' ha' +
        (e.count ? ' · ' + e.count + ' event' + (e.count === 1 ? "" : "s") : "") + '</div></div>';
    }
    return '<div class="sa-eudr ' + cls + '"><div class="sa-eudr-h">' + icon + ' EUDR screen — ' + head + '</div>' +
      '<p>Plot area <b>' + fmt(e.plotHa, 1) + ' ha</b>.' + tail + '</p>' + bar + rows + caveat + '</div>';
  }

  function analyse(ring) {
    var areaM2 = ringAreaM2(ring), ha = areaM2 / 1e4, km2 = areaM2 / 1e6;
    var c = centroidOf(ring);
    // one grid-sampling pass: Oro Province + every protected area
    var bb = bboxOf(ring), N = 64, inAoi = 0, inOro = 0, inAnyPA = 0;
    paList.forEach(function (pa) { pa._c = 0; });
    for (var i = 0; i <= N; i++) {
      for (var j = 0; j <= N; j++) {
        var pt = [bb[0] + (bb[2] - bb[0]) * i / N, bb[1] + (bb[3] - bb[1]) * j / N];
        if (!pointInRing(pt, ring)) continue;
        inAoi++;
        if (oroPolys.length && pointInPolys(pt, oroPolys)) inOro++;
        var any = false;
        paList.forEach(function (pa) { if (pointInPolys(pt, pa.polys)) { pa._c++; any = true; } });
        if (any) inAnyPA++;
      }
    }
    var oroPct = inAoi ? inOro / inAoi : 0, anyPct = inAoi ? inAnyPA / inAoi : 0;
    var per = paList.map(function (pa) { return { name: pa.name, pct: inAoi ? pa._c / inAoi : 0 }; })
      .filter(function (p) { return p.pct > 0.005; }).sort(function (a, b) { return b.pct - a.pct; });

    var tiles =
      tile(ha >= 100 ? fmt(km2, 1) + " km²" : fmt(ha, 1) + " ha", "Site area") +
      tile(rel(oroPct, "Oro Province"), "Oro Province") +
      tile(anyPct > 0.005 ? fmt(anyPct * 100, 1) + "%" : "—", "Within a protected area") +
      tile(fmt(ha * anyPct, 1) + " ha", "Area inside PAs") +
      tile(c[1].toFixed(3) + ", " + c[0].toFixed(3), "Centroid (lat, lng)");

    var breakdown = per.length
      ? '<div class="sa-note"><b>Protected-area overlap</b><ul class="sa-pa">' +
          per.map(function (p) {
            return "<li>" + escapeHtml(p.name) + " — <b>" + fmt(p.pct * 100, 1) + "%</b> (" + fmt(ha * p.pct, 1) + " ha)</li>";
          }).join("") + "</ul></div>"
      : '<div class="sa-note"><b>Does not overlap any mapped protected area.</b></div>';

    var pending = ["Forest cover & loss", "Land cover", "Canopy & carbon", "Fire history", "Climate", "Accessibility & population"]
      .map(function (t) { return "<li>" + t + "</li>"; }).join("");

    el("sa-report").innerHTML =
      '<div class="sa-tiles">' + tiles + "</div>" + breakdown +
      eudrPanel(eudrScreen(ring, c)) +
      '<div class="sa-pending"><div class="sa-pending-h">Satellite themes — available once Earth Engine is connected</div><ul>' +
        pending + "</ul></div>" +
      '<div class="sa-actions"><button id="sa-print" class="btn ghost">Print / Save as PDF</button></div>';
    el("sa-print").addEventListener("click", function () { window.print(); });
  }
  function escapeHtml(s) { return (s || "").replace(/[&<>"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function tile(v, l) { return '<div class="sa-tile"><div class="v">' + v + '</div><div class="l">' + l + "</div></div>"; }

  // ---- wire controls -------------------------------------------------------
  el("mode-point").addEventListener("click", function () { setMode(mode === "point" ? null : "point"); });
  el("mode-polygon").addEventListener("click", function () { setMode(mode === "polygon" ? null : "polygon"); });
  el("sa-finish").addEventListener("click", finishPolygon);
  el("mode-clear").addEventListener("click", function () { verts = []; lastPoint = null; setDraw(emptyFC()); setMode(null); setAOI(null); });
  el("mode-upload").addEventListener("click", function () { el("sa-file").click(); });
  el("sa-file").addEventListener("change", function (e) { if (e.target.files[0]) handleFile(e.target.files[0]); e.target.value = ""; });
  el("sa-buffer").addEventListener("change", function () { if (mode === "point" && lastPoint) setAOI(circleRing(lastPoint[0], lastPoint[1], bufferM())); });

  el("sa-report").innerHTML = emptyReport();
})();
