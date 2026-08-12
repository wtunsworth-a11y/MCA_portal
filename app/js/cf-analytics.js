/*
 * Cloudflare Web Analytics — privacy-friendly visitor counting.
 * ------------------------------------------------------------------
 * Loads Cloudflare's beacon on every portal page when a token is set.
 * No cookies, no personal data, no cross-site tracking, IPs anonymised —
 * so no consent banner is required. Real visitor counts, top pages,
 * countries and referrers appear in your Cloudflare dashboard (nothing is
 * stored in this repo). This is separate from js/analytics.js, which
 * renders the illustrative M&E dashboard on analytics.html.
 *
 * TO ENABLE: paste your Cloudflare Web Analytics token below.
 *   Cloudflare dashboard → Analytics & Logs → Web Analytics → Add a site
 *   → copy the token from the JS snippet's data-cf-beacon {"token":"..."}.
 * The token is a PUBLIC site identifier (it ships in the page HTML by
 * design) — safe to commit. Leave it empty to keep analytics off.
 */
(function () {
  "use strict";
  var TOKEN = "a346ed265f10432fa3d97c8ac1b6b8b7";  // Cloudflare Web Analytics site token (public)
  if (!TOKEN) return;
  var s = document.createElement("script");
  s.type = "module";
  s.defer = true;
  s.src = "https://static.cloudflareinsights.com/beacon.min.js";
  s.setAttribute("data-cf-beacon", JSON.stringify({ token: TOKEN }));
  document.head.appendChild(s);
})();
