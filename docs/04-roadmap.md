# 04 · Roadmap & Effort Estimate

Effort assumes **one experienced geospatial web developer**. A basic public
forest-monitoring map is a matter of weeks; the full tiered + automated-reporting
vision is a **3–6 month** build.

## Phase 1 — Public map MVP  ·  ~2–4 weeks
**Goal:** a public web map of Managalas / Oro that anyone can open.
- [x] Repo scaffold, docs, architecture
- [x] MapLibre front-end with basemap switching
- [x] Managalas boundary overlay (replace placeholder with authoritative WDPA/PNG boundary)
- [x] Live forest-loss layer (Hansen tiles — keyless, working today)
- [ ] Wire GEE-served layers via a tile endpoint: Topography (JAXA), Forest Cover/Change (TMF), Fire (FIRMS)
- [ ] Attribution, legend, layer panel polish
- [ ] Deploy to Cloudflare Pages
**Deliverable:** a public URL showing boundaries, terrain, forest cover/change and fires.

## Phase 2 — GEE data pipeline  ·  ~3–5 weeks
**Goal:** all eleven layers available as clipped, styled tiles.
- [ ] Earth Engine app/service account; publish TMF, JAXA, FIRMS, WorldClim, HydroSHEDS as tile layers clipped to Oro
- [ ] Add near-real-time alerts (RADD / GFW integrated) for the "recent change" story
- [ ] SOI (BoM) context chart + ENSO status indicator
- [ ] Ingest curated layers to PostGIS: Soil (PNGRIS), Ecosystem Services (LUMENS), Crop Suitability (PNGLES), BASINS flows
**Deliverable:** every thematic layer visible and legible on the public/preview map.

## Phase 3 — Accounts & tiered access  ·  ~3–4 weeks
**Goal:** login and role-based visibility.
- [ ] Auth (Supabase or in-house)
- [ ] Roles: public / registered / partner / admin ([`05-access-tiers.md`](05-access-tiers.md))
- [ ] Row-level security so private layers (biodiversity precise locations, DAL crop data) are gated
- [ ] Admin upload flow for curated layers
**Deliverable:** registered/partner users see richer data; sensitive layers protected.

## Phase 4 — Automated change detection & reporting  ·  ~4–8 weeks
**Goal:** the portal *tells you* what changed.
- [ ] Define "reportable issues" with local input (e.g. forest loss > X ha inside MCA, new roads, fires in core zones, encroachment)
- [ ] Scheduled GEE job: pull latest alerts (RADD/FIRMS/TMF), intersect with boundaries & zones, classify
- [ ] Tune against PNG cloud cover to suppress false positives
- [ ] Generate periodic **PDF report + email digest**; store history in DB
**Deliverable:** regular automated reports of changes and potential issues in Oro.

## Phase 5 — Hardening & handover  ·  ~2–3 weeks
- [ ] Backups, monitoring, uptime
- [ ] Documentation & admin training
- [ ] Data-sharing agreements finalised for national/partner layers
- [ ] Decide final hosting (CIFOR-ICRAF vs commercial) per [`03-hosting.md`](03-hosting.md)

## Timeline summary

| Phase | Focus | Effort |
|---|---|---|
| 1 | Public map MVP | 2–4 weeks |
| 2 | GEE pipeline (11 layers) | 3–5 weeks |
| 3 | Accounts & tiers | 3–4 weeks |
| 4 | Automated reporting | 4–8 weeks |
| 5 | Hardening & handover | 2–3 weeks |
| **Total** | | **~3.5–6 months** |

## Difficulty & risk

- **Low risk / easy:** public map, terrain, forest cover/change, fire — proven,
  mostly keyless, days-to-weeks.
- **Moderate:** login + tiered private layers — standard web work.
- **Highest effort:** the reporting engine — not because the tech is exotic, but
  because defining "an issue" and tuning alerts against cloud cover takes iteration
  with local knowledge.

Nothing here is research-grade hard. The dominant risks are **scope creep** and
**data-sharing agreements** for national/partner datasets — not technical feasibility.
