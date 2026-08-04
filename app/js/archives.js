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
    { id: "qabb", name: "QABB", blurb: "Queen Alexandra's Birdwing Butterfly — conservation and research.",
      docs: 0, pages: 0, indexed: null, tier: "partner", status: "planned" }
  ],

  // representative searchable records (no file paths / source names / URLs by design)
  records: [
    { ref: "mgl-0001", archive: "managalas", title: "Managalas Plateau Conservation Area — proposal and background",
      date: "1995", pages: 42, tier: "public",
      keywords: ["conservation area", "plateau", "customary land", "proposal"],
      snippet: "…the Managalas Plateau supports montane rainforest and the customary landowners of the …clans have sought protection of the area under the Conservation Areas Act…" },
    { ref: "mgl-0002", archive: "managalas", title: "Partners With Melanesians — community engagement report",
      date: "2004", pages: 28, tier: "public",
      keywords: ["community", "engagement", "awareness", "landowners"],
      snippet: "…awareness patrols visited villages across the plateau to explain the boundaries and the benefits of the proposed conservation area to resource owners…" },
    { ref: "mgl-0003", archive: "managalas", title: "Biodiversity notes — birds and mammals of the plateau",
      date: "2008", pages: 16, tier: "public",
      keywords: ["biodiversity", "birds", "mammals", "survey"],
      snippet: "…records include several bird of paradise species and cuscus; the montane forest is largely intact above 800 m elevation…" },
    { ref: "mgl-0004", archive: "managalas", title: "Gazettal correspondence — Conservation Areas Act",
      date: "2017", pages: 9, tier: "public",
      keywords: ["gazettal", "designation", "2017", "legal"],
      snippet: "…formal designation of the Managalas Conservation Area was gazetted in 2017, making it one of the largest community-led conservation areas in Papua New Guinea…" }
  ]
};
