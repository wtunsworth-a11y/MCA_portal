# 05 · Access Tiers

The portal offers a **public option plus tiered access** to richer and more sensitive
data. Tiers are enforced in the backend (row-level security in PostGIS/Supabase), not
just hidden in the UI.

## Tiers

### 1. Public (no login)
Open to anyone. Curated, non-sensitive layers only.
- Topography (JAXA), Forest Cover & Change (TMF), Fire (FIRMS)
- Managalas / Oro boundaries, protected-area zones
- Weather normals (WorldClim), SOI status
- Water base (catchments/waterways)
- **Generalised** biodiversity (richness/hotspots) — *not* precise at-risk species locations
- Public summary reports

### 2. Registered (free login)
Verified users (researchers, NGO staff, students).
- Everything public, plus:
- Near-real-time deforestation alerts (RADD / GFW integrated)
- Higher-resolution imagery (NICFI archive)
- Downloadable clips of public layers
- Full report archive & subscriptions

### 3. Partner (agreement required)
Government (DAL, Provincial Government), CIFOR-ICRAF partners, MCA management.
- Everything registered, plus:
- Soil (PNGRIS), Ecosystem Services (LUMENS), Crop Suitability (PNGLES + DAL)
- Precise biodiversity records (PSP/NFI, threatened-species locations)
- BASINS-modelled water flows
- Data upload / contribution

### 4. Admin
Portal operators.
- Manage users, roles and data-sharing agreements
- Publish/curate layers, configure the reporting engine
- Audit logs

## Tier-by-layer matrix

| Layer | Public | Registered | Partner | Admin |
|---|:--:|:--:|:--:|:--:|
| Topography (JAXA) | ✅ | ✅ | ✅ | ✅ |
| Forest Cover/Change (TMF) | ✅ | ✅ | ✅ | ✅ |
| Fire (FIRMS) | ✅ | ✅ | ✅ | ✅ |
| Weather (WorldClim) / SOI | ✅ | ✅ | ✅ | ✅ |
| Water base (catchments/waterways) | ✅ | ✅ | ✅ | ✅ |
| Biodiversity — generalised | ✅ | ✅ | ✅ | ✅ |
| NRT alerts (RADD/GFW) | — | ✅ | ✅ | ✅ |
| NICFI hi-res archive | — | ✅ | ✅ | ✅ |
| Soil (PNGRIS) | — | — | ✅ | ✅ |
| Ecosystem Services (LUMENS) | — | — | ✅ | ✅ |
| Crop Suitability (PNGLES/DAL) | — | — | ✅ | ✅ |
| Biodiversity — precise locations | — | — | ✅ | ✅ |
| Water — BASINS flows | — | — | ✅ | ✅ |

## Sensitivity principles

- **Protect at-risk species.** Precise locations of threatened or harvestable species
  are partner-tier only; the public sees generalised richness. This prevents the portal
  from becoming a targeting tool for poaching or unauthorised harvest.
- **Respect data agreements.** National/partner datasets (PNGRIS, PNGLES, NFI, DAL)
  are shared under agreements; tiering enforces those terms.
- **Community data.** Community boundaries and tenure are sensitive; expose only with
  consent and at the appropriate tier.
