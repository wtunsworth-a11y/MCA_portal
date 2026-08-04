# 03 · Hosting Options & Cost

The portal splits cleanly into parts with very different hosting needs. This is what
keeps the bill low: only the **private backend** needs a real server — the public
map and most data feeds don't.

| Part | Needs a server? | Cheapest option |
|---|---|---|
| Public map front-end | No — static files | Free static hosting (CDN) |
| Public data layers | No — pulled from GEE / free tile services | $0 |
| Private layers + login (tiers) | Yes — small backend | ~$0–25/mo |
| Processing & reporting | Scheduled, not always-on | $0 (GEE + cron/Actions) |

## Option A — CIFOR-ICRAF servers

**Best for:** data sovereignty and no recurring cloud bill.

- **Pros:** likely existing Earth Engine access; institutional credibility; sensitive
  PNG/partner data (PNGRIS, PNGLES, NFI, biodiversity) stays in-house; no monthly cost.
- **Cons:** depends on their IT for provisioning, uptime, backups and security
  patching, which can be slower to move; you own more of the ops burden.
- **Good fit for:** the **private data store** and report generation. Even in a
  mostly-commercial setup, hosting the sensitive layers here is attractive.

## Option B — Managed commercial cloud

**Best for:** speed of delivery and low ops burden on the MVP.

- **Front-end** (static) → **Cloudflare Pages / Netlify / GitHub Pages** — free,
  global CDN, automatic HTTPS.
- **Public layers** → served from GEE and free tile services — **$0**.
- **Backend** (auth + PostGIS + private layers) → **Supabase** (managed
  Postgres/PostGIS + auth + storage; generous free tier, ~US$25/mo production) or a
  small **DigitalOcean droplet** (~US$12–24/mo).
- **Processing** → GEE (free) triggered by **GitHub Actions cron** or a cloud
  function — **$0** at this scale.

**Realistic running cost for a real MVP: US$0–50/month**, dominated by the database.

## Option C — Hybrid (recommended)

Take the cheap, fast parts commercial and keep the sensitive parts in-house:

- **Public map + public layers** → free static hosting + GEE. $0.
- **Sensitive/private layers** (PNGRIS, PNGLES, biodiversity, DAL partner data) →
  **CIFOR-ICRAF infrastructure** or a controlled Supabase project.
- **Processing/reporting** → GEE, scheduled.

You get low cost and fast iteration, while sensitive tenure/community/partner data
stays under institutional control. This is the recommended path.

## Cost summary

| Scenario | Front-end | Backend | Processing | Monthly |
|---|---|---|---|---|
| A · All CIFOR-ICRAF | in-house | in-house | GEE | ~$0 + staff/ops |
| B · All commercial | Cloudflare (free) | Supabase (~$25) | GEE + Actions | **~$0–50** |
| C · Hybrid (rec.) | Cloudflare (free) | CIFOR-ICRAF / Supabase | GEE + Actions | **~$0–25** |

Costs exclude a custom domain (~US$10–15/yr) and any Planet NICFI usage beyond the
free tier (the standard NICFI programme tier is free for this use).

## Recommendation

Start on **Option B/C**: ship the public MVP on free static hosting immediately (no
procurement needed), and decide CIFOR-ICRAF vs Supabase for the private backend when
the tiered features land. The front-end never has to change regardless of that choice.
