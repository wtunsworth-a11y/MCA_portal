#!/usr/bin/env python3
"""Render the cumulative deforestation time series for the Oro Data Portal.

For each year 2001..YEAR_MAX it renders a single PNG clipped to Oro showing ALL
Hansen tree-cover loss up to and including that year (single red), so the map
can drive a year slider by swapping one same-origin image. Same CORS-avoiding
pattern as update_gee.py (Earth Engine tiles lack CORS headers).

Writes app/data/defor/gee_defor_<year>.png and app/data/defor_series.json.
Runs on demand (workflow_dispatch) — re-run when the Hansen version bumps
(the monthly data-version check emails when a newer release appears).
"""
import os, json, datetime, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA = os.path.join(ROOT, "app", "data")
OUTDIR = os.path.join(DATA, "defor")
OUT = os.path.join(DATA, "defor_series.json")
PROJECT = os.environ.get("EE_PROJECT", "orodataportal")

BBOX = [146.8, -10.0, 149.7, -7.9]   # w, s, e, n — Oro Province extent
DIM = 2048
HANSEN = "UMD/hansen/global_forest_change_2025_v1_13"  # keep in step with update_gee.py
YEAR0 = 2000                         # lossyear n => year YEAR0+n
YEAR_MAX = 2025                      # v1.13 covers loss through 2025 (n=25)
COLOR = "e6382d"                     # cumulative forest-loss red

def download(url, path):
    with urllib.request.urlopen(url, timeout=180) as r:
        open(path, "wb").write(r.read())

def main():
    os.makedirs(OUTDIR, exist_ok=True)
    result = {"updated": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
              "project": PROJECT, "bbox": BBOX, "color": "#" + COLOR,
              "years": [], "images": {}, "status": {}}
    try:
        import ee
        key = os.environ["EE_SERVICE_ACCOUNT_KEY"]
        info = json.loads(key)
        ee.Initialize(ee.ServiceAccountCredentials(info["client_email"], key_data=key), project=PROJECT)
    except Exception as e:
        result["status"]["_init"] = "init error: " + str(e)[:300]
        json.dump(result, open(OUT, "w"), indent=0); print(result["status"]); return

    region = ee.Geometry.Rectangle(BBOX)
    ly = ee.Image(HANSEN).select("lossyear")

    for n in range(1, (YEAR_MAX - YEAR0) + 1):
        year = YEAR0 + n
        try:
            cum = ly.gte(1).And(ly.lte(n))          # 1 where loss occurred in 2001..year
            vis = cum.updateMask(cum).visualize(min=0, max=1, palette=[COLOR])
            url = vis.getThumbURL({"region": region, "dimensions": DIM, "format": "png"})
            fn = "gee_defor_%d.png" % year
            download(url, os.path.join(OUTDIR, fn))
            result["years"].append(year)
            result["images"][str(year)] = "data/defor/" + fn
            result["status"][str(year)] = "ok"
        except Exception as e:
            result["status"][str(year)] = "error: " + str(e)[:150]

    json.dump(result, open(OUT, "w"), indent=0)
    print("years:", result["years"], "| statuses:", set(result["status"].values()))

if __name__ == "__main__":
    main()
