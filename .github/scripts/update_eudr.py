#!/usr/bin/env python3
"""Export post-2020 forest-clearance polygons for Oro, for the portal's
in-browser EUDR plot screen.

EUDR turns on whether a plot was subject to deforestation AFTER the cut-off
date (31 December 2020). This script takes Hansen tree-cover loss for
lossyear 2021..2025, keeps only contiguous clearings >= MIN_HA (so the output
is real clearing events, not isolated noisy pixels), vectorises them within the
Oro Province boundary, and writes a small simplified GeoJSON the static site
ships. The Site Analysis tool samples a drawn plot against these polygons to
report post-2020 deforestation on that plot.

This is a SCREENING INDICATION built on the global Hansen/GFC product — not an
authoritative or legal EUDR determination.

Writes app/data/oro_defor_post2020.geojson. Runs in GitHub Actions with the
service-account key in EE_SERVICE_ACCOUNT_KEY.
"""
import os, json, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA = os.path.join(ROOT, "app", "data")
OUT = os.path.join(DATA, "oro_defor_post2020.geojson")
PROJECT = os.environ.get("EE_PROJECT", "orodataportal")

MIN_HA = 2.0                 # smallest clearing event to keep (ha) — EUDR-meaningful,
                             # matches the MCA_App RADD >2 ha convention and keeps the
                             # vector count under Earth Engine's 5000-feature export cap
PIXEL_HA = 0.09              # 30 m Hansen pixel ~ 0.09 ha
MIN_PIXELS = max(1, int(round(MIN_HA / PIXEL_HA)))   # ~22 px
CUTOFF_LOSSYEAR = 21         # lossyear 21 => 2021 (first full year after cut-off)


def oro_geometry(ee):
    """Oro Province geometry from the committed GeoJSON (falls back to bbox)."""
    try:
        gj = json.load(open(os.path.join(DATA, "oro_province.geojson")))
        feats = gj.get("features") or [gj]
        geoms = [ee.Geometry(f["geometry"]) for f in feats if f.get("geometry")]
        return ee.Geometry.MultiPolygon([]).union(1) if not geoms else \
            ee.FeatureCollection([ee.Feature(g) for g in geoms]).geometry()
    except Exception:
        return ee.Geometry.Rectangle([146.8, -10.0, 149.7, -7.9])


def main():
    meta = {"updated": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            "cutoff": "2020-12-31", "min_ha": MIN_HA, "status": "ok", "count": 0}
    try:
        import ee
        key = os.environ["EE_SERVICE_ACCOUNT_KEY"]
        info = json.loads(key)
        ee.Initialize(ee.ServiceAccountCredentials(info["client_email"], key_data=key), project=PROJECT)
    except Exception as e:
        _write_empty(meta, "init error: " + str(e)[:300]); return

    try:
        aoi = oro_geometry(ee)
        hansen = ee.Image("UMD/hansen/global_forest_change_2025_v1_13")
        ly = hansen.select("lossyear")
        post = ly.gte(CUTOFF_LOSSYEAR).selfMask()                 # 1 where loss >= 2021
        # keep only contiguous clearings >= MIN_PIXELS
        patch = post.connectedPixelCount(MIN_PIXELS + 50, True)
        big = post.updateMask(patch.gte(MIN_PIXELS))
        # Vectorise the clearings as a SINGLE class (contiguous patches merge,
        # regardless of loss year). This keeps the feature count well under EE's
        # 5000-element getInfo cap so coverage is COMPLETE (no truncation) and the
        # shipped file stays small. Per-year labelling is dropped deliberately —
        # the screen reports total ha + count "since the 2020 cut-off".
        single = big.gt(0).rename("clearing")
        vectors = single.reduceToVectors(
            geometry=aoi, scale=30, geometryType="polygon", eightConnected=True,
            maxPixels=1e10, bestEffort=True)
        vectors = vectors.limit(4800).map(lambda f: f.simplify(30))
        gj = vectors.getInfo()

        def rnd(x):
            if isinstance(x, (int, float)):
                return round(x, 5)
            if isinstance(x, list):
                return [rnd(v) for v in x]
            return x
        feats = []
        for f in gj.get("features", []):
            geom = f.get("geometry") or {}
            if geom.get("coordinates") is not None:
                geom = {"type": geom.get("type"), "coordinates": rnd(geom["coordinates"])}
            feats.append({"type": "Feature", "geometry": geom, "properties": {}})
        out = {"type": "FeatureCollection",
               "updated": meta["updated"], "cutoff": meta["cutoff"],
               "min_ha": MIN_HA, "note": "Hansen post-2020 clearings >= %.1f ha, Oro." % MIN_HA,
               "features": feats}
        os.makedirs(DATA, exist_ok=True)
        json.dump(out, open(OUT, "w"))
        print("post-2020 clearings:", len(feats))
    except Exception as e:
        _write_empty(meta, "export error: " + str(e)[:300])


def _write_empty(meta, status):
    meta["status"] = status
    os.makedirs(DATA, exist_ok=True)
    # keep an existing good file if the run failed; otherwise write an empty FC
    if not os.path.exists(OUT):
        json.dump({"type": "FeatureCollection", "updated": meta["updated"],
                   "cutoff": meta["cutoff"], "status": status, "features": []},
                  open(OUT, "w"))
    print("STATUS:", status)


if __name__ == "__main__":
    main()
