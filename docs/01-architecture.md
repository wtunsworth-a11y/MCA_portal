# 01 · Architecture & Tech Stack

## Design goals

- **Low running cost** — favour free data feeds and static hosting; pay only for the
  small private backend.
- **Data sovereignty** — sensitive layers (tenure, community boundaries, field data)
  stay under institutional control (CIFOR-ICRAF or a controlled database).
- **Low maintenance** — offload heavy satellite processing to Google Earth Engine so
  we don't run a GIS server.
- **Live data, not local copies** — the portal is an *access layer*, not a data
  warehouse. It streams each dataset directly from its online source and **displays it in
  the map**, framed on Oro Province; we do **not** download, clip or store copies unless a
  dataset has no live endpoint or is sensitive/curated. Clipping/masking is the
  **exception**, not the norm. When a source updates, the portal reflects it
  automatically — so ongoing data updates are **zero-cost** with no re-download or
  re-processing. See *Data access model* below.
- **Incremental** — a useful public map ships first; tiers and reporting are added on
  top without re-architecting.
- **Works on slow connections** — the portal must be usable on the intermittent, low-
  bandwidth links common in Oro. Nothing large is downloaded to the user's device;
  data is streamed/tiled from the server and the UI never blocks on a slow basemap.
- **Keep users in the portal** — documents are read *inside* the portal, not handed out
  as bulk files or links to external drives.

## Data access model — stream live, don't warehouse

**Spatial scope:** the portal covers **Oro (Northern) Province** as its primary extent.
The **Managalas Conservation Area (MCA)** is an important area *within* Oro, shown as a
highlighted overlay — not the boundary of the portal. The Oro Province and MCA outlines are
**overlay boundary layers** and serve as **areas of interest for reporting**; the map is
simply *framed* on Oro Province. They are **not** used to clip the data layers.

The default for **every** layer is live streaming from the source, **displayed as served** —
tiled services render whatever falls in the map view, with no per-layer clipping. Nothing is
copied into local storage. This is what makes ongoing updates free: the source maintains the
data, and the portal is always current without any pipeline to run.

**Clipping/masking is an exception**, applied only where it is actually required — for
example to compute a **zonal statistic** for a report (fires or forest loss *within* Oro or
the MCA), or to mask a **curated/downloaded** layer. It is never a routine step for
displaying a layer.

| Source type | Examples | How it streams | Stored locally? |
|---|---|---|---|
| **Google Earth Engine** | JRC TMF, Hansen, FIRMS, WorldClim, SRTM/ALOS | GEE returns map tiles for the view (masking only where a report needs it) | No |
| **Tiled web services (XYZ / WMS / WMTS)** | NICFI basemaps, GFW/RADD alerts, ESA WorldCover | tiles stream straight into the map | No |
| **Cloud-Optimised GeoTIFF + STAC** | ETH canopy height, biomass, Open Buildings | HTTP range requests read only the pixels in view | No |
| **APIs (bbox query)** | GBIF, IUCN Red List, NASA FIRMS, BoM SOI | queried live by bounding box | No (cache only) |
| **Sensitive / curated — the exceptions** | PNGRIS, PNGLES, LUMENS, precise biodiversity, SLUP/PFMP/Mining compartments, document archives | held in the in-house PostGIS store / file store | **Yes** |

Only the last row is warehoused — because those datasets either have **no live public
endpoint** or **must be access-controlled**. That is also why the in-house storage ask
stays small (≈8 GB, archives only — see [`08-it-requirements.md`](08-it-requirements.md)).

> **On MCA_MLA:** the companion analysis repo *downloaded and clipped* everything (to the
> MCA) because it was a one-off study of that area. The portal does the opposite — it
> streams the **same sources** live and just frames the view on **Oro Province**. From
> MCA_MLA we reuse the **source list / queries** (which services and collections to point
> at) and the small boundary vectors — the **Oro Province** polygon and the **MCA (WDPA
> 555651673)** polygon, used as overlays and reporting areas — not its clipped raster copies.

## System overview

