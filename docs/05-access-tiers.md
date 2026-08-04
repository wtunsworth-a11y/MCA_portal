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

## Restricted access groups (compartments)

Tiers above are a **ladder** — each step includes the one below. Some datasets don't fit
a ladder: they are **need-to-know compartments** granted per group, independent of tier. A
user may belong to one compartment and not another, and membership controls **both the
documents and the spatial layers** for that theme. Someone can hold the SLUP compartment
but not PFMP, or the document archive for a theme but not its spatial layer.

| Compartment | Covers (documents **and** spatial) | Source / becomes available when | Granted to |
|---|---|---|
| **SLUP** | Sustainable Land Use Plan working data — incl. any SABL / customary-lease boundaries surfaced during planning | Produced during SLUP preparation | SLUP team + named partners |
| **PFMP** | Provincial Forest Management Plan data — incl. logging concession boundaries | Produced when the PFMP is written | PFMP team + named partners |
| **LUMENS** | LUMENS model inputs/outputs (ecosystem-service & carbon layers, working files) | ICRAF LUMENS workflow | LUMENS modellers + named partners |
| **Mining** | Mining concession / tenement boundaries | May become available via the Provincial Government | Named partners |

Principles for compartments:

- **Orthogonal to tiers.** Compartment membership is granted explicitly per user, not
  earned by climbing the tier ladder. Even a Partner-tier user sees a compartment only if
  added to that group.
- **Documents and spatial together.** A compartment gates its whole theme — the archive
  documents *and* the map layers — so access stays consistent across the portal.
- **Per-archive granularity.** Membership is per compartment, so one user may have several
  archives open and another just one.
- **Least privilege by default.** New users get none of these; they are added deliberately,
  with the grant recorded against the relevant data-sharing agreement.

> **Rollout note — DICT.** We will need to **liaise with the Department of Information &
> Communications Technology (DICT)** on the rollout of this access model (user provisioning,
> data-sharing governance and any hosting/security requirements on the PNG side).

## Sensitivity principles

- **Protect at-risk species.** Precise locations of threatened or harvestable species
  are partner-tier only; the public sees generalised richness. This prevents the portal
  from becoming a targeting tool for poaching or unauthorised harvest.
- **Respect data agreements.** National/partner datasets (PNGRIS, PNGLES, NFI, DAL)
  are shared under agreements; tiering enforces those terms.
- **Community data.** Community boundaries and tenure are sensitive; expose only with
  consent and at the appropriate tier.
