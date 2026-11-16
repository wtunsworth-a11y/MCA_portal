#!/usr/bin/env python3
"""Oro Data Portal — on-demand Site Analysis backend (Earth Engine).

A tiny Cloud Run service. POST /analyze with a GeoJSON geometry and it returns
per-theme zonal statistics + a few thumbnail URLs, computed live in Earth Engine
over the drawn area. This is the authoritative, any-polygon version of the
client-side themes already in the portal.

Auth: runs AS the Earth Engine service account (Cloud Run runtime identity), so
ee.Initialize() uses Application Default Credentials — no key file in the image.

Guardrails: AOI size cap (MAX_AOI_HA) + a best-effort per-instance rate limit.
Pair with Cloud Run --max-instances and a Cloud Billing budget alert.
"""
import os, time, datetime
import ee
from flask import Flask, request, jsonify, make_response

PROJECT = os.environ.get("EE_PROJECT", "orodataportal")
MAX_AOI_HA = float(os.environ.get("MAX_AOI_HA", "50000"))      # reject bigger AOIs
ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "*")         # e.g. https://wtunsworth-a11y.github.io
RATE_LIMIT = int(os.environ.get("RATE_LIMIT_PER_MIN", "30"))   # per instance, per IP

app = Flask(__name__)
_ee_ready = False


def ee_init():
    global _ee_ready
    if not _ee_ready:
        ee.Initialize(project=PROJECT)     # ADC = Cloud Run service account
        _ee_ready = True


def _cors(resp):
    resp.headers["Access-Control-Allow-Origin"] = ALLOWED_ORIGIN
    resp.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
    resp.headers["Vary"] = "Origin"
    return resp


_hits = {}
def _rate_limited(ip):
    now = time.time()
    q = [t for t in _hits.get(ip, []) if now - t < 60]
    q.append(now)
    _hits[ip] = q
    return len(q) > RATE_LIMIT


# ---- Earth Engine report -------------------------------------------------
def _mosaic(asset):
    try:
        return ee.ImageCollection(asset).mosaic()
    except Exception:
        return ee.Image(asset)