```
                        ┌─────────────────────────────────────────────┐
                        │              PUBLIC INTERNET                  │
                        └─────────────────────────────────────────────┘
                                          │
        ┌─────────────────────────────────┼─────────────────────────────────┐
        │                                 │                                   │
        ▼                                 ▼                                   ▼
┌───────────────┐              ┌──────────────────────┐            ┌──────────────────┐
│  FRONT-END    │              │  EXTERNAL FREE DATA   │            │   BACKEND API    │
│  MapLibre GL  │◄────tiles────│  NICFI basemaps       │            │  Auth + tiers    │
│  (static site)│              │  GFW / RADD / GLAD     │            │  PostGIS store   │
│  Cloudflare   │              │  Hansen forest loss    │            │  Supabase or     │
│  Pages/Netlify│              │  Sentinel / Landsat    │            │  CIFOR-ICRAF box │
└───────┬───────┘              └──────────────────────┘            └────────┬─────────┘
        │                                                                    │
        │  registered-user layers (row-level security)                       │
        └────────────────────────────────────────────────────────────────────┘
                                          ▲
                                          │ writes results / reports
                        ┌─────────────────┴─────────────────┐
                        │      PROCESSING & REPORTING        │
                        │  Google Earth Engine (Python)      │
                        │  scheduled: cron / GH Actions /    │
                        │  cloud function                    │
                        │  → change detection, PDF + email   │
                        └────────────────────────────────────┘
```

## Components

### 1. Front-end (map viewer)
- **MapLibre GL JS** — open-source vector/raster map renderer, no licence fees.
  (Leaflet is the simpler raster-only alternative.)
- Pure static files (HTML/CSS/JS). No build step required for Phase 1.
- Talks directly to free external tile services for public layers; talks to the
  backend API only for private layers and login.

### 2. External free data (no server needed)
Consumed as XYZ/WMS tiles or via API directly in the browser. See
[`02-data-sources.md`](02-data-sources.md). The public deforestation layer works
with **zero backend** because Hansen forest-loss tiles are served free and keyless.

### 3. Backend API (only for tiers + private data)
- **PostgreSQL + PostGIS** for spatial storage.
- **Supabase** is the fast path: managed Postgres/PostGIS, built-in auth, storage,
  and **row-level security** that implements the access tiers almost for free.
  Alternatively PostgREST/pg_tileserv on a CIFOR-ICRAF server for full in-house control.
- Serves private vector layers as GeoJSON or vector tiles, gated by user role.

### 4. Processing & reporting engine
- **Python + Google Earth Engine.** GEE runs the satellite analysis server-side for
  free (research/non-commercial), so we pull *results*, not raw imagery.
- Scheduled (GitHub Actions cron, a cloud function, or server cron) to:
  1. pull the latest deforestation alerts intersecting Oro / MCA boundaries,
  2. classify them (loss area, inside/outside protected zones, near roads),
  3. write results to the database and generate a **PDF + email digest**.
- This is the component with the most engineering; everything else is assembly.

### 5. Document archives & in-portal reader
- Scanned historical collections (Managalas, CSIRO, Kokoda, QABB, …) are put through an
  **OCR + index pipeline** that extracts full text, keywords, dates and page counts and
  links each document to its stored original. See [`06-document-archives.md`](06-document-archives.md).
- The full index (OCR text + file references) stays **server-side**. The browser calls a
  **search endpoint** that returns only matching records (title, snippet, keywords) plus an
  opaque `ref` — the whole index is never shipped to the client, so it can't be copied.
- Documents are read through an **in-portal streaming viewer** (page-by-page), so there is
  no bulk download and no exposed file structure. This is a deliberate change from the
  standalone index tool, which embeds everything in one file.

### 6. Usage logging & M&E
- Every request is logged server-side against its **access tier**. The public portal keeps
  **aggregate counts only** (no personal data); registered/partner sign-ins are attributed
  to the named account. See [`07-monitoring-evaluation.md`](07-monitoring-evaluation.md).
- Powers the Usage dashboard and CSV/PDF exports for project reporting.

## Technology choices at a glance

| Concern | Choice | Why |
|---|---|---|
| Map rendering | MapLibre GL JS | Open-source, no fees, vector + raster |
| Basemap imagery | Planet NICFI / ESRI / OSM | Free tropical imagery; keyless fallbacks |
| Deforestation | GFW integrated / RADD / Hansen | Free; RADD works through PNG cloud cover |
| Heavy processing | Google Earth Engine (Python) | Free server-side satellite analysis |
| Private store + auth | Supabase (PostGIS) or in-house PostGIS | Row-level security = tiers for free |
| Static hosting | Cloudflare Pages / Netlify | Free, global CDN, HTTPS |
| Reporting schedule | GitHub Actions / cron | No always-on server needed |

## Why this keeps difficulty low

Nothing here is research-grade hard. Each piece is a proven, documented component,
and the most expensive one (satellite processing) is offloaded to Earth Engine.
The real work is (a) defining what counts as a reportable "issue" and (b) tuning
alerts against PNG's heavy cloud cover — both handled in the reporting engine, not
the plumbing.
