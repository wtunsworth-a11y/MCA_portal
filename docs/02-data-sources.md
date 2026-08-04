# 02 · Data Sources

This portal is organised around the **eleven thematic data layers** identified for
Oro Province / Managalas, plus the free near-real-time feeds that keep them current.
Each layer below lists the **requested source**, how it's **accessed**, whether
**Google Earth Engine (GEE)** can serve it directly, the **access tier**, and any
**suggested modification with justification**.

Leaning on GEE for processing (as agreed) means most of these layers can be pulled,
clipped to the Oro/MCA boundary, and served as tiles without us running a GIS server.

## The eleven layers

| # | Theme | Requested source | Access | On GEE? | Tier |
|---|-------|------------------|--------|---------|------|
| 1 | Topography | JAXA ALOS AW3D30 DEM | GEE / download | ✅ `JAXA/ALOS/AW3D30` | Public |
| 2 | Forest Cover | JRC TMF | GEE | ✅ `projects/JRC/TMF/...` | Public |
| 3 | Forest Change | JRC TMF | GEE | ✅ TMF DeforestationYear/DegradationYear | Public |
| 4 | Biodiversity | PSP, NFI, surveys, literature, sightings, IUCN Red List | Curated + API | Partial (Red List/GBIF) | Tiered |
| 5 | Water | Catchments, waterways, flows — BASINS | Curated + GEE | Partial (HydroSHEDS) | Public/Tiered |
| 6 | Weather | WorldClim 2.1 | GEE / download | ✅ (see note) | Public |
| 7 | Soil | PNGRIS | Curated | Partial (SoilGrids) | Tiered |
| 8 | Ecosystem Services | LUMENS | Curated (modelled) | ❌ own model output | Tiered |
| 9 | Crop Suitability | PNGLES + DAL | Curated | ❌ own model output | Tiered/Partner |
| 10 | Southern Oscillation Index | Australian BoM | API / CSV | ❌ time series | Public (context) |
| 11 | Fire occurrences | NASA FIRMS (MODIS/VIIRS) | GEE / FIRMS API | ✅ `FIRMS` | Public |

---

### 1. Topography — JAXA ALOS AW3D30
- **Source:** JAXA ALOS World 3D 30 m DEM. Free.
- **Access:** `JAXA/ALOS/AW3D30` in GEE — derive hillshade, slope, elevation tiles.
- **Note:** GEE also hosts NASA SRTM and the newer **Copernicus GLO-30 DEM**
  (`COPERNICUS/DEM/GLO30`), which is often cleaner in PNG's terrain. Suggest offering
  JAXA as the primary (as requested) with Copernicus DEM as an optional comparison.

### 2 & 3. Forest Cover & Forest Change — JRC TMF
- **Source:** JRC **Tropical Moist Forest (TMF)** dataset. Free, purpose-built for
  the tropics and well-suited to PNG.
- **Access on GEE:** `projects/JRC/TMF/v1_YYYY/AnnualChange`,
  `.../DeforestationYear`, `.../DegradationYear`. Serves both cover (current forest
  state) and change (year of deforestation/degradation) from one product — good
  internal consistency between layers 2 and 3.
- **Suggested addition (justified):** TMF is **annual**. For the reporting engine's
  "recent changes" function, complement it with a **near-real-time alert feed** —
  **RADD** (radar, sees through PNG cloud cover) and/or GFW integrated alerts. TMF
  gives the authoritative annual baseline; RADD gives the "what changed this month"
  signal that drives the automated reports. Both free, both on/near GEE.

### 4. Biodiversity — integrated
- **Requested inputs:** Permanent Sample Plots (PSP), National Forest Inventory
  (NFI), dedicated biodiversity surveys, available literature, sightings, and the
  **IUCN Red List**.
- **Access:** This is a **curated composite** and lives in the secure store (it mixes
  sensitive field data with public references). Machine-pullable parts:
  - **IUCN Red List** — species range polygons + threat status via the Red List API.
  - **GBIF** — georeferenced species occurrence/sighting records via API.
  - PSP / NFI / survey / literature records — ingested into PostGIS as the portal's
    own layer.
- **Tiering note:** Precise locations of threatened/harvestable species are
  sensitive — see [`05-access-tiers.md`](05-access-tiers.md). Public users should see
  generalised richness/hotspots, not exact coordinates of at-risk species.

### 5. Water — catchments, waterways, flows (BASINS)
- **Requested source:** Catchments and waterways from **BASINS**, water flows as
  modelled in BASINS.
