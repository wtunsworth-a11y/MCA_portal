#!/usr/bin/env python3
"""Render the portal's Earth Engine layers as single PNG images clipped to Oro
and commit them, so the static site overlays same-origin images (no CORS — the
Earth Engine tile server doesn't send CORS headers, which MapLibre requires).

Writes app/data/gee_<key>.png plus app/data/gee_tiles.json (image paths + bbox).
Runs in GitHub Actions daily with the service-account key in EE_SERVICE_ACCOUNT_KEY.
Diagnostics go in the json 'status' field so failures are visible without logs.
"""
import os, json, datetime, urllib.request, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA = os.path.join(ROOT, "app", "data")
OUT = os.path.join(DATA, "gee_tiles.json")
PROJECT = os.environ.get("EE_PROJECT", "orodataportal")

BBOX = [146.8, -10.0, 149.7, -7.9]   # w, s, e, n — Oro Province extent
DIM = 2048                            # max image dimension (px)

def write_json(obj):
    os.makedirs(DATA, exist_ok=True)
    json.dump(obj, open(OUT, "w"), indent=0)

def download(url, path):
    with urllib.request.urlopen(url, timeout=180) as r:
        open(path, "wb").write(r.read())

def main():
    result = {"updated": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
              "project": PROJECT, "bbox": BBOX, "layers": {}, "status": {}}
    try:
        import ee
        key = os.environ["EE_SERVICE_ACCOUNT_KEY"]
        info = json.loads(key)
        ee.Initialize(ee.ServiceAccountCredentials(info["client_email"], key_data=key), project=PROJECT)
    except Exception as e:
        result["status"]["_init"] = "init error: " + str(e)[:300]
        write_json(result); print(result["status"]); return

    region = ee.Geometry.Rectangle(BBOX)
    thumb = {"region": region, "dimensions": DIM, "format": "png"}
    hansen = ee.Image("UMD/hansen/global_forest_change_2025_v1_13")

    def mosaic_of(asset):
        """Return a single image for an asset that may be an Image or an
        ImageCollection (JRC TMF / GFC2020 / Nature Trace are per-tile
        ImageCollections that must be mosaicked)."""
        try:
            return ee.ImageCollection(asset).mosaic()
        except Exception:
            return ee.Image(asset)

    def treecover2000():
        tc = hansen.select("treecover2000")
        return tc.updateMask(tc.gt(0)).visualize(min=0, max=100,
               palette=["cfe8cf", "6fbf73", "1b7837", "08421f"])

    def defor_year():
        ly = hansen.select("lossyear")   # 1..25 => 2001..2025
        return ly.updateMask(ly.gt(0)).visualize(min=1, max=25,
               palette=["fff5b1", "fdae61", "f46d43", "d73027", "a50026", "7a0177"])

    def defor_post2020():
        # Hansen tree-cover loss AFTER the EUDR cut-off (31 Dec 2020):
        # lossyear 21..25 => 2021..2025. The EUDR-relevant deforestation signal.
        ly = hansen.select("lossyear")
        post = ly.updateMask(ly.gte(21))
        return post.visualize(min=21, max=25,
               palette=["fdae61", "f46d43", "d73027", "a50026", "7a0177"])

    def gfc2020():
        # JRC Global Forest Cover 2020 v2 — the EUDR benchmark forest map.
        # Band 'Map': 1 = forest in 2020. (ImageCollection of tiles -> mosaic.)
        img = mosaic_of("JRC/GFC2020/V2")
        forest = img.select(0).eq(1).selfMask()
        return forest.visualize(palette=["1b7837"])

    def tmf_defor():
        # JRC Tropical Moist Forest — DeforestationYear (latest edition).
        # Values = year of deforestation. Mosaic the per-tile collection.
        img = mosaic_of("projects/JRC/TMF/v1_2025/DeforestationYear").select(0)
        return img.updateMask(img.gt(0)).visualize(min=2001, max=2025,
               palette=["fff5b1", "fdae61", "f46d43", "d73027", "a50026", "7a0177"])

    def forty():
        # Nature Trace Forest Typology (ForTy) 2020 v1.0 — 6-class forest
        # typology aligned to FAO/EUDR definitions. Provisional class order
        # (1 primary, 2 naturally regenerating, 3 planted, 4 plantation,
        # 5 tree crops & agroforestry, 6 other); a histogram is logged to
        # status so the mapping can be confirmed/corrected.
        img = mosaic_of("projects/nature-trace/assets/forest_typology/forest_typology_2020_v1_0_classification").select(0)
        pal = ["05450a", "6fbf73", "bdb76b", "e08214", "ffd92f", "d9d9d9"]
        return img.updateMask(img.gte(1)).visualize(min=1, max=6, palette=pal)

    def worldclim_precip():
        return ee.Image("WORLDCLIM/V1/BIO").select("bio12").visualize(min=0, max=5000,
               palette=["ffffcc", "a1dab4", "41b6c4", "2c7fb8", "253494"])

    def landcover():
        wc = ee.ImageCollection("ESA/WorldCover/v200").first().select("Map")
        cls = [10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 100]
        pal = ["006400", "ffbb22", "ffff4c", "f096ff", "fa0000", "b4b4b4",
               "f0f0f0", "0064c8", "0096a0", "00cf75", "fae6a0"]
        return wc.remap(cls, list(range(len(cls)))).visualize(min=0, max=len(cls) - 1, palette=pal)

    # Diagnostic: ForTy class histogram (confirms the pixel-value encoding).
    try:
        forty_img = mosaic_of("projects/nature-trace/assets/forest_typology/forest_typology_2020_v1_0_classification").select(0)
        hist = forty_img.reduceRegion(reducer=ee.Reducer.frequencyHistogram(),
               geometry=region, scale=100, maxPixels=1e9, bestEffort=True).getInfo()
        result["status"]["_forty_hist"] = str(hist)[:400]
    except Exception as e:
        result["status"]["_forty_hist"] = "hist error: " + str(e)[:200]

    for key_name, fn in [("treecover2000", treecover2000), ("defor_year", defor_year),
                         ("defor_post2020", defor_post2020), ("gfc2020", gfc2020),
                         ("tmf_defor", tmf_defor), ("forty", forty),
                         ("worldclim_precip", worldclim_precip), ("landcover", landcover)]:
        try:
            url = fn().getThumbURL(thumb)
            png = "gee_%s.png" % key_name
            download(url, os.path.join(DATA, png))
            result["layers"][key_name] = {"png": "data/" + png}
            result["status"][key_name] = "ok"
        except Exception as e:
            result["status"][key_name] = "error: " + str(e)[:200]

    write_json(result)
    print("layers:", list(result["layers"].keys()), "| status:", result["status"])

if __name__ == "__main__":
    main()
