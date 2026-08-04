# 01 · Architecture & Tech Stack

## Design goals

- **Low running cost** — favour free data feeds and static hosting; pay only for the
  small private backend.
- **Data sovereignty** — sensitive layers (tenure, community boundaries, field data)
  stay under institutional control (CIFOR-ICRAF or a controlled database).
- **Low maintenance** — offload heavy satellite processing to Google Earth Engine so
  we don't run a GIS server.
- **Incremental** — a useful public map ships first; tiers and reporting are added on
  top without re-architecting.

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
