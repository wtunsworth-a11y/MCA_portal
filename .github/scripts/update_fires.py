#!/usr/bin/env python3
"""Fetch NASA FIRMS active-fire detections for Oro Province and write a GeoJSON
the static site can load same-origin (avoids the browser CORS block on the FIRMS
API). Runs in GitHub Actions on a schedule. Reads the FIRMS key from config.js so
no separate secret is required."""
import json, re, os, datetime, urllib.request, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CONFIG = os.path.join(ROOT, "app", "js", "config.js")
OUT = os.path.join(ROOT, "app", "data", "fires.geojson")

AREA = "146.6,-10.1,149.8,-7.8"   # Oro Province bbox (padded): west,south,east,north
DAYS = "5"                         # FIRMS area API caps the day range at 5
SOURCES = ["VIIRS_SNPP_NRT", "VIIRS_NOAA20_NRT", "MODIS_NRT"]

def firms_key():
    try:
        m = re.search(r'firms:\s*"([^"]+)"', open(CONFIG, encoding="utf-8").read())
        return m.group(1) if m else ""
    except Exception:
        return ""

def fetch(src, key):
    url = "https://firms.modaps.eosdis.nasa.gov/api/area/csv/%s/%s/%s/%s" % (key, src, AREA, DAYS)
    try:
        with urllib.request.urlopen(url, timeout=90) as r:
            return r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        body = ""
        try:
            body = e.read().decode("utf-8", "replace")
        except Exception:
            pass
        # surface FIRMS's own explanation (e.g. "Invalid MAP_KEY", "Invalid day range")
        raise RuntimeError("HTTP %s — %s" % (e.code, (body or e.reason).strip().replace("\n", " ")[:240]))

def main():
    key = firms_key()
    feats = []
    status = {}   # per-source diagnostics, written into the file so we can see what happened
    if not key:
        status["_key"] = "no FIRMS key found in config.js"
    for src in SOURCES if key else []:
        try:
            csv = fetch(src, key)
        except Exception as e:
            status[src] = "error: " + str(e)[:240]; print("fetch failed for", src, ":", e); continue
        lines = csv.strip().splitlines()
        head = lines[0].split(",") if lines else []
        if "latitude" not in head or "longitude" not in head:
            # not a data CSV — record the first line so we can see the message (e.g. bad key / quota)
            status[src] = "no-csv: " + (lines[0][:120] if lines else "empty")
            continue
        la, lo = head.index("latitude"), head.index("longitude")
        gi = lambda n: head.index(n) if n in head else -1
        dt, tm, fr, cf = gi("acq_date"), gi("acq_time"), gi("frp"), gi("confidence")
        n = 0
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
            n += 1
        status[src] = "%d points" % n
    print("source status:", status)
    fc = {"type": "FeatureCollection",
          "updated": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
          "area": AREA, "days": DAYS, "sources": status, "features": feats}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(fc, open(OUT, "w", encoding="utf-8"))
    print("wrote", len(feats), "fire points to", OUT)

if __name__ == "__main__":
    main()
