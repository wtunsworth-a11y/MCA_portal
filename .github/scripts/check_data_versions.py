#!/usr/bin/env python3
"""Monthly data-source version check for the Oro Data Portal.

Reports whether any upstream dataset has published a version newer than the one
the portal currently uses, so a human can decide to update. It changes NOTHING —
it only reports. Intended to be run once a month; the findings are emailed to the
portal owner by a scheduled Routine, who then approves the version bump.

Fully auth-free: Hansen is probed via its public tile bucket. WorldCover and
WorldClim can't be probed as cleanly, so they're listed as manual-review items
with catalog links.
"""
import os, re, sys, urllib.request, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CONFIG = os.path.join(ROOT, "app", "js", "config.js")

def http_ok_png(url):
    """True only if the URL returns 200 with an image content-type."""
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status == 200 and "image" in r.headers.get("Content-Type", "")
    except Exception:
        return False

def hansen_year(minor):        # gfc_v1.11 == 2023 ; +1 minor == +1 year
    return 2012 + minor

def current_hansen_minor():
    """Read the version the portal is pinned to, from config.js (single source)."""
    try:
        m = re.search(r"gfc_v1\.(\d+)", open(CONFIG, encoding="utf-8").read())
        if m:
            return int(m.group(1))
    except Exception:
        pass
    return 11  # fallback: last known pin (2023)

def check_hansen():
    cur = current_hansen_minor()
    # probe upward until we hit a gap
    latest = cur
    n = cur + 1
    while n < cur + 12:  # safety bound
        url = "https://storage.googleapis.com/earthenginepartners-hansen/tiles/gfc_v1.%d/loss_alpha/3/7/4.png" % n
        if http_ok_png(url):
            latest = n
            n += 1
        else:
            break
    if latest > cur:
        return ("NEW", "Hansen Global Forest Change",
                "portal uses gfc_v1.%d (%d); latest available is gfc_v1.%d (%d)"
                % (cur, hansen_year(cur), latest, hansen_year(latest)),
                "To update: set the Hansen version to v1.%d in app/js/config.js (loss tile URL) and "
                ".github/scripts/update_gee.py (asset id UMD/hansen/global_forest_change_%d_v1_%d), and "
                "raise the 'Deforestation year' ramp max to %d." % (latest, hansen_year(latest), latest, hansen_year(latest) - 2000))
    return ("OK", "Hansen Global Forest Change",
            "up to date — portal on gfc_v1.%d (%d), no newer version found" % (cur, hansen_year(cur)), "")

def manual_items():
    # Datasets that can't be probed cleanly — flag for a quick human glance.
    return [
        ("REVIEW", "ESA WorldCover", "portal uses v200 (2021). Check for a newer edition.",
         "https://developers.google.com/earth-engine/datasets/catalog/ESA_WorldCover_v200"),
        ("REVIEW", "WorldClim (rainfall)", "portal uses WORLDCLIM/V1/BIO. Check for a newer edition.",
         "https://developers.google.com/earth-engine/datasets/tags/worldclim"),
    ]

def main():
    lines, action_needed = [], False
    status, name, detail, howto = check_hansen()
    if status == "NEW":
        action_needed = True
        lines.append("• [NEW] %s — %s\n    %s" % (name, detail, howto))
    else:
        lines.append("• [ok]  %s — %s" % (name, detail))
    for status, name, detail, url in manual_items():
        lines.append("• [review] %s — %s  (%s)" % (name, detail, url))

    print("Oro Data Portal — monthly data-source version check")
    print("=" * 55)
    print("\n".join(lines))
    print("-" * 55)
    if action_needed:
        print("ACTION NEEDED: a newer dataset version is available. Reply to Claude to approve the update.")
    else:
        print("No new automatic-check versions. (Review items above with a quick glance.)")
    # exit 0 always — this is a report, not a test; delivery is by email.
    return 0

if __name__ == "__main__":
    sys.exit(main())