- **Suggested modification (justified):** Use **HydroSHEDS** (free, on GEE:
  `WWF/HydroSHEDS/...`) for the base catchment boundaries and river network — it's
  a consistent, SRTM-derived global product that clips cleanly to Oro and needs no
  local processing. Keep the **BASINS-modelled flows** as a curated processed layer
  overlaid on that base. Rationale: HydroSHEDS gives a reproducible, maintainable
  hydrological skeleton; BASINS retains the local modelling you've invested in for
  the flow values.

### 6. Weather — WorldClim 2.1
- **Source:** WorldClim 2.1 bioclimatic + monthly climate normals. Free.
- **Access:** WorldClim 2.1 grids can be uploaded to GEE as assets; GEE also hosts
  WorldClim v1 (`WORLDCLIM/V1/BIO`).
- **Suggested addition (justified):** For *recent/actual* weather (vs. long-term
  normals), add a GEE-native dataset such as **TerraClimate**
  (`IDAHO_EPSCOR/TERRACLIMATE`) or **CHIRPS** rainfall (`UCSB-CHG/CHIRPS/DAILY`).
  WorldClim answers "what's the climate here"; CHIRPS/TerraClimate answer "what did
  the weather do this season" — the latter matters for the reporting engine (e.g.
  drought-linked fire risk).

### 7. Soil — PNGRIS
- **Source:** PNG Resource Information System (PNGRIS). National dataset — curated,
  loaded into the store.
- **Suggested complement (justified):** **SoilGrids** (ISRIC, on GEE) provides
  gridded soil properties globally and can gap-fill or cross-check PNGRIS at finer
  resolution where PNGRIS is coarse. PNGRIS stays authoritative for PNG-specific
  classifications.

### 8. Ecosystem Services — LUMENS
- **Source:** **LUMENS** (Land Use planning for Multiple Environmental Services) —
  an ICRAF modelling tool. These are **model outputs**, stored as curated layers
  (carbon stocks, service values). Not a raw feed; produced by the LUMENS workflow
  and published into the portal.

### 9. Crop Suitability — PNGLES + DAL
- **Source:** PNG Land Evaluation System (PNGLES) with the Dept. of Agriculture &
  Livestock. **Model output**, curated. Likely **partner/tiered** access given its
  policy and land-planning sensitivity.

### 10. Southern Oscillation Index — Australian BoM
- **Source:** Australian Bureau of Meteorology SOI. Free.
- **Access:** BoM publishes SOI as CSV/JSON time series. **Not a map layer** — display
  as a **context chart / current-status indicator** (ENSO state) alongside the map,
  and feed it into the reporting engine as a driver of drought/fire risk.

### 11. Fire occurrences — NASA FIRMS
- **Source:** NASA **FIRMS** active-fire detections (MODIS + VIIRS). Free,
  near-real-time (often < 3 h).
- **Access:** `FIRMS` in GEE, or the FIRMS REST API for point detections. Clip to
  Oro, show recent fire points, and count/report fires inside the MCA boundary.

---

## Cross-cutting free feeds (imagery & alerts)

Used as basemaps and to power the reporting engine, in addition to the eleven layers:

- **Planet NICFI basemaps** — free ~4.7 m tropical imagery, monthly. Needs a (free)
  NICFI key. Excellent visual context for PNG.
- **Sentinel-1 / Sentinel-2 / Landsat** — on GEE, for custom change detection.
- **RADD / GFW integrated / GLAD-S2 alerts** — free near-real-time deforestation
  alerts; RADD's radar basis is the key advantage under PNG's persistent cloud.

## Access summary

| Access method | Layers |
|---|---|
| **GEE-served (free, no local processing)** | Topography, Forest Cover, Forest Change, Weather, Fire, Water base (HydroSHEDS), biodiversity refs (Red List/GBIF) |
| **Curated / own store** | Biodiversity composite, Soil (PNGRIS), Ecosystem Services (LUMENS), Crop Suitability (PNGLES), BASINS-modelled flows |
| **External API (non-map)** | SOI (BoM) |

## Licensing & attribution

All external sources above are free for research/non-commercial use but carry
attribution requirements (JAXA, JRC, NASA, Planet NICFI, WorldClim, BoM, WWF
HydroSHEDS, ISRIC). Attribution must be shown in the map UI. PNG national datasets
(PNGRIS, PNGLES, NFI) and partner data (DAL) need data-sharing agreements before
redistribution — hence their tiered access.
