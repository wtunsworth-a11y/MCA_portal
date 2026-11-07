#!/usr/bin/env python3
"""Export the two vector layers the portal's in-browser EUDR plot screen samples:

1. app/data/oro_defor_post2020.geojson — contiguous Hansen tree-cover-loss
   clearings >= CLEAR_MIN_HA since the EUDR cut-off (lossyear 2021..2025).
2. app/data/oro_nonforest2020.geojson  — land that was NON-forest in 2020 per the
   JRC GFC2020 v2 benchmark (patches >= NONFOREST_MIN_HA). Oro is overwhelmingly
   forest, so its complement (settlements, gardens, grassland, coastal) is small.

Together these let the screen split any plot three ways — standing forest /
pre-2020 non-forest / cleared since 2020 — client-side, with no backend.

This is a SCREENING INDICATION built on the global Hansen/JRC products (JRC states
GFC2020 has no authoritative status) — not a legal EUDR determination.

Runs in GitHub Actions with the service-account key in EE_SERVICE_ACCOUNT_KEY.
"""
import os, json, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA = os.path.join(ROOT, "app", "data")
PROJECT = os.environ.get("EE_PROJECT", "orodataportal")

CLEAR_OUT = os.path.join(DATA, "oro_defor_post2020.geojson")
NONFOREST_OUT = os.path.join(DATA, "oro_nonforest2020.geojson")

PIXEL_HA = 0.09              # 30 m pixel ~ 0.09 ha
CLEAR_MIN_HA = 2.0           # smallest clearing event to keep (EUDR-meaningful)
NONFOREST_MIN_HA = 1.0       # smallest non-forest patch to keep
CUTOFF_LOSSYEAR = 21         # lossyear 21 => 2021 (first full year after cut-off)
UPDATED = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")


def oro_geometry(ee):
    """Oro Province geometry from the committed GeoJSON (falls back to bbox)."""
    try:
        gj = json.load(open(os.path.join(DATA, "oro_province.geojson")))
        feats = gj.get("features") or [gj]
        geoms = [ee.Geometry(f["geometry"]) for f in feats if f.get("geometry")]
        return ee.FeatureCollection([ee.Feature(g) for g in geoms]).geometry() if geoms \
            else ee.Geometry.Rectangle([146.8, -10.0, 149.7, -7.9])
    except Exception:
        return ee.Geometry.Rectangle([146.8, -10.0, 149.7, -7.9])


def _rnd(x):
    if isinstance(x, (int, float)):
        return round(x, 5)
    if isinstance(x, list):
        return [_rnd(v) for v in x]
    return x


def export_mask(ee, aoi, mask01, min_ha, out_path, note):
    """Vectorise a single-class mask into simplified, coord-rounded polygons and
    write a FeatureCollection. Returns the feature count."""
    min_px = max(1, int(round(min_ha / PIXEL_HA)))
    patch = mask01.connectedPixelCount(min_px + 50, True)
    big = mask01.updateMask(patch.gte(min_px)).gt(0).rename("c")
    vectors = big.reduceToVectors(geometry=aoi, scale=30, geometryType="polygon",
              eightConnected=True, maxPixels=1e10, bestEffort=True)
    vectors = vectors.limit(4800).map(lambda f: f.simplify(30))
    gj = vectors.getInfo()
    feats = []
    for f in gj.get("features", []):
        geom = f.get("geometry") or {}
        if geom.get("coordinates") is not None:
            geom = {"type": geom.get("type"), "coordinates": _rnd(geom["coordinates"])}
        feats.append({"type": "Feature", "geometry": geom, "properties": {}})
    out = {"type": "FeatureCollection", "updated": UPDATED, "min_ha": min_ha,
           "note": note, "status": "ok", "features": feats}
    os.makedirs(DATA, exist_ok=True)
    json.dump(out, open(out_path, "w"))
    print(os.path.basename(out_path), "features:", len(feats))
    return len(feats)


def _write_empty(out_path, status, extra=None):
    """Keep an existing good file on failure; otherwise write an empty FC."""
    os.makedirs(DATA, exist_ok=True)
    if not os.path.exists(out_path):
        d = {"type": "FeatureCollection", "updated": UPDATED, "status": status, "features": []}
        if extra:
            d.update(extra)
        json.dump(d, open(out_path, "w"))
    print("STATUS", os.path.basename(out_path) + ":", status)


def main():
    try:
        import ee
        key = os.environ["EE_SERVICE_ACCOUNT_KEY"]
        info = json.loads(key)
        ee.Initialize(ee.ServiceAccountCredentials(info["client_email"], key_data=key), project=PROJECT)
    except Exception as e:
        _write_empty(CLEAR_OUT, "init error: " + str(e)[:200], {"cutoff": "2020-12-31"})
        _write_empty(NONFOREST_OUT, "init error: " + str(e)[:200])
        return

    aoi = oro_geometry(ee)

    # 1) post-2020 clearings (Hansen lossyear >= 2021)
    try:
        ly = ee.Image("UMD/hansen/global_forest_change_2025_v1_13").select("lossyear")
        post = ly.gte(CUTOFF_LOSSYEAR).selfMask()
        n = export_mask(ee, aoi, post, CLEAR_MIN_HA, CLEAR_OUT,
                        "Hansen post-2020 clearings >= %.1f ha, Oro." % CLEAR_MIN_HA)
        # add the cutoff field (re-write with it)
        d = json.load(open(CLEAR_OUT)); d["cutoff"] = "2020-12-31"; json.dump(d, open(CLEAR_OUT, "w"))
    except Exception as e:
        _write_empty(CLEAR_OUT, "export error: " + str(e)[:200], {"cutoff": "2020-12-31"})

    # 2) non-forest in 2020 (JRC GFC2020 v2, Map == 0 = non-forest), within Oro land
    try:
        gfc = ee.ImageCollection("JRC/GFC2020/V2").mosaic().select(0)
        nonforest = gfc.eq(0).selfMask()
        export_mask(ee, aoi, nonforest, NONFOREST_MIN_HA, NONFOREST_OUT,
                    "JRC GFC2020 v2 non-forest-2020 patches >= %.1f ha, Oro land." % NONFOREST_MIN_HA)
    except Exception as e:
        _write_empty(NONFOREST_OUT, "export error: " + str(e)[:200])


if __name__ == "__main__":
    main()
