# 08 · Hosting Requirements for CIFOR-ICRAF IT

**Project activity reference:** `SO1 · 1.1 · 1.1-4 — Develop data sharing portals`

A short, forwarding-ready summary of what the Oro Data Portal needs in order to run.
It is written for the CIFOR-ICRAF IT team. The fuller technical detail lives in
[`01-architecture.md`](01-architecture.md) and [`03-hosting.md`](03-hosting.md).

---

## The one-sentence version

> Most of the portal is a static website plus free satellite-data feeds, which we can
> host externally at no cost. What we'd like from CIFOR-ICRAF is a home for the
> **sensitive data** (a small PostgreSQL/PostGIS database) and a way to **run a
> scheduled Python job** that pulls satellite alerts and emails reports. Both are
> modest — a single small Linux VM would cover it.

---

## What needs hosting, and by whom

| Component | Needs a server? | Where it can live | Cost |
|---|---|---|---|
| Public web map + portal pages | No — static files | External CDN (Cloudflare Pages) | $0 |
| Public satellite / deforestation layers | No — pulled from free services | Google Earth Engine / free tiles | $0 |
| **Private data + logins** (tenure, community boundaries, partner data) | **Yes** — small database | **CIFOR-ICRAF** or managed cloud | ~$0–25/mo |
| **Scheduled processing & reporting** | Runs on a schedule, not 24/7 | **CIFOR-ICRAF** or GitHub Actions | ~$0 |
| Document archives (OCR search + reader) | Yes — search index stays server-side | Same box as the database | included |

The only two rows that involve CIFOR-ICRAF IT are the **private database** and the
**scheduled processing** — and both can sit on a single machine.

---

## What to ask CIFOR-ICRAF IT for

### A. One small Linux VM (or container) — this is the whole ask
- **OS:** Linux (Ubuntu / Debian LTS preferred)
- **Size:** ~2 vCPU, 4 GB RAM, 40–80 GB disk to start (easily scaled later)
- **Software:** PostgreSQL with the **PostGIS** extension; ability to run **Python 3**
  and Docker (helpful, not required)
- **Network:** outbound HTTPS to reach Google Earth Engine and free tile services;
  **HTTPS (443) inbound** for the API, ideally behind their reverse proxy with a TLS cert
- **A subdomain** under a CIFOR-ICRAF or project domain (e.g. `portal-api.…` / `maps.…`)
- **Backups:** their standard nightly DB backup + snapshot policy
- **Maintenance:** confirm whether IT handles OS / security patching, or we do

### B. Storage for the document-archive originals
- Scanned collections (Managalas, CSIRO, Kokoda, QABB, …). The OCR text index is small;
  the scanned PDFs / images are the bulk. Estimate total GB once digitised. Can live on
  the same VM's disk or an object / file store they already run.

### C. Google Earth Engine access
- Ask whether CIFOR-ICRAF already holds an **Earth Engine** account / service credential
  we can use (many research institutions do). This runs the satellite analysis for free
  and saves us provisioning our own.

### D. Two policy questions for them
1. **Data sovereignty:** is IT comfortable that sensitive PNG / partner layers (PNGRIS,
   PNGLES, NFI, biodiversity, tenure) stay on their infrastructure? This is the main
   reason to host in-house rather than in commercial cloud.
2. **Email sending:** can the reporting job send outbound email digests via an
   institutional SMTP relay, or should we use an external mail service?

---

## What they do *not* need to provide

Worth stating explicitly, to keep the ask small:

- **No GIS server** (ArcGIS / GeoServer) — heavy satellite processing is offloaded to
  Google Earth Engine.
- **No always-on compute** for processing — it runs on a schedule (cron) and is idle
  the rest of the time.
- **No hosting for the public website** — that is free external static hosting and can
  go live before any procurement.

---

## Recommended framing: the hybrid model

Ship the **public map on free external hosting now** (no procurement, no waiting), and
ask CIFOR-ICRAF only for the **one small VM** that holds the sensitive database and runs
the scheduled reporting. Sensitive data stays under institutional control while
everything public moves immediately.

**Running cost in this model: roughly $0–25/month**, none of which falls on CIFOR-ICRAF
beyond the VM itself.

---

## One-line summary for the activity list

> **`SO1 1.1 1.1-4 Develop data sharing portals`** — Public portal hosted externally at
> no cost; CIFOR-ICRAF to provide one small Linux VM (PostGIS + scheduled Python
> reporting) for sensitive data and change-detection reports.
