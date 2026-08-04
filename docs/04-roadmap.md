# 04 · Roadmap & Effort Estimate

Effort assumes **one experienced geospatial web developer**. A basic public
forest-monitoring map is a matter of weeks; the full tiered + automated-reporting
vision is a **3–6 month** build.

## Phase 1 — Public map MVP  ·  ~2–4 weeks
**Goal:** a public web map of Oro Province (with the Managalas / MCA area highlighted) that anyone can open.
- [x] Repo scaffold, docs, architecture
- [x] Portal **front page** linking to datasets, live data and archives
- [x] MapLibre front-end with basemap switching
- [x] Managalas boundary (authoritative WDPA, WDPAID 555651673) + **Oro Province** boundary
- [x] Live forest-loss layer (Hansen tiles — keyless, working today)
- [x] **Low-bandwidth resilience:** self-hosted assets; UI/vector layers driven off `style.load`
      so they never wait on a slow basemap
- [ ] Wire GEE-served layers via a tile endpoint: Topography (JAXA), Forest Cover/Change (TMF), Fire (FIRMS)
- [ ] Attribution, legend, layer panel polish
- [ ] Deploy to Cloudflare Pages
**Deliverable:** a public URL with a front page, map (boundaries, terrain, forest cover/change, fires).

## Phase 2 — GEE data pipeline  ·  ~3–5 weeks
**Goal:** all eleven layers available as live, styled tiles, framed on Oro Province.
- [ ] Earth Engine app/service account; publish TMF, JAXA, FIRMS, WorldClim, HydroSHEDS as live tile layers (served as-is, framed on Oro — not clipped)
- [ ] Add near-real-time alerts (RADD / GFW integrated) for the "recent change" story
- [ ] SOI (BoM) context chart + ENSO status indicator
- [ ] Ingest curated layers to PostGIS: Soil (PNGRIS), Ecosystem Services (LUMENS), Crop Suitability (PNGLES), BASINS flows
**Deliverable:** every thematic layer visible and legible on the public/preview map.

## Phase 2b — Document archives  ·  ~2–4 weeks (parallelisable)
**Goal:** searchable, protected historical archives read inside the portal
([`06-document-archives.md`](06-document-archives.md)).
- [x] Front-end: search-first archives page + in-portal reader (no browse, no bulk download)
- [ ] Server-side **search endpoint** over the OCR index (index stays off the client)
- [ ] Streaming page-by-page document viewer (download disabled)
- [ ] Ingest pipeline per archive (Managalas indexed; CSIRO, Kokoda, QABB, … to follow)
**Deliverable:** users find and read documents without exposing the collection or file structure.

## Phase 3 — Accounts, tiered access & usage logging  ·  ~3–4 weeks
**Goal:** login, role-based visibility, and M&E usage capture.
- [ ] Auth (Supabase or in-house)
- [ ] Roles: public / registered / partner / admin ([`05-access-tiers.md`](05-access-tiers.md))
- [ ] Row-level security so private layers (biodiversity precise locations, DAL crop data) are gated
- [ ] Admin upload flow for curated layers
- [ ] **Usage logging by tier** feeding the M&E dashboard ([`07-monitoring-evaluation.md`](07-monitoring-evaluation.md)):
      aggregate public totals; attributed named-user detail; CSV/PDF export
**Deliverable:** registered/partner users see richer data; sensitive layers protected; usage reportable.

## Phase 4 — Automated change detection & reporting  ·  ~4–8 weeks
**Goal:** the portal *tells you* what changed.
- [ ] Define "reportable issues" with local input (e.g. forest loss > X ha inside MCA, new roads, fires in core zones, encroachment)
- [ ] Scheduled GEE job: pull latest alerts (RADD/FIRMS/TMF), intersect with boundaries & zones, classify
- [ ] Tune against PNG cloud cover to suppress false positives
- [ ] Generate periodic **PDF report + email digest**; store history in DB
**Deliverable:** regular automated reports of changes and potential issues in Oro.

## Phase 4b — On-demand site analysis ("mini-MLA")  ·  ~2–4 weeks (parallelisable)
**Goal:** a user picks any site and the portal generates a short landscape profile — a
series of maps + summary stats ([`09-site-analysis.md`](09-site-analysis.md)).
- [ ] AOI input: draw (point/line/polygon) or upload (GeoJSON/KML/GPX/shapefile)
- [ ] Point/line **buffer** (default 500 m, user-adjustable)
- [ ] Per-theme zonal analysis via GEE (or in-house Python): topography, land cover,
      forest cover/loss, canopy/carbon, fire, climate, hydrology, accessibility/population,
      and overlaps (MCA / KBA / protected areas / compartments)
- [ ] Async job + progress; **site report** on screen and **PDF/DOCX** export
- [ ] Tiering, rate limits, max-AOI cap; AOIs stored transiently / per account
**Deliverable:** "tell me about *this* site" — an on-demand mini-MLA for any AOI in Oro.
Reuses the Phase-2 GEE endpoints and the MCA_MLA analysis recipe.

## Phase 5 — Hardening & handover  ·  ~2–3 weeks
- [ ] Backups, monitoring, uptime
- [ ] Documentation & admin training
- [ ] Data-sharing agreements finalised for national/partner layers
- [ ] Decide final hosting (CIFOR-ICRAF vs commercial) per [`03-hosting.md`](03-hosting.md)

## Timeline summary

| Phase | Focus | Effort |
|---|---|---|
| 1 | Public map MVP + front page | 2–4 weeks |
| 2 | GEE pipeline (11 layers) | 3–5 weeks |
| 2b | Document archives (parallel) | 2–4 weeks |
| 3 | Accounts, tiers & usage logging | 3–4 weeks |
| 4 | Automated reporting | 4–8 weeks |
| 4b | On-demand site analysis (mini-MLA, parallel) | 2–4 weeks |
| 5 | Hardening & handover | 2–3 weeks |
| **Total** | | **~4–6.5 months** |

## Difficulty & risk

- **Low risk / easy:** public map, terrain, forest cover/change, fire — proven,
  mostly keyless, days-to-weeks.
- **Moderate:** login + tiered private layers — standard web work.
- **Highest effort:** the reporting engine — not because the tech is exotic, but
  because defining "an issue" and tuning alerts against cloud cover takes iteration
  with local knowledge.

Nothing here is research-grade hard. The dominant risks are **scope creep** and
**data-sharing agreements** for national/partner datasets — not technical feasibility.
