#!/usr/bin/env python3
"""One-off probe: test candidate near-real-time deforestation/disturbance assets
in Earth Engine for existence, band structure, Oro coverage and latest date, so
we can pick a current replacement for the lagging RADD community feed.

Prints JSON to stdout (read from the Action logs). Commits nothing.
"""
import os, json
PROJECT = os.environ.get("EE_PROJECT", "orodataportal")
BBOX = [146.8, -10.0, 149.7, -7.9]

import ee
key = os.environ["EE_SERVICE_ACCOUNT_KEY"]
info = json.loads(key)
ee.Initialize(ee.ServiceAccountCredentials(info["client_email"], key_data=key), project=PROJECT)
region = ee.Geometry.Rectangle(BBOX)
out = {}


def probe(name, fn):
    try:
        out[name] = fn()
    except Exception as e:
        out[name] = "ERR: " + str(e)[:220]


def maxval(img, band, scale=90):
    try:
        v = img.select(band).reduceRegion(ee.Reducer.max(), region, scale,
            maxPixels=1e10, bestEffort=True).get(band).getInfo()
        return v
    except Exception as e:
        return "err:" + str(e)[:80]


def glad_l():
    ic = ee.ImageCollection("projects/glad/alert/UpdResult")
    img = ic.mosaic()
    bn = img.bandNames().getInfo()
    res = {"ic_size": ic.size().getInfo(), "bands": bn}
    for b in bn:
        if "alertDate" in b:
            res[b + "_max"] = maxval(img, b)
    return res
probe("GLAD_L  projects/glad/alert/UpdResult", glad_l)


def opera_ann():
    ic = ee.ImageCollection("OPERA/DIST/L3_DIST-ANN-HLS/V1")
    sub = ic.filterBounds(region)
    res = {"ic_size_total": ic.size().getInfo(), "ic_size_oro": sub.size().getInfo()}
    first = sub.sort("system:time_start", False).first()
    res["bands"] = first.bandNames().getInfo()
    res["VEG-DIST-DATE_max(days since 2020-12-31)"] = maxval(sub.select("VEG-DIST-DATE").max(), "VEG-DIST-DATE")
    return res
probe("OPERA_ANN  OPERA/DIST/L3_DIST-ANN-HLS/V1", opera_ann)


# candidate NRT OPERA ids
for aid in ["OPERA/DIST/L3_DIST-ALERT-HLS/V1", "OPERA/DIST-ALERT-HLS/V1",
            "projects/opera/assets/DIST-ALERT-HLS", "NASA/OPERA/DIST-ALERT-HLS/V1"]:
    def f(aid=aid):
        ic = ee.ImageCollection(aid)
        sub = ic.filterBounds(region)
        return {"ic_size_total": ic.size().getInfo(), "ic_size_oro": sub.size().getInfo(),
                "bands": sub.first().bandNames().getInfo()}
    probe("OPERA_NRT  " + aid, f)


# GLAD-S2 candidates
for aid in ["projects/glad/S2alert/alerts", "projects/glad/S2alert/UpdResult"]:
    def f(aid=aid):
        try:
            img = ee.Image(aid)
            return {"type": "Image", "bands": img.bandNames().getInfo()}
        except Exception:
            ic = ee.ImageCollection(aid)
            return {"type": "IC", "ic_size": ic.size().getInfo(), "bands": ic.first().bandNames().getInfo()}
    probe("GLAD_S2  " + aid, f)


print("PROBE_RESULT_JSON_START")
print(json.dumps(out, indent=1, default=str))
print("PROBE_RESULT_JSON_END")
