#!/usr/bin/env python3
"""Fetch NASA FIRMS active-fire detections for Oro Province and write a GeoJSON
the static site can load same-origin (avoids the browser CORS block on the FIRMS
API). Runs in GitHub Actions on a schedule. Reads the FIRMS key from config.js so
no separate secret is required."""
import json, re, os, datetime, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CONFIG = os.path.join(ROOT, "app", "js", "config.js")
OUT = os.path.join(ROOT, "app", "data", "fires.geojson")

AREA = "146.8,-9.9,149.6,-8.0"   # Oro Province bbox: west,south,east,north
DAYS = "7"
SOURCES = ["VIIRS_SNPP_NRT", "VIIRS_NOAA20_NRT", "MODIS_NRT"]

def firms_key():
    try:
        m = re.search(r'firms:\s*"([^"]+)"', open(CONFIG, encoding="utf-8").read())
        return m.group(1) if m else ""
    except Exception:
        return ""

def fetch(src, key):
    url = "https://firms.modaps.eosdis.nasa.gov/api/area/csv/%s/%s/%s/%s" % (key, src, AREA, DAYS)
    with urllib.request.urlopen(url, timeout=90) as r:
        return r.read().decode("utf-8", "replace")

def main():
    key = firms_key()
    feats = []
    if key:
        for src in SOURCES:
            try:
                csv = fetch(src, key)
            except Exception as e:
                print("fetch failed for", src, ":", e); continue
            lines = csv.strip().splitlines()
            if len(lines) < 2:
                continue
            head = lines[0].split(",")
            gi = lambda n: head.index(n) if n in head else -1
            la, lo, dt, tm, fr, cf = gi("latitude"), gi("longitude"), gi("acq_date"), gi("acq_time"), gi("frp"), gi("confidence")
            if la < 0 or lo < 0:
                continue
            for ln in lines[1:]:
                c = ln.split(",")
                try:
                    lat, lng = float(c[la]), float(c[lo])
                except Exception:
                    continue
                feats.append({"type": "Feature", "geometry": {"type": "Point", "coordinates": [lng, lat]},
                    "properties": {"source": src.replace("_NRT", ""),
                                   "date": c[dt] if dt >= 0 else "", "time": c[tm] if tm >= 0 else "",
                                   "frp": c[fr] if fr >= 0 else "", "confidence": c[cf] if cf >= 0 else ""}})
    else:
        print("no FIRMS key found in config.js; writing empty collection")
    fc = {"type": "FeatureCollection",
          "updated": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
          "area": AREA, "days": DAYS, "features": feats}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(fc, open(OUT, "w", encoding="utf-8"))
    print("wrote", len(feats), "fire points to", OUT)

if __name__ == "__main__":
    main()
