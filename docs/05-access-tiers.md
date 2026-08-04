# 05 · Access Groups

The portal has a **public base** plus **verified organisational groups**. Access is granted
by **group membership** and enforced in the backend (not just hidden in the UI). Membership
is **additive** — a user can belong to several groups and receives the union of their access.

## Groups

### Public (no login)
Open to anyone, **including researchers**.
- **View public data** only.
- Run **Site analysis** on public layers, with **PDF** export.
- No restricted layers, no archives.

### OPG staff — Oro Provincial Government (verified)
Everything public, plus:
- **Site analysis** with any restricted overlays the user's groups allow
- **SLUP** data (documents + spatial)
- **Mining** concessions — *provisional; depends where the data is sourced from*

### Protected-area staff (verified, scoped per PA)
Everything public, plus:
- **Their own protected area's** data and archive — scoped by **WDPA identifier**.
  PA identifiers are sourced from **CEPA** using WDPA data.
- Example: **MCF staff → Managalas (MCA) archive**. Staff of another PA see only theirs.

### PFMC members & PNGFA staff (verified)
Everything public, plus:
- **PFMP** data (documents + spatial)

### Admin (portal operators)
- Manage users, **verify accounts**, assign groups and PA scope
- Publish/curate layers, configure the site tool and reporting
- Audit logs

> **LUMENS** placement is **to be decided** once the final LUMENS data layers are produced.

## Group-by-data matrix

| Data | Public | OPG | PA staff *(own PA)* | PFMC / PNGFA | Admin |
|---|:--:|:--:|:--:|:--:|:--:|
| Public layers (topography, forest cover/change, fire, weather, water base, generalised biodiversity) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Site analysis tool (public layers) | ✅ | ✅ | ✅ | ✅ | ✅ |
| SLUP (docs + spatial) | — | ✅ | — | — | ✅ |
| PFMP (docs + spatial) | — | — | — | ✅ | ✅ |
| PA archive & data | — | — | ✅ *(own PA)* | — | ✅ |
| Mining concessions | — | ✅ *(provisional)* | — | — | ✅ |
| LUMENS | — | *TBD* | — | *TBD* | ✅ |
| Precise / sensitive biodiversity locations | — | *per source* | *own PA* | — | ✅ |

Refine the biodiversity and LUMENS rows once data sources are settled.

## Verification

- **Admin verification (default).** Admin approves each account and assigns its group(s) and
  any PA scope.
- **Self-verification by trusted email domain (where available).** A person signing up with an
  **OPG-domain email** confirms it via a link and is **auto-assigned the OPG group** — no
  manual step. The same pattern extends to any organisation with a controlled domain (PNGFA;
  MCF → MCA scope; etc.): *domain → group* (and → PA scope where relevant).
  - Guardrails: verify by **confirmation link** (proves mailbox control, not just a typed
    address); Admin can override/revoke; handle shared mailboxes and departed staff via
    periodic re-verification/review; orgs without a clean domain fall back to manual Admin
    verification.
- This is part of the **DICT** rollout liaison.

## Data handling — nothing stored per user

- **No per-user data is stored.** Uploaded polygons and generated maps/reports are
  **transient**: created in memory per request, delivered, then discarded. There is **no
  server-side history** — a user re-runs an analysis to regenerate it (cheap, live compute,
  deterministic for the same AOI).
- **Processing runs in Google Earth Engine** (not on CIFOR-ICRAF infrastructure). AOI
  geometry is sent to GEE transiently for computation and is **not persisted** by the portal.

## Report delivery (Site analysis)

- **PDF** for everyone (public + verified).
- **DOCX** additionally for **registered (verified) users**.
- Delivered by **download** (streamed, nothing kept) or **email to the verified account**
  (institutional SMTP) — email suits slow connections. Screenshot is the informal fallback.

## Sensitivity principles

- **Protect at-risk species / sensitive locations.** Precise locations remain restricted to
  the appropriate group; the public sees generalised richness/hotspots.
- **Respect data agreements.** National/partner datasets are shared under agreement; group
  membership enforces the terms.
- **Community & tenure data.** Sensitive; exposed only to the appropriate group and with consent.
- **Least privilege.** New users start with public access only; groups are added deliberately
  and recorded against the relevant data-sharing agreement.
