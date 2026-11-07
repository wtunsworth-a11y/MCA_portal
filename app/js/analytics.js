/* Usage & M&E dashboard — honest pilot state (no fabricated figures).
 *
 * Real public-tier usage (visitors, page views, top pages, countries,
 * referrers) is measured with Cloudflare Web Analytics and viewed in the
 * Cloudflare dashboard — see js/cf-analytics.js. Per-account ("named user")
 * reporting activates once registered/partner sign-in exists. This page is an
 * internal M&E view and is intentionally not linked from the public nav.
 *
 * When a read-only Cloudflare Analytics API token (or a server-side event log)
 * is wired in, replace the placeholders below with the live figures. */
(function () {
  "use strict";
  function set(id, html) { var e = document.getElementById(id); if (e) e.innerHTML = html; }
  var ph = "color:var(--faint,#8ba597);font-size:13px;line-height:1.5;padding:14px 2px";

  var note = '<div style="' + ph + '">Live figures are not shown here yet. Public-tier usage ' +
    '(visitors, page views, top pages, countries, referrers) is collected with ' +
    '<b>Cloudflare Web Analytics</b> and read in the Cloudflare dashboard. Per-account ' +
    '(named-user) reporting activates once registered and partner sign-in is live.</div>';

  // KPIs: metric names only, no invented values.
  var kpis = ["Public visits (30d)", "Registered users", "Partner users", "Documents read (30d)"];
  set("kpis", kpis.map(function (k) {
    return '<div class="kpi"><div class="k">' + k + '</div><div class="v">—</div>' +
      '<div class="d flat">awaiting live data</div></div>';
  }).join(""));

  set("monthChart", note);
  set("datasetBars", '<div style="' + ph + '">Most-viewed datasets will appear here from the live analytics feed.</div>');
  set("searchBars", '<div style="' + ph + '">Top archive searches will appear here once search logging is live.</div>');
  set("pubTotals", note);
})();
