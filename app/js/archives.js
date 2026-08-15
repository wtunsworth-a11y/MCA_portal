/* Oro Data Portal — document archives.
 *
 * PROTECTION MODEL (see docs/06-document-archives.md):
 *  - Archives are *searchable*, not *browsable*: there is no page that lists the
 *    whole collection or exposes the folder/file structure. Users reach a document
 *    only by searching for it.
 *  - Documents are READ INSIDE THE PORTAL via a streaming viewer — no bulk export,
 *    no exposed source filenames, no outbound links to the underlying Drive folders.
 *  - In production the full OCR index and file references live SERVER-SIDE. The
 *    browser calls a search endpoint that returns only the matches (title, snippet,
 *    keywords) and an opaque `ref`; the reader streams that one document. The whole
 *    index is never shipped to the client, so it cannot be copied elsewhere.
 *
 * The records below are a small REPRESENTATIVE SAMPLE so the interface is usable
 * offline. Real archives are ingested by the OCR/index pipeline (the same one that
 * produced the 229-document Managalas index) and served through the search API.
 */
window.PORTAL_ARCHIVES = {
  // archive registry — working titles per the project
  registry: [
    { id: "managalas", name: "Managalas", blurb: "History of the Managalas Conservation Area — Partners With Melanesians.",
      docs: 229, pages: 4540, indexed: "2026-07-27", tier: "public", status: "indexed" },
    { id: "csiro", name: "CSIRO", blurb: "CSIRO scientific studies and survey reports for the region.",
      docs: 0, pages: 0, indexed: null, tier: "reg", status: "planned" },
    { id: "kokoda", name: "Kokoda", blurb: "Kokoda Track corridor — historical and environmental records.",
      docs: 0, pages: 0, indexed: null, tier: "public", status: "planned" },
    { id: "qabb", name: "QABB", blurb: "Queen Alexandra's Birdwing Butterfly — conservation & research. Catalogue only: titles and keywords are searchable; the documents and source files are withheld pending permission clearance.",
      docs: 147, pages: null, indexed: "2026-08-15", tier: "partner", status: "indexed", restricted: true }
  ],

  // The real Managalas records (229 docs, full OCR text) are loaded at runtime
  // from data/mca_archive.json by library.js. This array is a fallback only.
  records: []
};
