# 07 · Monitoring & Evaluation (Usage)

The project needs to report **who is using the portal and how** as part of its M&E. The
portal logs usage server-side against the access tier and presents it on the **Usage**
dashboard (`app/analytics.html`).

## Two levels of reporting

### Public portal — aggregate only
No login, so **no personal data** is collected. The portal keeps aggregate counters:

- Page views, estimated unique visitors
- Map sessions and most-viewed datasets
- Archive searches (and top search terms)
- Documents opened

These give a simple, privacy-respecting total of public reach.

### Named users — detailed
Registered and partner sign-ins are attributed to the account, so reporting can show
per-user activity for donor/partner accountability:

- Sessions, datasets viewed, documents read, last active
- Organisation and tier
- Roll-ups by tier (registered vs partner) and by organisation

## Metrics captured

| Event | Public | Named user |
|---|---|---|
| Visit / session | aggregate count | attributed |
| Dataset (map layer) viewed | aggregate count | attributed + which layers |
| Archive search | aggregate count + term | attributed + term |
| Document opened / read | aggregate count | attributed + which document |
| Sign-in | — | attributed |

## Privacy principles

- The public tier is **anonymous and aggregate**; we do not fingerprint or identify
  anonymous visitors.
- Named-user detail is only available to **admin/partner** roles and used for project
  reporting, not shared publicly.
- Retention and export follow the project's data-governance rules; per-user detail can be
  aggregated or purged at the end of a reporting period.

## Reporting outputs

- The Usage dashboard summarises the current period (KPIs, monthly activity by tier,
  top datasets, top searches, named-user table).
- Figures export to **CSV/PDF** per reporting period for inclusion in project reports.

## Implementation notes

- Events are written to an append-only log (a `usage_events` table in the backend, or a
  privacy-friendly analytics service) keyed by tier and — for signed-in users — account id.
- The dashboard reads pre-aggregated summaries so it stays fast on slow connections.
- The figures in `app/js/analytics.js` are **illustrative**; production reads the event log.

## Pilot analytics — Cloudflare Web Analytics

For the GitHub Pages pilot there is no backend event log, so real public-tier usage is
measured with **Cloudflare Web Analytics**:

- **What it gives us:** unique visitors, page views, top pages, countries and referrers,
  over time — the aggregate public-tier numbers we report against SO1.
- **Why this service:** free, and **privacy-preserving by design** — no cookies, no
  cross-site tracking, IP addresses anonymised — so it needs **no cookie-consent banner**
  and fits the privacy principles above and the DICT data-governance discussion.
- **How it's wired:** `app/js/cf-analytics.js` injects Cloudflare's beacon on every page
  (loaded from each page's `<head>`). It stays inert until a **token** is pasted into that
  file — the token is a public site identifier from the Cloudflare dashboard
  (Analytics & Logs → Web Analytics), safe to commit. This is separate from
  `app/js/analytics.js`, which only renders the illustrative M&E dashboard.
- **Where the numbers live:** in the Cloudflare dashboard, not in this repo. Counting
  starts from the moment the token is added; there is no retrospective data before that.
- **When IT hosts the portal properly:** this can be replaced by a self-hosted
  privacy-friendly service (e.g. Plausible/Matomo) feeding the same Usage dashboard, with
  no change to the tiered reporting model.
