/*
 * Oro Data Portal — layer & source configuration
 * ------------------------------------------------
 * All data layers are declared here so non-developers can see and adjust what
 * the portal shows. Layers marked `requiresKey` stay disabled until a key is
 * supplied below. Layers with a working `url` render immediately (no key).
 *
 * Mapping to the eleven thematic layers (see docs/02-data-sources.md):
 *   1 Topography      → JAXA (served via GEE tile endpoint; Hansn/OSM stand-ins live now)
 *   2 Forest Cover    → JRC TMF (GEE)      3 Forest Change → JRC TMF / Hansen (live)
 *   4 Biodiversity    → curated (backend)  5 Water        → HydroSHEDS / BASINS
 *   6 Weather         → WorldClim (GEE)    7 Soil         → PNGRIS (backend)
 *   8 Ecosystem Svc   → LUMENS (backend)   9 Crop Suit.   → PNGLES (backend)
 *  10 SOI             → BoM (chart)       11 Fire         → FIRMS (GEE/API)
 */

window.PORTAL_CONFIG = {
  // Map centred on the Managalas Conservation Area, Oro Province, PNG
  // (centroid of the authoritative WDPA boundary, WDPAID 555651673).
  view: { center: [148.31, -9.17], zoom: 9, minZoom: 4, maxZoom: 16 },

  // Optional API keys. Leave blank to keep keyed layers disabled.
  keys: {
    nicfi: "",   // Planet NICFI basemap key  (free programme)
    gfw: "",     // Global Forest Watch API key (RADD / integrated alerts)
    firms: "",   // NASA FIRMS MAP_KEY (free) — https://firms.modaps.eosdis.nasa.gov/api/
    // The GEE-served layers (TMF, JAXA, FIRMS, WorldClim, HydroSHEDS) are
    // published from your Earth Engine project as XYZ tile endpoints; paste
    // those endpoints into the matching layers below when ready.
  },

  // ---- Basemaps (choose one) ----------------------------------------------
  basemaps: [
    {
      id: "osm", name: "OpenStreetMap", type: "raster", default: false,
      tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
              "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png"],
      attribution: "© OpenStreetMap contributors"
    },
    {
      id: "esri", name: "Satellite (Esri)", type: "raster", default: true,
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
      attribution: "Imagery © Esri, Maxar, Earthstar Geographics"
    },
    {
      id: "topo_osm", name: "Topographic (OpenTopoMap)", type: "raster", default: false,
      tiles: ["https://a.tile.opentopomap.org/{z}/{x}/{y}.png",
              "https://b.tile.opentopomap.org/{z}/{x}/{y}.png"],
      attribution: "© OpenTopoMap (CC-BY-SA), © OpenStreetMap contributors"
    }
  ],

  // ---- Thematic data layers -----------------------------------------------
  // `live: true`  → renders now with no key (working demonstration data)
  // `requiresKey` / `requiresEndpoint` → wired but inactive until configured
  layers: [
    {
      id: "province", theme: "Boundaries", name: "Oro (Northern) Province",
      kind: "geojson", url: "data/oro_province.geojson", live: true, visible: true,
      style: { color: "#7fd1ff", weight: 1.6, dash: [5, 4], fill: "rgba(127,209,255,0.04)" },
      attribution: "Oro Province administrative boundary",
      note: "Provincial extent — the portal's wider Oro Province coverage."
    },
    {
      id: "boundary", theme: "Boundaries", name: "Managalas Conservation Area",
      kind: "geojson", url: "data/managalas.geojson", live: true, visible: true,
      style: { color: "#ffd54a", weight: 2.5, fill: "rgba(255,213,74,0.08)" },
      attribution: "Boundary © WDPA / Protected Planet (Oct 2023)",
      note: "Authoritative WDPA boundary (WDPAID 555651673, designated 2017)."
    },
    {
      id: "forest_loss", theme: "Forest Change", name: "Forest loss (Hansen, 2001–2023)",
      kind: "raster", live: true, visible: true, opacity: 0.85,
      tiles: ["https://storage.googleapis.com/earthenginepartners-hansen/tiles/gfc_v1.11/loss_alpha/{z}/{x}/{y}.png"],
      attribution: "Hansen/UMD/Google/USGS/NASA",
      legend: [{ color: "#ff3b30", label: "Tree cover loss" }],
      note: "Live now (keyless). To be superseded by JRC TMF DeforestationYear via GEE."
    },
    {
      id: "forest_cover", theme: "Forest Cover", name: "Tree cover 2000 (Hansen)",
      kind: "raster", live: true, visible: false, opacity: 0.7,
      tiles: ["https://storage.googleapis.com/earthenginepartners-hansen/tiles/gfc_v1.11/tree_alpha/{z}/{x}/{y}.png"],
      attribution: "Hansen/UMD/Google/USGS/NASA",
      legend: [{ color: "#1b7837", label: "Tree cover" }],
      note: "Live stand-in for JRC TMF Forest Cover (to be served via GEE)."
    },
    // ---- GEE-served layers: paste XYZ endpoints from your Earth Engine app ----
    {
      id: "tmf_change", theme: "Forest Change", name: "JRC TMF — Deforestation year",
      kind: "raster", requiresEndpoint: true, opacity: 0.85,
      tiles: [""], attribution: "JRC Tropical Moist Forest",
      note: "Publish projects/JRC/TMF DeforestationYear from GEE and paste the tile URL."
    },
    {
      id: "landcover", theme: "Land Cover", name: "Land cover (ESA WorldCover 2021, 10 m)",
      kind: "raster", live: true, visible: false, opacity: 0.75,
      tiles: ["https://services.terrascope.be/wmts/v2?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=WORLDCOVER_2021_MAP&STYLE=&FORMAT=image/png&TILEMATRIXSET=EPSG:3857&TILEMATRIX=EPSG:3857:{z}&TILEROW={y}&TILECOL={x}"],
      attribution: "ESA WorldCover 2021 © ESA / Terrascope",
      legend: [{ color: "#009900", label: "Tree cover" }, { color: "#ffff4c", label: "Cropland" },
               { color: "#fa0000", label: "Built-up" }, { color: "#0064c8", label: "Water" }],
      note: "Live, keyless (Terrascope WMTS). Global 10 m land cover — a useful public layer today."
    },
    {
      id: "topo", theme: "Topography", name: "Terrain / hillshade (Esri stand-in)",
      kind: "raster", live: true, visible: false, opacity: 0.9,
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}"],
      attribution: "Hillshade © Esri",
      note: "Live keyless stand-in (Esri World Hillshade). To be replaced by JAXA AW3D30 via GEE."
    },
    {
      id: "fire", theme: "Fire", name: "Active fires (NASA FIRMS, VIIRS)",
      kind: "raster", requiresKey: "firms", opacity: 0.95,
      tiles: ["https://firms.modaps.eosdis.nasa.gov/mapserver/wms/fires/{key}/?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=fires_viirs_snpp&SRS=EPSG:3857&BBOX={bbox-epsg-3857}&WIDTH=256&HEIGHT=256&FORMAT=image/png&TRANSPARENT=true"],
      attribution: "NASA FIRMS (VIIRS)",
      legend: [{ color: "#ff3b30", label: "Active fire" }],
      note: "One free key from live: register a NASA FIRMS MAP_KEY (firms.modaps.eosdis.nasa.gov/api/) and paste into keys.firms. Verify the VIIRS layer name on the live map."
    },
    {
      id: "water", theme: "Water", name: "Catchments & waterways (HydroSHEDS)",
      kind: "raster", requiresEndpoint: true, opacity: 0.7,
      tiles: [""], attribution: "WWF HydroSHEDS",
      note: "Publish WWF/HydroSHEDS basins & rivers from GEE; BASINS flows via backend."
    },
    {
      id: "weather", theme: "Weather", name: "Climate normals (WorldClim 2.1)",
      kind: "raster", requiresEndpoint: true, opacity: 0.6,
      tiles: [""], attribution: "WorldClim 2.1",
      note: "Publish WorldClim bioclim layer from GEE and paste the tile URL."
    },
    {
      id: "nicfi", theme: "Imagery", name: "Planet NICFI basemap",
      kind: "raster", requiresKey: "nicfi", opacity: 1,
      tiles: [""], attribution: "Imagery © Planet / NICFI",
      note: "Priority layer. Set keys.nicfi; tile URL built from the chosen NICFI mosaic + key (~4.7 m tropical imagery, monthly)."
    },
    {
      id: "radd", theme: "Forest Change", name: "RADD deforestation alerts (near-real-time)",
      kind: "raster", requiresKey: "gfw", opacity: 0.95,
      tiles: [""], attribution: "RADD / WUR / GFW",
      legend: [{ color: "#ff00ff", label: "RADD alert" }],
      note: "Priority layer. Radar-based, sees through PNG cloud cover. Serve via GFW Data API tiles or GEE; drives the reporting engine's 'recent change' signal."
    },
    // ---- Backend-served curated layers (Partner tier — see docs/05) ----------
    { id: "biodiversity", theme: "Biodiversity", name: "Biodiversity (curated)", kind: "backend", tier: "tiered", note: "PSP/NFI/surveys/IUCN/GBIF — served from PostGIS, generalised for public." },
    { id: "soil",   theme: "Soil", name: "Soil (PNGRIS)", kind: "backend", tier: "partner", note: "Curated national dataset — partner tier." },
    { id: "ecoserv", theme: "Ecosystem Services", name: "Ecosystem services (LUMENS)", kind: "backend", tier: "partner", note: "LUMENS model output — partner tier." },
    { id: "crop",   theme: "Crop Suitability", name: "Crop suitability (PNGLES/DAL)", kind: "backend", tier: "partner", note: "PNGLES + DAL — partner tier." }
  ],

  // Non-map context indicator (see docs/02 §10)
  soi: { name: "Southern Oscillation Index (BoM)", source: "Australian Bureau of Meteorology" }
};
