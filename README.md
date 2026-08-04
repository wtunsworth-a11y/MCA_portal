# Oro Data Portal — Oro (Northern) Province, PNG

An online data-access portal for **Oro (Northern) Province, Papua New Guinea**, with the
**Managalas Conservation Area (MCA)** as a highlighted area within it — bringing together
free satellite and spatial data, secure in-house data layers, and automated reporting on
land-use change and conservation issues across the Province.

> **Status:** Phase 1 (public web map MVP). See [`docs/04-roadmap.md`](docs/04-roadmap.md).

---

## What this is

A front page leading into several systems:

1. **Map viewer** — a public web map of Oro Province (with the Managalas / MCA area
   highlighted) showing boundaries, forest cover and near-real-time deforestation
   alerts, plus tiered access to richer layers for registered users.
2. **Document archives** — OCR'd historical collections (Managalas, CSIRO, Kokoda,
   QABB, …) that are **searchable and read inside the portal**, not browsable or
   bulk-downloadable. See [`docs/06-document-archives.md`](docs/06-document-archives.md).
3. **Secure data store** — the portal's own layers (community boundaries, tenure,
   field surveys) held privately with role-based access.
4. **Change detection & reporting** — scheduled jobs that pull new satellite alerts,
   detect forest loss / encroachment inside Oro, and generate regular reports.
5. **On-demand site analysis ("mini-MLA")** — a user draws or uploads a site (a point
   gets a buffer) and the portal generates a short landscape profile of maps and stats.
   See [`docs/09-site-analysis.md`](docs/09-site-analysis.md).
6. **Usage & M&E** — access-tier usage reporting (aggregate public totals; named-user
   detail) for project monitoring. See [`docs/07-monitoring-evaluation.md`](docs/07-monitoring-evaluation.md).

Everything is built for **slow connections**: assets are self-hosted, data is streamed/
tiled rather than downloaded, and the UI never blocks on a slow basemap.

## Repository layout

```
MCA_portal/
├── README.md                 ← you are here
├── docs/                     ← the plan (share these with stakeholders)
│   ├── 01-architecture.md    ← system design & tech stack
│   ├── 02-data-sources.md    ← free data feeds and how to use them
│   ├── 03-hosting.md         ← CIFOR-ICRAF vs commercial cloud, costs
│   ├── 04-roadmap.md         ← phased delivery plan & effort estimate
│   ├── 05-access-tiers.md    ← public / registered / partner / admin tiers
│   ├── 06-document-archives.md ← archives, OCR pipeline & protection model
│   ├── 07-monitoring-evaluation.md ← usage/M&E reporting by tier
│   ├── 08-it-requirements.md  ← hosting ask for CIFOR-ICRAF IT (SO1 1.1 1.1-4)
│   └── 09-site-analysis.md    ← on-demand "mini-MLA" for a user-drawn site
├── prototype/                ← clickable UI mockup (no build step)
│   └── index.html
└── app/                      ← the real Phase-1 MVP
    ├── index.html            ← portal front page (datasets · live · archives)
    ├── map.html              ← the map viewer
    ├── library.html          ← document archives (search-first + in-portal reader)
    ├── analytics.html        ← usage & M&E dashboard
    ├── css/{site,style}.css
    ├── js/config.js          ← all data layers & keys configured here
    ├── js/{app,home,library,archives,analytics}.js
    └── data/{managalas,oro_province}.geojson
```

## Quick start (run the MVP locally)

The MVP is a static site — no server or build step required.

```bash
cd app
python3 -m http.server 8000
# open http://localhost:8000  → front page (index.html)
```

The front page links to the **map** (`map.html`), the **archives** (`library.html`) and
the **usage dashboard** (`analytics.html`). The map loads a working basemap, the Oro
Province and Managalas boundaries, and **live Hansen global forest-loss tiles** (free,
no API key). Layers that need a key (Planet NICFI, GFW/RADD alerts) are wired in
`app/js/config.js` and activate as soon as a key is supplied.

## Deploy (free)

The `app/` folder is a static site — drag it into **Cloudflare Pages**, **Netlify**
or **GitHub Pages**. See [`docs/03-hosting.md`](docs/03-hosting.md).

## The plan in one paragraph

Assemble proven, mostly-free components rather than build from scratch: a
MapLibre front-end on free static hosting, Google Earth Engine doing the heavy
satellite processing, free alert feeds (GFW / RADD / GLAD) for deforestation, and
a small Postgres/PostGIS + auth backend (Supabase or CIFOR-ICRAF-hosted) for the
private tiers and report generation. A public forest-monitoring map is a matter
of weeks; the full tiered-access + automated-reporting vision is a 3–6 month
build for one experienced geospatial developer. Details in [`docs/`](docs/).
