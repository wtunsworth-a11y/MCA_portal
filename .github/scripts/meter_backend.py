#!/usr/bin/env python3
"""METERED SPIKE for the proposed GEE site-analysis backend.

Goal: measure the REAL Earth Engine cost of one multi-theme site report, so we
can budget the backend before building it. For each of several representative
AOIs (garden-sized up to concession-sized) it computes the same per-theme zonal
statistics the backend would return, then:

  * times an INTERACTIVE pass (getInfo) — the latency a user would feel, and
  * runs a BATCH export and reads `batch_eecu_usage_seconds` from the task —
    the actual Earth Engine compute consumed (EECU-seconds).

It extrapolates to 100 / 500 / 1,000 reports per month and compares against the
free noncommercial quotas (Community 150, Contributor 1,000 EECU-hours/mo) and
the commercial on-demand rate ($0.40 / EECU-hour).

Runs in GitHub Actions with the service-account key in EE_SERVICE_ACCOUNT_KEY.
Prints a JSON report between ===METER_JSON_START=== / ===METER_JSON_END===.
"""
import os, json, math, time, datetime

PROJECT = os.environ.get("EE_PROJECT", "orodataportal")
COMMUNITY_QUOTA_H = 150      # free EECU-hours/month, noncommercial Community tier
CONTRIBUTOR_QUOTA_H = 1000   # free EECU-hours/month, noncommercial Contributor tier
COMMERCIAL_RATE = 0.40       # USD per EECU-hour (on-demand, lowest tier)

# Representative plots across Oro / Managalas: (label, lat, lon, hectares).
# Mix of sizes and settings (deep forest, forest edge, near-coast, cleared).
AOIS = [
    ("garden-0.5ha",     -9.28, 148.48, 0.5),
    ("smallholding-2ha", -9.30, 148.50, 2),
    ("block-10ha",       -9.26, 148.46, 10),
    ("block-50ha",       -9.32, 148.52, 50),
    ("estate-200ha",     -9.24, 148.55, 200),
    ("estate-500ha",     -9.20, 148.60, 500),
    ("concession-1000ha",-9.35, 148.40, 1000),
    ("concession-2500ha",-9.15, 148.70, 2500),
    ("concession-5000ha",-9.40, 148.35, 5000),
    ("edge-20ha",        -9.10, 148.30, 20),
    ("coast-100ha",      -9.05, 148.80, 100),
    ("upland-300ha",     -9.45, 148.25, 300),
    ("mixed-5ha",        -9.29, 148.49, 5),
    ("mixed-800ha",      -9.22, 148.58, 800),
]


def rect(lat, lon, ha, ee):
    s = math.sqrt(ha * 10000.0)                  # square side, metres
    dlat = s / 111320.0
    dlon = s / (111320.0 * math.cos(math.radians(lat)))
    return ee.Geometry.Rectangle([lon - dlon / 2, lat - dlat / 2,
                                  lon + dlon / 2, lat + dlat / 2])


def mosaic(ee, asset):
    try:
        return ee.ImageCollection(asset).mosaic()
    except Exception:
        return ee.Image(asset)


def report_dict(geom, ee):
    """All per-theme zonal stats for one AOI, combined into one ee.Dictionary
    (mirrors the compute a single backend request would run)."""
    hansen = ee.Image("UMD/hansen/global_forest_change_2025_v1_13")
    out = ee.Dictionary({})

    # Topography — SRTM elevation + slope
    srtm = ee.Image("USGS/SRTMGL1_003")
    topo = srtm.addBands(ee.Terrain.slope(srtm)).reduceRegion(
        ee.Reducer.minMax().combine(ee.Reducer.mean(), sharedInputs=True),
        geom, 30, maxPixels=1e10)
    out = out.combine(topo)

    # Land cover — ESA WorldCover histogram
    wc = ee.ImageCollection("ESA/WorldCover/v200").first().select("Map")
    out = out.combine(wc.reduceRegion(ee.Reducer.frequencyHistogram(), geom, 10, maxPixels=1e10))

    # Forest cover & loss — Hansen tree cover + post-2020 loss; GFC2020 forest
    tc = hansen.select("treecover2000")
    out = out.combine(tc.reduceRegion(ee.Reducer.mean(), geom, 30, maxPixels=1e10))
    loss = hansen.select("lossyear").gte(21).selfMask()
    out = out.combine(loss.multiply(ee.Image.pixelArea()).reduceRegion(
        ee.Reducer.sum(), geom, 30, maxPixels=1e10))
    gfc = mosaic(ee, "JRC/GFC2020/V2").select(0).eq(1).selfMask()
    out = out.combine(gfc.multiply(ee.Image.pixelArea()).reduceRegion(
        ee.Reducer.sum(), geom, 30, maxPixels=1e10))

    # Canopy & carbon — ETH canopy height; ORNL aboveground biomass carbon
    ch = ee.Image("users/nlang/ETH_GlobalCanopyHeight_2020_10m_v1").select(0)
    out = out.combine(ch.reduceRegion(
        ee.Reducer.mean().combine(ee.Reducer.max(), sharedInputs=True), geom, 10, maxPixels=1e10))
    agb = ee.ImageCollection("NASA/ORNL/biomass_carbon_density/v1").first().select("agb")
    out = out.combine(agb.reduceRegion(ee.Reducer.mean(), geom, 300, maxPixels=1e10))

    # Climate — WorldClim annual temp + precip
    bio = ee.Image("WORLDCLIM/V1/BIO").select(["bio01", "bio12"])
    out = out.combine(bio.reduceRegion(ee.Reducer.mean(), geom, 1000, maxPixels=1e10))

    # Hydrology — HydroSHEDS flow accumulation (proxy for catchment position)
    try:
        acc = ee.Image("WWF/HydroSHEDS/15ACC")
        out = out.combine(acc.reduceRegion(ee.Reducer.max(), geom, 500, maxPixels=1e10))
    except Exception:
        pass

    # Fire — FIRMS detections in the last year
    try:
        firms = (ee.ImageCollection("FIRMS")
                 .filterDate(ee.Date(datetime.date.today().isoformat()).advance(-1, "year"),
                             ee.Date(datetime.date.today().isoformat()))
                 .select("T21").max().gt(0).selfMask())
        out = out.combine(firms.reduceRegion(ee.Reducer.count(), geom, 1000, maxPixels=1e10))
    except Exception:
        pass

    return out


