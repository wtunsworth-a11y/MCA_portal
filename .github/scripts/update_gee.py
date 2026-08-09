#!/usr/bin/env python3
"""Generate Earth Engine map-tile URLs for the portal's GEE layers and write them
to app/data/gee_tiles.json, so the static site can use them without a live EE call
(the browser can't authenticate to Earth Engine). Runs in GitHub Actions daily,
authenticating with the service-account key in the EE_SERVICE_ACCOUNT_KEY secret.

Diagnostics are written into the file's 'status' field so failures are visible
without reading Action logs.
"""
import os, json, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "app", "data", "gee_tiles.json")
PROJECT = os.environ.get("EE_PROJECT", "orodataportal")

def write(obj):
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(obj, open(OUT, "w"), indent=0)

def tile_url(image, vis):
    m = image.getMapId(vis)
    return m["tile_fetcher"].url_format

def main():
    result = {"updated": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
              "project": PROJECT, "layers": {}, "status": {}}
    try:
        import ee
        key = os.environ["EE_SERVICE_ACCOUNT_KEY"]
        info = json.loads(key)
        creds = ee.ServiceAccountCredentials(info["client_email"], key_data=key)
        ee.Initialize(creds, project=PROJECT)
    except Exception as e:
        result["status"]["_init"] = "init error: " + str(e)[:300]
        write(result); print(result["status"]); return

    hansen = ee.Image("UMD/hansen/global_forest_change_2023_v1_11")

    def treecover2000():
        tc = hansen.select("treecover2000")
        return {"url": tile_url(tc.updateMask(tc.gt(0)),
                {"min": 0, "max": 100, "palette": ["ffffff", "cfe8cf", "6fbf73", "1b7837", "08421f"]}),
                "attribution": "Hansen/UMD/Google/USGS/NASA"}

    def defor_year():
        ly = hansen.select("lossyear")          # 1..23 => 2001..2023
        return {"url": tile_url(ly.updateMask(ly.gt(0)),
                {"min": 1, "max": 23, "palette": ["fff5b1", "fdae61", "f46d43", "d73027", "a50026", "7a0177"]}),
                "attribution": "Hansen/UMD/Google/USGS/NASA"}

    def worldclim_precip():
        precip = ee.Image("WORLDCLIM/V1/BIO").select("bio12")   # mean annual precip (mm)
        return {"url": tile_url(precip,
                {"min": 0, "max": 5000, "palette": ["ffffcc", "a1dab4", "41b6c4", "2c7fb8", "253494"]}),
                "attribution": "WorldClim v1"}

    for key_name, fn in [("treecover2000", treecover2000), ("defor_year", defor_year), ("worldclim_precip", worldclim_precip)]:
        try:
            result["layers"][key_name] = fn()
            result["status"][key_name] = "ok"
        except Exception as e:
            result["status"][key_name] = "error: " + str(e)[:200]

    write(result)
    print("layers:", list(result["layers"].keys()), "| status:", result["status"])

if __name__ == "__main__":
    main()
