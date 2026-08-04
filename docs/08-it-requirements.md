# 08 · Hosting Requirements for CIFOR-ICRAF IT

**Project activity reference:** `SO1 · 1.1 · 1.1-4 — Develop data sharing portals`

A short, forwarding-ready summary of what the Oro Data Portal needs in order to run.
It is written for the CIFOR-ICRAF IT team. The fuller technical detail lives in
[`01-architecture.md`](01-architecture.md) and [`03-hosting.md`](03-hosting.md).

> **Hosting model:** this version assumes **all hosting is provided by CIFOR-ICRAF** —
> no commercial cloud, no external hosting services, everything on institutional
> infrastructure and under institutional control.

---

## The one-sentence version

> The whole portal — public website, private database, scheduled reporting and the
> document archive — runs on **CIFOR-ICRAF infrastructure**. The entire ask is one
> modest Linux server (or VM) with a database, plus a public web address and outbound
> internet access so it can read free satellite data. There are **no external hosting
> requirements and no recurring cloud costs.**

---

## What runs where — all in-house

| Component | Runs on | Notes |
|---|---|---|
| Public web map + portal pages | CIFOR-ICRAF web server | Static files served behind nginx / Apache |
| Private data + logins (tenure, community boundaries, partner data) | CIFOR-ICRAF database | PostgreSQL + PostGIS, role-based access |
| Scheduled processing & reporting | CIFOR-ICRAF server | Python job on server cron; no always-on load |
| Document archives (OCR search + in-portal reader) | CIFOR-ICRAF server + storage | Search index and scanned originals stay in-house |
| Satellite / deforestation source data | Read over the internet | Free public feeds — **data pulled in, nothing to host** |

Everything the project controls is hosted by CIFOR-ICRAF. The only thing that comes
from outside is the raw satellite imagery itself, which is **downloaded** from free
public providers — it needs no hosting, no contract and, for the core feeds, no account.

---

## What to ask CIFOR-ICRAF IT for

### A. One Linux server (or VM) that hosts the whole portal
- **OS:** Linux (Ubuntu / Debian LTS preferred)
- **Size:** ~4 vCPU, 8 GB RAM, 100+ GB disk to start (disk grows with the scanned
  archive; all figures easily scaled later)
- **Software:** a web server (nginx / Apache) for the static site; **PostgreSQL with the
  PostGIS extension**; **Python 3**; Docker helpful but not required
- **Scheduling:** server cron (or systemd timers) to run the reporting job on a schedule
- **A public web address:** a subdomain under a CIFOR-ICRAF or project domain
  (e.g. `oro-portal.…`) with a **TLS certificate** and **HTTPS (443) inbound**, ideally
  behind their standard reverse proxy
- **Outbound internet (HTTPS):** so the server can pull free satellite data feeds
- **Backups:** their standard nightly database backup + file/snapshot policy
- **Maintenance:** confirm IT owns OS / security patching and uptime, or that we do

A single machine covers all five components above. It can later be split (web server
separate from database) if load ever requires it, but that is not needed to start.

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

### C. Satellite processing — one decision for IT to note
The heavy satellite analysis can be done either way; either keeps hosting in-house:
- **Preferred (simplest):** use a **free Google Earth Engine research account** to run the
  analysis and pull back only the *results*. Earth Engine is an external *compute service*
  we send jobs to — it hosts nothing of ours and costs nothing. If CIFOR-ICRAF already
  holds an Earth Engine credential, we can use it.
- **Fully self-contained alternative:** if IT prefers **zero external services**, the same
  analysis can run on the CIFOR-ICRAF server with open-source tools (GDAL / rasterio /
  Sentinel downloads). This needs a little more disk and CPU but removes the last outside
  dependency entirely.

Flag which of these CIFOR-ICRAF prefers — it is the only open choice in this setup.

### D. One policy question
- **Email sending:** the reporting job sends periodic email digests. Can it relay through an
  **institutional SMTP server**? (Keeps mail in-house too.)

---

## Cost

- **No recurring hosting cost** beyond CIFOR-ICRAF's own infrastructure — no cloud bills,
  no per-service subscriptions.
- Only possible small item: a **custom domain name** (~US$10–15/yr) *if* a suitable
  CIFOR-ICRAF domain isn't used.
- Core satellite feeds are free; the standard Planet NICFI programme tier is free for this
  use.

---

## What this model gives you

- **Full data sovereignty** — every layer, document and log stays on institutional
  infrastructure; nothing sensitive leaves CIFOR-ICRAF control.
- **No third-party accounts or contracts** for hosting.
- **A single, well-understood machine** to provision, back up and patch.

The trade-off versus a commercial-cloud setup is that CIFOR-ICRAF owns uptime, backups and
security patching for that server — which is exactly the point of an in-house model.

---

## One-line summary for the activity list

> **`SO1 1.1 1.1-4 Develop data sharing portals`** — Entire portal (public site, PostGIS
> database, scheduled reporting and document archive) hosted in-house on one CIFOR-ICRAF
> Linux server; no external hosting and no recurring cloud costs.