def main():
    import ee
    key = os.environ["EE_SERVICE_ACCOUNT_KEY"]
    info = json.loads(key)
    ee.Initialize(ee.ServiceAccountCredentials(info["client_email"], key_data=key), project=PROJECT)

    results, tasks = [], []
    # Kick off interactive timing + start batch tasks
    for label, lat, lon, ha in AOIS:
        rec = {"label": label, "ha": ha}
        try:
            geom = rect(lat, lon, ha, ee)
            feat = ee.Feature(geom, report_dict(geom, ee))
            t0 = time.time()
            feat.getInfo()                                  # interactive pass
            rec["interactive_sec"] = round(time.time() - t0, 2)
            task = ee.batch.Export.table.toAsset(
                collection=ee.FeatureCollection([ee.Feature(None, report_dict(geom, ee))]),
                description="meter_%s" % label.replace(".", "_").replace("-", "_"),
                assetId="projects/%s/assets/_meter_%s" % (PROJECT, label.replace(".", "_").replace("-", "_")))
            task.start()
            rec["_task"] = task
        except Exception as e:
            rec["error"] = str(e)[:300]
        results.append(rec)
        tasks.append(rec)

    # Poll batch tasks for completion + read EECU-seconds
    deadline = time.time() + 1800   # 30 min
    pending = [r for r in tasks if r.get("_task")]
    while pending and time.time() < deadline:
        time.sleep(20)
        still = []
        for r in pending:
            st = r["_task"].status()
            state = st.get("state")
            if state in ("COMPLETED", "FAILED", "CANCELLED"):
                r["batch_state"] = state
                r["batch_eecu_seconds"] = st.get("batch_eecu_usage_seconds")
                if state != "COMPLETED":
                    r["batch_error"] = str(st.get("error_message"))[:200]
                # best-effort cleanup of the temp asset
                try:
                    ee.data.deleteAsset("projects/%s/assets/_meter_%s"
                        % (PROJECT, r["label"].replace(".", "_").replace("-", "_")))
                except Exception:
                    pass
            else:
                still.append(r)
        pending = still

    for r in results:
        r.pop("_task", None)

    # Summarise
    eecu_secs = [r["batch_eecu_seconds"] for r in results
                 if isinstance(r.get("batch_eecu_seconds"), (int, float))]
    inter = [r["interactive_sec"] for r in results if isinstance(r.get("interactive_sec"), (int, float))]
    summary = {"n_aois": len(AOIS), "n_measured": len(eecu_secs)}
    if eecu_secs:
        mean_sec = sum(eecu_secs) / len(eecu_secs)
        mean_h = mean_sec / 3600.0
        summary.update({
            "mean_batch_eecu_seconds": round(mean_sec, 3),
            "max_batch_eecu_seconds": round(max(eecu_secs), 3),
            "eecu_hours_per_report_mean": round(mean_h, 5),
            "mean_interactive_sec": round(sum(inter) / len(inter), 2) if inter else None,
            "max_interactive_sec": round(max(inter), 2) if inter else None,
            "monthly_eecu_hours": {str(n): round(mean_h * n, 2) for n in (100, 500, 1000)},
            "free_quota_eecu_hours": {"community": COMMUNITY_QUOTA_H, "contributor": CONTRIBUTOR_QUOTA_H},
            "within_community_free_up_to_reports": int(COMMUNITY_QUOTA_H / mean_h) if mean_h else None,
            "within_contributor_free_up_to_reports": int(CONTRIBUTOR_QUOTA_H / mean_h) if mean_h else None,
            "commercial_rate_usd_per_eecu_hour": COMMERCIAL_RATE,
            "commercial_cost_usd": {str(n): round(mean_h * n * COMMERCIAL_RATE, 2) for n in (100, 500, 1000)},
        })
    report = {"generated": datetime.datetime.utcnow().isoformat() + "Z",
              "project": PROJECT, "aois": results, "summary": summary}
    print("===METER_JSON_START===")
    print(json.dumps(report, indent=2))
    print("===METER_JSON_END===")


if __name__ == "__main__":
    main()
