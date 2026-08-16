# 06 · Document Archives

The portal hosts historical **document archives** relating to Managalas and its partners.
Each archive is a scanned collection that has been run through an OCR + indexing pipeline
so it can be searched by keyword and read inside the portal.

## Archives

Working titles (more will be added):

| Archive | Scope | Status |
|---|---|---|
| **Managalas** | History of the Managalas Conservation Area — Partners With Melanesians | Indexed — **229 documents, 4,540 pages** (indexed 2026-07-27) |
| **CSIRO** | CSIRO Land Research Series (LRS) and survey reports for the region | **Catalogue only — 6 titles** (2026-08-16). Titles + keywords searchable; documents and source files withheld (no permission to share) |
| **Kokoda** | Kokoda Track corridor — historical and environmental records | Planned |
| **QABB** | Queen Alexandra's Birdwing Butterfly — conservation and research | **Catalogue only — 147 titles** (2026-08-15). Titles + keywords searchable; document text and source files withheld pending permission clearance |

Each archive corresponds to a source document set (e.g. a Google Drive folder). The
originals are **not** exposed to portal users — see the protection model below.

## Ingestion pipeline

The same pipeline that produced the Managalas index is reused per archive:

1. **Collect** the source documents (scans/PDFs).
2. **OCR** each page to extract full text (with rotation correction).
3. **Index** — derive title, keywords, dates, page count, size; flag possible duplicates
   and titles needing review.
4. **Link** each record to its stored original by an internal reference.
5. **Publish** the index to the portal's search service (server-side).

## Protection model — searchable, not browsable

The goal: users can **find and read** documents of interest, but the full library cannot be
copied elsewhere and the file structure is never revealed. Users stay in the portal.

Rules the portal enforces:

- **No browse view.** There is no page that lists a whole archive or its folders. Documents
  are reached only by **searching** (search-first UI — nothing is listed until a query).
- **Server-side search.** The OCR index lives on the server. The browser sends a query and
  receives only the **matching records** (title, snippet, keywords, `ref`). The full index and
  the underlying file names/paths are never sent to the client, so "view source" reveals nothing.
- **In-portal reader.** Opening a result streams the document **page-by-page** into a viewer
  inside the portal. There is no "download all", no direct link to the source drive, and the
  original filename is not shown.
- **Tiered access.** An archive (or individual document) can be public, registered or partner.
  Public archives are readable by anyone; restricted ones require sign-in, which also lets
  usage be attributed for M&E.

> **Migration note.** The existing standalone `MCA_document_index.html` embeds all OCR text and
> Google Drive links in a single file — convenient for review, but it exposes everything to
> anyone who opens it. For the portal, the index moves server-side and is reached only through
> the search endpoint above.

## Interim implementation (current) — accepted, to be made compliant later

**Decision:** the Managalas archive is wired up now with a **client-side** index, and the
server-side compliance work is **deferred**. This is a knowing trade-off to get real
full-text search working immediately.

What's live today:

- The real **229-document Managalas index** is loaded from `app/data/mca_archive.json` and
  searched **in the browser** over title + keywords + **full OCR text**.
- The in-portal reader embeds each document's **Google Drive preview** (view-only).

How this **differs from the target protection model** (the compliance backlog):

- ⚠️ **Full OCR text is shipped to the client** (and currently committed to a public repo),
  rather than staying server-side. Acceptable for the *public* Managalas archive; **not**
  acceptable for restricted archives (QABB/partner, SLUP/PFMP compartments).
- ⚠️ **Drive preview allows download** and needs files shared to render for other users —
  so "no bulk download / no exposed source" is not yet enforced.
- ⚠️ **No per-tier gating** on the client index.

To make it compliant later:

1. Move the index behind a **server-side search endpoint** (or proxy Drive's full-text search).
2. Replace the Drive-preview reader with a **backend streaming route** that blocks download and
   hides the source.
3. Enforce **access groups** so restricted archives never ship to unauthorised clients.

Restricted archives (the SLUP/PFMP compartments) should wait for the server-side
path before going live.

## Restricted, catalogue-only archives (QABB, CSIRO)

QABB and CSIRO are added under a deliberately **minimal exposure** model, because permission
to publish their documents has not been cleared (QABB includes items marked *"Confidential to
CSIRO"*; the CSIRO LRS set is *"no permission to share"*):

- `app/data/qabb_archive.json` (**147** titles) and `app/data/csiro_archive.json` (**6**
  titles) ship **titles, folders, keywords and metadata only** (tier `restricted`).
- They contain **no OCR text, no snippets, no Drive IDs and no URLs**. Because the file
  references never reach the browser, the **source files are unreachable** regardless of the
  UI — this is enforced at the data level, not just by hiding a button.
- In the library, restricted results show a *"Catalogue entry — full text and source file
  withheld pending permission clearance"* line and a disabled **🔒 Awaiting permission**
  button; the in-portal reader refuses to open a `restricted` record.
- Search over these archives therefore matches **titles and keywords only** (no body text).

**To lift the restriction once permission is cleared** (per document or a whole archive):
regenerate that archive's JSON adding the OCR `text`/`snippet` and the `driveId`/`url`, and
change `tier` from `restricted` to `public` (or the appropriate access group). No UI change is
needed — the reader already handles `public` records. Ideally this is done via the
**server-side** path above so the restricted text never ships to the client.

## Low-bandwidth handling

- Search returns small JSON (a page of matches), not the whole index.
- The reader streams **one page at a time**; the user never downloads a whole PDF to view it.
- No document data is written to the user's device.

## Client structure (this repo)

- `app/library.html` — the archives page: archive tabs, search box, results, in-portal reader.
- `app/data/mca_archive.json` — the real Managalas index (229 docs, full OCR text, Drive
  ids/urls). **Interim, client-side** — see *Interim implementation* above.
- `app/data/qabb_archive.json` — the QABB **catalogue** (147 titles + keywords, tier
  `restricted`). **No text, no Drive ids/urls** — see *Restricted, catalogue-only* above.
- `app/data/csiro_archive.json` — the CSIRO **catalogue** (6 titles + keywords, tier
  `restricted`). **No text, no Drive ids/urls** — same model as QABB.
- `app/js/archives.js` — the archive registry (doc counts, tiers, status, and each archive's
  `data` file, which library.js loads at runtime).
- `app/js/library.js` — loads the index, full-text search, and the in-portal Drive-preview reader.
