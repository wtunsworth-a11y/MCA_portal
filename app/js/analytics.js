/* Usage & M&E dashboard — illustrative figures rendered with inline SVG/CSS
 * (no external chart library: keeps the page tiny for slow connections and
 * CSP-safe). In production these read from the portal's server-side event log. */
(function () {
  "use strict";

  var kpis = [
    { k: "Public visits (30d)", v: "3,412", d: "+12% vs prev", cls: "up" },
    { k: "Registered users", v: "148", d: "+9 this month", cls: "up" },
    { k: "Partner users", v: "23", d: "no change", cls: "flat" },
    { k: "Documents read (30d)", v: "612", d: "+18%", cls: "up" }
  ];
  document.getElementById("kpis").innerHTML = kpis.map(function (x) {
    return '<div class="kpi"><div class="k">' + x.k + '</div><div class="v">' + x.v +
      '</div><div class="d ' + x.cls + '">' + x.d + "</div></div>";
  }).join("");

  // grouped monthly bar chart (public / registered / partner)
  var months = ["Mar", "Apr", "May", "Jun", "Jul", "Aug"];
  var series = {
    pub:     [1820, 2110, 2460, 2890, 3050, 3412],
    reg:     [210, 240, 300, 355, 402, 470],
    partner: [60, 72, 80, 96, 110, 128]
  };
  (function () {
    var W = 460, H = 200, pad = 28, gap = 14;
    var max = 3600, groups = months.length, gw = (W - pad * 2) / groups;
    var bw = (gw - gap) / 3;
    var cols = ["#5f7a6c", "#4aa8ff", "#f5b301"], keys = ["pub", "reg", "partner"];
    var bars = "", labels = "";
    for (var g = 0; g < groups; g++) {
      var gx = pad + g * gw;
      for (var s = 0; s < 3; s++) {
        var val = series[keys[s]][g], h = (val / max) * (H - pad - 18);
        var x = gx + gap / 2 + s * bw, y = H - 18 - h;
        bars += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + (bw - 2).toFixed(1) +
          '" height="' + h.toFixed(1) + '" rx="1.5" fill="' + cols[s] + '"><title>' +
          months[g] + " " + keys[s] + ": " + val + "</title></rect>";
      }
      labels += '<text x="' + (gx + gw / 2).toFixed(1) + '" y="' + (H - 4) +
        '" fill="#8ba597" font-size="11" text-anchor="middle" font-family="ui-monospace,monospace">' + months[g] + "</text>";
    }
    document.getElementById("monthChart").innerHTML =
      '<svg viewBox="0 0 ' + W + " " + H + '" width="100%" role="img" aria-label="Monthly activity by tier">' +
      '<line x1="' + pad + '" y1="' + (H - 18) + '" x2="' + (W - pad) + '" y2="' + (H - 18) +
      '" stroke="#24352c"/>' + bars + labels + "</svg>";
  })();

  function hbars(elId, data, color) {
    var max = Math.max.apply(null, data.map(function (d) { return d.v; }));
    document.getElementById(elId).innerHTML = data.map(function (d) {
      var pct = (d.v / max) * 100;
      return '<div class="hbar"><span class="lbl">' + d.l + '</span>' +
        '<span class="track"><span class="fill" style="width:' + pct.toFixed(0) + "%;background:" + (color || "#2ea56b") +
        '"></span></span><span class="val">' + d.v.toLocaleString() + "</span></div>";
    }).join("");
  }
  hbars("datasetBars", [
    { l: "Forest change", v: 1240 }, { l: "Fire (FIRMS)", v: 980 },
    { l: "Forest cover", v: 760 }, { l: "Topography", v: 540 },
    { l: "Water", v: 410 }, { l: "Biodiversity", v: 300 }
  ], "#2ea56b");
  hbars("searchBars", [
    { l: "conservation area", v: 214 }, { l: "landowners", v: 176 },
    { l: "birdwing", v: 132 }, { l: "gazettal", v: 98 },
    { l: "biodiversity", v: 87 }, { l: "kokoda", v: 64 }
  ], "#4aa8ff");

  document.getElementById("pubTotals").innerHTML = [
    { l: "Page views", v: 9840 }, { l: "Map sessions", v: 2760 },
    { l: "Archive searches", v: 1450 }, { l: "Documents opened", v: 612 },
    { l: "Est. unique visitors", v: 2110 }
  ].map(function (d) {
    return '<div class="hbar" style="grid-template-columns:1fr 52px"><span class="lbl">' + d.l +
      '</span><span class="val">' + d.v.toLocaleString() + "</span></div>";
  }).join("");

  var users = [
    { u: "j.aihi", tier: "partner", org: "MCA management", s: 41, ds: 9, dr: 27, la: "today" },
    { u: "s.warra", tier: "partner", org: "CIFOR-ICRAF", s: 33, ds: 11, dr: 14, la: "today" },
    { u: "m.tovena", tier: "reg", org: "PNG Forest Authority", s: 22, ds: 7, dr: 9, la: "yesterday" },
    { u: "l.bogari", tier: "reg", org: "UPNG (research)", s: 18, ds: 6, dr: 21, la: "2 days ago" },
    { u: "d.kila", tier: "partner", org: "Dept. of Agriculture", s: 15, ds: 8, dr: 5, la: "3 days ago" },
    { u: "a.nombri", tier: "reg", org: "Independent researcher", s: 12, ds: 4, dr: 11, la: "5 days ago" },
    { u: "p.mavu", tier: "admin", org: "Portal operator", s: 60, ds: 12, dr: 8, la: "today" }
  ];
  document.getElementById("userRows").innerHTML = users.map(function (u) {
    return "<tr><td>" + u.u + '</td><td><span class="tier-pill ' + u.tier + '">' + u.tier.toUpperCase() +
      "</span></td><td>" + u.org + '</td><td class="num">' + u.s + '</td><td class="num">' + u.ds +
      '</td><td class="num">' + u.dr + "</td><td>" + u.la + "</td></tr>";
  }).join("");
})();
