# 08 · Hosting Requirements for CIFOR-ICRAF IT

**Project activity reference:** `SO1 · 1.1 · 1.1-4 — Develop data sharing portals`

A short, forwarding-ready summary of what the Oro Data Portal needs in order to run.
It is written for the CIFOR-ICRAF IT team. The fuller technical detail lives in
[`01-architecture.md`](01-architecture.md) and [`03-hosting.md`](03-hosting.md).

> **Hosting model:** **all hosting is provided by CIFOR-ICRAF** — no commercial cloud,
> everything on institutional infrastructure and under institutional control. The one
> external service is **Google Earth Engine (GEE)**, used purely as a free *compute* service
> for satellite/spatial analysis — it stores **none** of our data. Sensitive layers never
> leave CIFOR-ICRAF.

---

## The one-sentence version

> The whole portal — public website, private database, scheduled reporting and the document
> archive — runs on **CIFOR-ICRAF infrastructure**. Heavy satellite analysis is offloaded to
> **Google Earth Engine**, a free external compute service that stores none of our data. The
> entire ask is one modest Linux server with a database, a public web address, outbound
> internet, and a Google Earth Engine account. **No commercial cloud and no recurring cloud
> costs.**

---

## What runs where

| Component | Runs on | Notes |
|---|---|---|
| Public web map + portal pages | CIFOR-ICRAF web server | Static files served behind nginx / Apache |
| Private data + logins (tenure, community boundaries, partner data) | CIFOR-ICRAF database | PostgreSQL + PostGIS, role-based access |
| Document archives (OCR search + in-portal reader) | CIFOR-ICRAF server + storage | Search index and scanned originals stay in-house |
| Satellite / spatial analysis + the site-analysis tool | **Google Earth Engine** | Free external **compute**; results returned, **nothing of ours stored there** |
| Scheduled reporting trigger | CIFOR-ICRAF server | Light cron job calls GEE, writes results to the database, emails the digest |
| Satellite / deforestation source data | Read over the internet | Free public feeds — data pulled in, nothing to host |

The data CIFOR-ICRAF holds (private database + document archives) stays entirely in-house.
Google Earth Engine does the number-crunching on **public** satellite data and returns
results; it is a compute service we send jobs to, not a place our data lives.

---

## What to ask CIFOR-ICRAF IT for

### A. One Linux server (or VM) that hosts the portal
Heavy processing is offloaded to Google Earth Engine, so the server stays light — it runs
the website, the database, the archives, and a small scheduled job.
- **OS:** Linux (Ubuntu / Debian LTS preferred)
- **Size:** ~2–4 vCPU, 8 GB RAM, 100+ GB disk to start (disk grows with the scanned archive;
  all figures easily scaled later)
- **Software:** a web server (nginx / Apache); **PostgreSQL with the PostGIS extension**;
  **Python 3** (for the GEE trigger + report generation); Docker helpful but not required
- **Scheduling:** server cron (or systemd timers) to run the reporting trigger on a schedule
- **A public web address:** a subdomain under a CIFOR-ICRAF or project domain
  (e.g. `oro-portal.…`) with a **TLS certificate** and **HTTPS (443) inbound**, ideally
  behind their standard reverse proxy
- **Outbound internet (HTTPS):** to reach **Google Earth Engine** and free tile/data feeds
- **Backups:** their standard nightly database backup + file/snapshot policy
- **Maintenance:** confirm IT owns OS / security patching and uptime, or that we do

A single machine covers all of the above. It can later be split (web server separate from
database) if load ever requires it, but that is not needed to start.

### B. Storage for the document-archive originals
The scanned PDFs / images are the bulk of the disk need (the OCR text index itself is
small). Current estimates:

| Archive | Estimated size |
|---|---|
| Managalas (MCA) | 1 GB |
| QABB | 1 GB |
| Kokoda | 1 GB |
| CSIRO | 100 MB |
| Allowance for other / future archives | 5 GB |
| **Total to plan for** | **~8 GB** |

So ~8 GB of scanned originals today, comfortably inside the 100 GB disk above (which also
holds the OS, database, working space and generated reports). Can live on the server's own
disk or on an institutional file / object store IT already runs.

### C. Google Earth Engine account (confirmed)
Satellite and site analysis run in **Google Earth Engine** — this is decided. GEE is free
for research / non-commercial use and hosts none of our data.
- **Ask:** does CIFOR-ICRAF already hold an Earth Engine account / service credential we can
  use? If not, we register one (free).
- **Data note for IT:** only **public** satellite analysis and any **user-drawn area of
  interest** (from the site-analysis tool) are sent to GEE — transiently, for computation,
  and not stored. **Private / sensitive layers** (tenure, community boundaries, partner data,
  precise biodiversity) are **never** sent to GEE; they stay in the in-house database.

### D. One policy question
- **Email sending:** the scheduled reporting job and the site-analysis tool send email
  (report digests, and user site reports on request). Can these relay through an
  **institutional SMTP server**? (Keeps mail in-house too.)

---

## Cost

- **No recurring hosting cost** beyond CIFOR-ICRAF's own infrastructure — no cloud bills,
  no per-service subscriptions.
- **Google Earth Engine is free** for research / non-commercial use.
- Only possible small item: a **custom domain name** (~US$10–15/yr) *if* a suitable
  CIFOR-ICRAF domain isn't used.
- Core satellite feeds are free; the standard Planet NICFI programme tier is free for this use.

---

## What this model gives you

- **Data sovereignty where it matters** — every private layer, document and log stays on
  institutional infrastructure. Only public satellite analysis and user-drawn areas of
  interest transit Google Earth Engine, transiently, with nothing of ours stored there.
- **No commercial cloud and no per-service subscriptions.**
- **A single, well-understood machine** to provision, back up and patch — kept light because
  heavy compute is offloaded to GEE.

The trade-off versus a commercial-cloud setup is that CIFOR-ICRAF owns uptime, backups and
security patching for that server — which is exactly the point of an in-house model.

---

## One-line summary for the activity list

> **`SO1 1.1 1.1-4 Develop data sharing portals`** — Portal (public site, PostGIS database,
> scheduled reporting and document archive) hosted in-house on one CIFOR-ICRAF Linux server,
> with satellite analysis via Google Earth Engine (free external compute, no data stored
> there); no commercial cloud and no recurring cloud costs.
