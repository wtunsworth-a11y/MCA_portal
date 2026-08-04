# Oro Data Portal — Managalas Conservation Area

An online data-access portal for the **Managalas Conservation Area (MCA)** and the
wider **Oro (Northern) Province, Papua New Guinea** — bringing together free
satellite and spatial data, secure in-house data layers, and automated reporting
on land-use change and conservation issues.

> **Status:** Phase 1 (public web map MVP). See [`docs/04-roadmap.md`](docs/04-roadmap.md).

---

## What this is

Three systems in one portal:

1. **Map viewer** — a public web map of Managalas / Oro showing boundaries, forest
   cover and near-real-time deforestation alerts, plus tiered access to richer
   layers for registered users.
2. **Secure data store** — the portal's own layers (community boundaries, tenure,
   field surveys) held privately with role-based access.
3. **Change detection & reporting** — scheduled jobs that pull new satellite alerts,
   detect forest loss / encroachment inside Oro, and generate regular reports.

## Repository layout

```
MCA_portal/
├── README.md                 ← you are here
├── docs/                     ← the plan (share these with stakeholders)
│   ├── 01-architecture.md    ← system design & tech stack
│   ├── 02-data-sources.md    ← free data feeds and how to use them
│   ├── 03-hosting.md         ← CIFOR-ICRAF vs commercial cloud, costs
│   ├── 04-roadmap.md         ← phased delivery plan & effort estimate
│   └── 05-access-tiers.md    ← public / registered / partner / admin tiers
├── prototype/                ← clickable UI mockup (no build step)
│   └── index.html
└── app/                      ← the real Phase-1 MVP web map
    ├── index.html
    ├── css/style.css
    ├── js/config.js          ← all data layers & keys configured here
    ├── js/app.js
    └── data/managalas.geojson
```

## Quick start (run the MVP locally)

The MVP is a static site — no server or build step required.

```bash
cd app
python3 -m http.server 8000
# open http://localhost:8000
```

It loads a working basemap, the Managalas boundary, and **live Hansen global
forest-loss tiles** (free, no API key). Layers that need a key (Planet NICFI,
GFW/RADD alerts) are wired in `app/js/config.js` and activate as soon as a key
is supplied.

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
