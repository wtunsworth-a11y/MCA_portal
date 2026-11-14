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

def oro_geometry(ee):
    """Oro Province geometry from the committed GeoJSON (falls back to bbox)."""
    try:
        gj = json.load(open(os.path.join(DATA, "oro_province.geojson")))
        feats = gj.get("features") or [gj]
        geoms = [ee.Geometry(f["geometry"]) for f in feats if f.get("geometry")]
        return ee.FeatureCollection([ee.Feature(g) for g in geoms]).geometry() if geoms \
            else ee.Geometry.Rectangle(BBOX)
    except Exception:
        return ee.Geometry.Rectangle(BBOX)


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
    oro_geom = oro_geometry(ee)          # Oro Province land (for province-clipped counts)
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

    # RADD near-real-time radar deforestation alerts (Sentinel-1). The community
    # RADD 'asia' feed in Earth Engine can lag, so the window is the 90 days up to
    # the DATA's own latest alert date (not "today"), to avoid a misleading 0.
    RADD_DAYS = 90
    _radd_cache = {}

    def _code_to_date(code):
        yy, ddd = int(code) // 1000, int(code) % 1000
        return datetime.date(2000 + yy, 1, 1) + datetime.timedelta(days=ddd - 1)

    def radd_prep():
        if _radd_cache:
            return _radd_cache
        radd = (ee.ImageCollection("projects/radar-wur/raddalert/v1")
                .filterMetadata("geography", "equals", "asia")
                .filterMetadata("layer", "contains", "alert"))
        img = radd.sort("system:time_start", False).first()
        alert = img.select("Alert")      # 2 = low/unconfirmed, 3 = confirmed/high
        date = img.select("Date")        # YYDDD (YY=year-2000, DDD=day-of-year)
        meta = {}
        try:
            maxcode = (date.updateMask(alert.eq(3)).reduceRegion(
                       ee.Reducer.max(), region, scale=30, maxPixels=1e10, bestEffort=True)
                       .get("Date").getInfo())
        except Exception:
            maxcode = None
        if maxcode:
            latest = _code_to_date(maxcode)
            cutoff = latest - datetime.timedelta(days=RADD_DAYS)
            cutcode = (cutoff.year - 2000) * 1000 + cutoff.timetuple().tm_yday
            meta["data_latest"] = latest.isoformat()
        else:
            cutcode, meta["data_latest"] = 0, None
        _radd_cache["mask"] = alert.eq(3).And(date.gte(cutcode)).selfMask()
        _radd_cache["meta"] = meta
        return _radd_cache

    def radd_recent():
        return radd_prep()["mask"].visualize(palette=["ff2d2d"])

    # GLAD-L Landsat deforestation alerts (UMD/GLAD) — current (2025/2026 bands),
    # forest-loss specific. Primary recent-alert source (RADD community feed lags).
    GLAD_DAYS = 90
    _glad_cache = {}
    GLAD_EPOCH = datetime.date(2020, 1, 1)

    def glad_prep():
        if _glad_cache:
            return _glad_cache
        ic = ee.ImageCollection("projects/glad/alert/UpdResult").filterBounds(region)
        # Every Oro tile carries the current year's band (conf<YY>), so use that
        # directly — select across the whole collection is safe. (Some tiles also
        # carry the prior year, but not all, and select() fails lazily on a tile
        # that lacks a band, so we don't mix years.)
        yy = datetime.datetime.utcnow().year - 2000
        base = (datetime.date(2000 + yy, 1, 1) - GLAD_EPOCH).days   # days since 2020-01-01
        conf = ic.select("conf%d" % yy).mosaic()                    # 0 none, 2 alert, 3 confirmed
        ad = ic.select("alertDate%d" % yy).mosaic()                 # day-of-year within the year
        # confirmed only, CLIPPED TO ORO PROVINCE (not the bbox) so the count and
        # the rendered layer reflect Oro, excluding neighbouring provinces/ocean.
        dateImg = ad.add(base - 1).updateMask(conf.gte(3)).rename("d").clip(oro_geom)
        meta = {"years": [2000 + yy]}
        try:
            maxday = dateImg.reduceRegion(ee.Reducer.max(), region, 30,
                     maxPixels=1e10, bestEffort=True).get("d").getInfo()
        except Exception:
            maxday = None
        if maxday:
            meta["data_latest"] = (GLAD_EPOCH + datetime.timedelta(days=int(maxday))).isoformat()
            cutday = int(maxday) - GLAD_DAYS
        else:
            cutday, meta["data_latest"] = 0, None
        _glad_cache["mask"] = dateImg.gte(cutday).selfMask()
        _glad_cache["meta"] = meta
        return _glad_cache

    def glad_recent():
        m = glad_prep()["mask"]
        if m is None:
            m = ee.Image(0).selfMask()
        return m.visualize(palette=["ff2d2d"])

    def worldclim_precip():
        return ee.Image("WORLDCLIM/V1/BIO").select("bio12").visualize(min=0, max=5000,
               palette=["ffffcc", "a1dab4", "41b6c4", "2c7fb8", "253494"])

    def landcover():
        wc = ee.ImageCollection("ESA/WorldCover/v200").first().select("Map")
        cls = [10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 100]
        pal = ["006400", "ffbb22", "ffff4c", "f096ff", "fa0000", "b4b4b4",
               "f0f0f0", "0064c8", "0096a0", "00cf75", "fae6a0"]
        return wc.remap(cls, list(range(len(cls)))).visualize(min=0, max=len(cls) - 1, palette=pal)

    def canopy():
        # ETH Global Canopy Height 2020 (10 m). Rendered as a GRAYSCALE ramp so the
        # client can decode height back from pixel luminance: height ≈ lum/255 * 40 m.
        # (0..40 m covers PNG tropical canopy; masked ocean/no-data stays transparent.)
        ch = ee.Image("users/nlang/ETH_GlobalCanopyHeight_2020_10m_v1").select(0)
        return ch.updateMask(ch.gte(0)).visualize(min=0, max=40, palette=["000000", "ffffff"])

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
                         ("radd_recent", radd_recent), ("glad_recent", glad_recent),
                         ("worldclim_precip", worldclim_precip), ("landcover", landcover),
                         ("canopy", canopy)]:
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

    # RADD summary for the homepage: count of >=2 ha confirmed clearing events in
    # the last 90 days, and total alerted area. Written to app/data/radd.json.
    radd_out = {"updated": result["updated"], "window_days": RADD_DAYS,
                "geography": "asia", "status": "ok"}
    try:
        prep = radd_prep()
        mask = prep["mask"]
        radd_out["data_latest"] = prep["meta"].get("data_latest")
        patch = mask.connectedPixelCount(260, True)          # RADD 10 m: 2 ha = 200 px
        big = mask.updateMask(patch.gte(200))
        events = big.reduceToVectors(geometry=region, scale=10, geometryType="polygon",
                 eightConnected=True, maxPixels=1e10, bestEffort=True).limit(4800)
        radd_out["events_gt2ha"] = int(events.size().getInfo())
        area = mask.multiply(ee.Image.pixelArea()).reduceRegion(
                reducer=ee.Reducer.sum(), geometry=region, scale=10,
                maxPixels=1e10, bestEffort=True).get("Alert")
        ha = ee.Number(area).divide(1e4).getInfo() if area is not None else None
        radd_out["area_ha"] = round(ha, 1) if ha is not None else None
    except Exception as e:
        radd_out["status"] = "error: " + str(e)[:200]
    json.dump(radd_out, open(os.path.join(DATA, "radd.json"), "w"), indent=0)
    print("radd:", radd_out)

    # GLAD-L summary (primary recent-alert source) -> app/data/glad.json
    glad_out = {"updated": result["updated"], "window_days": GLAD_DAYS,
                "source": "GLAD-L (UMD) Landsat alerts", "extent": "Oro Province", "status": "ok"}
    try:
        gic = ee.ImageCollection("projects/glad/alert/UpdResult").filterBounds(region)
        chist = gic.select("conf26").mosaic().reduceRegion(
                ee.Reducer.frequencyHistogram(), region, 300, maxPixels=1e9, bestEffort=True).getInfo()
        glad_out["_conf26_hist"] = str(chist)[:200]
    except Exception as e:
        glad_out["_conf26_hist"] = "err: " + str(e)[:120]
    try:
        prep = glad_prep()
        mask = prep["mask"]
        glad_out["data_latest"] = prep["meta"].get("data_latest")
        glad_out["years"] = prep["meta"].get("years")
        if mask is None:
            raise RuntimeError("no GLAD year-bands over Oro")
        glad_out["_confirmed_px"] = mask.reduceRegion(ee.Reducer.count(), region, 30,
                                    maxPixels=1e10, bestEffort=True).get("d").getInfo()
        patch = mask.connectedPixelCount(260, True)          # GLAD 30 m: 2 ha = ~22 px
        big = mask.updateMask(patch.gte(22))
        events = big.reduceToVectors(geometry=region, scale=30, geometryType="polygon",
                 eightConnected=True, maxPixels=1e10, bestEffort=True).limit(4800)
        glad_out["events_gt2ha"] = int(events.size().getInfo())
        area = mask.multiply(ee.Image.pixelArea()).reduceRegion(
                reducer=ee.Reducer.sum(), geometry=region, scale=30,
                maxPixels=1e10, bestEffort=True).get("d")
        ha = ee.Number(area).divide(1e4).getInfo() if area is not None else None
        glad_out["area_ha"] = round(ha, 1) if ha is not None else None
    except Exception as e:
        glad_out["status"] = "error: " + str(e)[:200]
    json.dump(glad_out, open(os.path.join(DATA, "glad.json"), "w"), indent=0)
    print("glad:", glad_out)

if __name__ == "__main__":
    main()