def compute_report(geom):
    """One combined reduceRegion (one round-trip) across all themes + thumbnails."""
    ee_init()
    hansen = ee.Image("UMD/hansen/global_forest_change_2025_v1_13")
    area_img = ee.Image.pixelArea()

    # --- combined zonal statistics (unique band names avoid key collisions) ---
    srtm = ee.Image("USGS/SRTMGL1_003").rename("elev")
    slope = ee.Terrain.slope(srtm.rename("elevation")).rename("slope")
    d = ee.Dictionary({})
    d = d.combine(srtm.addBands(slope).reduceRegion(
        ee.Reducer.minMax().combine(ee.Reducer.mean(), sharedInputs=True), geom, 30, maxPixels=1e10))
    # land cover (ESA WorldCover) class histogram
    d = d.combine(ee.ImageCollection("ESA/WorldCover/v200").first().select("Map").rename("lc")
                  .reduceRegion(ee.Reducer.frequencyHistogram(), geom, 10, maxPixels=1e10))
    # forest cover & loss
    d = d.combine(hansen.select("treecover2000").rename("tc")
                  .reduceRegion(ee.Reducer.mean(), geom, 30, maxPixels=1e10))
    d = d.combine(hansen.select("lossyear").gte(21).selfMask().multiply(area_img).rename("loss_m2")
                  .reduceRegion(ee.Reducer.sum(), geom, 30, maxPixels=1e10))
    gfc = _mosaic("JRC/GFC2020/V4").select(0).eq(1).selfMask()   # V4 (V2 deprecated)
    d = d.combine(gfc.multiply(area_img).rename("forest_m2")
                  .reduceRegion(ee.Reducer.sum(), geom, 30, maxPixels=1e10))
    # canopy & carbon
    d = d.combine(ee.Image("users/nlang/ETH_GlobalCanopyHeight_2020_10m_v1").select(0).rename("ch")
                  .reduceRegion(ee.Reducer.mean().combine(ee.Reducer.max(), sharedInputs=True), geom, 10, maxPixels=1e10))
    d = d.combine(ee.ImageCollection("NASA/ORNL/biomass_carbon_density/v1").first().select("agb").rename("agb")
                  .reduceRegion(ee.Reducer.mean(), geom, 300, maxPixels=1e10))
    # climate (WorldClim: bio01 = °C×10, bio12 = mm/yr)
    d = d.combine(ee.Image("WORLDCLIM/V1/BIO").select(["bio01", "bio12"]).rename(["t", "p"])
                  .reduceRegion(ee.Reducer.mean(), geom, 1000, maxPixels=1e10))
    # fire (FIRMS detections, last year)
    try:
        today = datetime.date.today().isoformat()
        firms = (ee.ImageCollection("FIRMS").filterDate(ee.Date(today).advance(-1, "year"), ee.Date(today))
                 .select("T21").max().gt(0).selfMask().rename("fire"))
        d = d.combine(firms.reduceRegion(ee.Reducer.count(), geom, 1000, maxPixels=1e10))
    except Exception:
        pass

    r = d.getInfo()
    ha = geom.area(1).divide(1e4).getInfo()

    def num(k):
        v = r.get(k)
        return round(v, 2) if isinstance(v, (int, float)) else None

    # land-cover percentages
    WC = {"10": "Tree cover", "20": "Shrubland", "30": "Grassland", "40": "Cropland",
          "50": "Built-up", "60": "Bare / sparse", "70": "Snow / ice", "80": "Water",
          "90": "Wetland", "95": "Mangroves", "100": "Moss / lichen"}
    hist = r.get("lc") or {}
    tot = sum(hist.values()) or 1
    landcover = sorted(({"class": WC.get(k, k), "pct": round(v / tot * 100, 1)}
                        for k, v in hist.items()), key=lambda x: -x["pct"])

    loss_ha = (r.get("loss_m2") or 0) / 1e4
    forest_ha = (r.get("forest_m2") or 0) / 1e4
    themes = {
        "topography": {"elev_min_m": num("elev_min"), "elev_max_m": num("elev_max"),
                       "elev_mean_m": num("elev_mean"), "slope_mean_deg": num("slope_mean")},
        "landcover": landcover,
        "forest": {"tree_cover_2000_pct": num("tc"),
                   "forest_2020_ha": round(forest_ha, 1), "forest_2020_pct": round(min(100, forest_ha / ha * 100), 1) if ha else None,
                   "cleared_since_2020_ha": round(loss_ha, 2), "cleared_since_2020_pct": round(min(100, loss_ha / ha * 100), 2) if ha else None},
        "canopy": {"mean_height_m": num("ch_mean"), "max_height_m": num("ch_max")},
        "carbon": {"aboveground_biomass_Mg_ha": num("agb"),
                   "aboveground_carbon_Mg": round((r.get("agb") or 0) * 0.47 * ha, 0) if r.get("agb") else None},
        "climate": {"annual_mean_temp_C": round(r["t"] / 10.0, 1) if isinstance(r.get("t"), (int, float)) else None,
                    "annual_precip_mm": num("p")},
        "fire": {"detections_last_year": int(r.get("fire") or 0)},
    }

    # thumbnails (small PNGs clipped to the AOI)
    region = geom.bounds()
    thumbs = {}
    try:
        thumbs["landcover"] = (ee.ImageCollection("ESA/WorldCover/v200").first().select("Map")
                               .clip(geom).getThumbURL({"region": region, "dimensions": 512, "format": "png"}))
        thumbs["canopy"] = (ee.Image("users/nlang/ETH_GlobalCanopyHeight_2020_10m_v1").select(0)
                            .visualize(min=0, max=40, palette=["ffffff", "1b7837"]).clip(geom)
                            .getThumbURL({"region": region, "dimensions": 512, "format": "png"}))
        thumbs["loss"] = (hansen.select("lossyear").gte(21).selfMask()
                          .visualize(palette=["e5484d"]).clip(geom)
                          .getThumbURL({"region": region, "dimensions": 512, "format": "png"}))
    except Exception:
        pass

    return {"area_ha": round(ha, 2), "themes": themes, "thumbnails": thumbs,
            "generated": datetime.datetime.utcnow().isoformat() + "Z"}


# ---- routes --------------------------------------------------------------
@app.route("/", methods=["GET"])
def health():
    return _cors(make_response(jsonify({"ok": True, "service": "oro-site-analysis"})))


@app.route("/analyze", methods=["POST", "OPTIONS"])
def analyze():
    if request.method == "OPTIONS":
        return _cors(make_response("", 204))
    ip = request.headers.get("X-Forwarded-For", request.remote_addr or "?").split(",")[0].strip()
    if _rate_limited(ip):
        return _cors(make_response(jsonify({"error": "rate limit — try again shortly"}), 429))
    try:
        body = request.get_json(force=True, silent=True) or {}
        gj = body.get("geometry")
        if not gj or gj.get("type") not in ("Polygon", "MultiPolygon"):
            return _cors(make_response(jsonify({"error": "POST {geometry: GeoJSON Polygon/MultiPolygon}"}), 400))
        ee_init()
        geom = ee.Geometry(gj, geodesic=False)
        ha = geom.area(1).divide(1e4).getInfo()
        if ha > MAX_AOI_HA:
            return _cors(make_response(jsonify({"error": "AOI too large (%d ha > %d ha cap)" % (ha, MAX_AOI_HA)}), 413))
        return _cors(make_response(jsonify(compute_report(geom))))
    except Exception as e:
        return _cors(make_response(jsonify({"error": str(e)[:300]}), 500))


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
