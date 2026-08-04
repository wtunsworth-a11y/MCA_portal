# 06 · Document Archives

The portal hosts historical **document archives** relating to Managalas and its partners.
Each archive is a scanned collection that has been run through an OCR + indexing pipeline
so it can be searched by keyword and read inside the portal.

## Archives

Working titles (more will be added):

| Archive | Scope | Status |
|---|---|---|
| **Managalas** | History of the Managalas Conservation Area — Partners With Melanesians | Indexed — **229 documents, 4,540 pages** (indexed 2026-07-27) |
| **CSIRO** | CSIRO scientific studies and survey reports for the region | Planned |
| **Kokoda** | Kokoda Track corridor — historical and environmental records | Planned |
| **QABB** | Queen Alexandra's Birdwing Butterfly — conservation and research | Planned |

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

## Low-bandwidth handling

- Search returns small JSON (a page of matches), not the whole index.
- The reader streams **one page at a time**; the user never downloads a whole PDF to view it.
- No document data is written to the user's device.

## Client structure (this repo)

- `app/library.html` — the archives page: archive tabs, search box, results, in-portal reader.
- `app/js/archives.js` — a small **representative sample** so the UI works offline; production
  is served by the search API. Deliberately contains **no** file paths, source names or URLs.
- `app/js/library.js` — search-first rendering + the in-portal reader modal.
