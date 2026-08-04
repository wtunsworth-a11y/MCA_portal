# 09 · On-Demand Site Analysis ("mini-MLA")

Let a user pick **any site** in Oro Province and have the portal generate a short
landscape profile for it — a series of maps plus summary statistics. It is the
[MCA_MLA](https://github.com/wtunsworth-a11y/MCA_MLA) analysis **parameterised by a
user-supplied area of interest (AOI)** instead of the fixed MCA boundary.

> **Why it fits:** the analyses already exist (MCA_MLA computes them for the MCA) and the
> GEE pipeline is already planned. This feature reuses both — it is the scheduled
> reporting engine run **interactively on a user AOI** rather than on a cron for the whole
> Province.

---

## User flow

1. **Define the AOI** — either:
   - **draw** on the map: a point, line, or polygon (MapLibre draw control), or
   - **upload** a file: GeoJSON / KML / GPX / zipped shapefile.
2. **Buffer points and lines** — a point (or line) is buffered to a polygon. Default
   **500 m**, user-adjustable (suggested range 250 m – 5 km). Polygons are used as drawn.
3. **Run the analysis** — the portal computes a per-theme result over the AOI polygon:
   a **map thumbnail + summary statistics** for each theme.
4. **Assemble a site report** — an on-screen panel of maps and stat cards, plus an
   exportable report (**PDF** for everyone; **DOCX** additionally for verified users) using
   the MLA report layout.

---

## Theme set (maps generated per site)

Each theme maps directly to an MCA_MLA section, masked to the AOI:

| Theme | Output for the AOI | MCA_MLA basis |
|---|---|---|
| Topography | Elevation / slope / hillshade map; min–max–mean elevation | SRTM / ALOS |
| Land cover | Land-cover map; % per class | ESA WorldCover / Dynamic World |
| Forest cover & loss | Cover map + loss-year map; **ha and % forest lost** over period | JRC TMF / Hansen |
| Canopy & carbon | Canopy-height map; **mean height, biomass, carbon stock** | ETH canopy / biomass / REDD+ FRL |
| Fire history | Fire-point map; **count by year** | NASA FIRMS |
| Climate | Rainfall & temperature summary | WorldClim / CHIRPS |
| Hydrology | Catchment & rivers within/around the AOI | HydroSHEDS |
| Accessibility & population | Travel-time and population summary | Malaria Atlas / WorldPop |
| **Overlaps** | Does the AOI intersect the **MCA, a KBA, a protected area** — or, for authorised users, a **SABL / logging / mining** compartment? | WDPA / KBA / compartments |

Each theme returns a small image plus one or two numbers (e.g. *"142 ha · 6% forest loss
2001–2023 · mean canopy 24 m · 3 fires since 2012"*).

---

## Where it computes

This is the **sanctioned exception** to "display as served, don't clip" (see the *Data
access model* in [`01-architecture.md`](01-architecture.md)): a per-AOI **zonal analysis**
where masking to the boundary is the whole point.

**Processing runs in Google Earth Engine** (project decision — not on CIFOR-ICRAF
infrastructure). The AOI geometry is sent to GEE, which computes zonal statistics and renders
per-theme thumbnails **server-side** and returns numbers + image URLs. Nothing is downloaded
or warehoused — computed **on demand, per request**, and ideal for slow connections (small
thumbnails + a few numbers, not rasters). The uploaded/drawn geometry transits GEE
**transiently for computation and is not persisted** by the portal.

The job runs **asynchronously** with a progress indicator — a multi-theme run takes several
seconds, so it is not a blocking call.

---

## Access, limits & data handling

Access follows the **groups model** in [`05-access-tiers.md`](05-access-tiers.md):

- **Who can run it.** Everyone, including public users. Public runs over the **public theme
  set**; verified users additionally see the **restricted overlays their groups allow**
  (SLUP → OPG; PFMP → PFMC/PNGFA; a PA's data → that PA's staff; Mining → OPG, provisional).
- **Report export.** **PDF** for everyone; **DOCX** additionally for verified users.
  Delivered by **download** or **email to the verified account** — nothing kept server-side.
- **Nothing stored per user.** The drawn/uploaded AOI and the generated report are
  **transient** — created per request, delivered, discarded. **No history**: re-run to
  regenerate. Never expose one user's site to another; geometry is not redistributed.
- **Rate limiting.** Analysis is real compute, so requests are rate-limited per user/group.
- **Max AOI size.** Cap the AOI area (e.g. a few hundred km²) to bound run time; a
  whole-Province AOI is a heavy job and should be pre-computed instead.

---

## Effort & sequencing

Low-to-moderate. The analyses exist in MCA_MLA and the GEE tile/stat endpoints are already
the Phase-2 plan; this feature reuses the **same endpoints**. It therefore lands **after**
Phase 2 (endpoints) and Phase 3 (accounts, for tiered export and compartment overlaps).
Estimated **~2–4 weeks** on top of those — most of it the report assembly and the
draw/upload UI. See [`04-roadmap.md`](04-roadmap.md), Phase 4b.

> **Note:** MCA_MLA is fixed and read-only for reference. This feature reuses its analysis
> *recipe* (which datasets and queries per theme), not its code or clipped outputs.
