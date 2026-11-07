#!/usr/bin/env python3
"""Fetch the Southern Oscillation Index (SOI) and write app/data/soi.json for
the homepage climate / fire-risk card.

Source: NOAA CPC *standardized* SOI table
  https://www.cpc.ncep.noaa.gov/data/indices/soi
This is the standard Tahiti-Darwin SOI, published openly in a machine-readable
table. We use NOAA CPC rather than the Australian BoM because the BoM website
explicitly blocks automated access to its SOI pages; the index is the same
climate signal. Attribution is set accordingly in soi.json and on the card.

A sustained NEGATIVE SOI indicates El Nino (drier, higher fire risk in PNG);
a sustained POSITIVE SOI indicates La Nina (wetter).
"""
import os, json, datetime, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA = os.path.join(ROOT, "app", "data")
OUT = os.path.join(DATA, "soi.json")
URL = "https://www.cpc.ncep.noaa.gov/data/indices/soi"
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "OroDataPortal/1.0 (conservation portal)"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read().decode("utf-8", "replace")


def parse_standardized(txt):
    """Return [(year, [12 monthly floats or None]), ...] from the STANDARDIZED block."""
    lines = txt.splitlines()
    idx = None
    for i, l in enumerate(lines):
        if "STANDARDIZED" in l.upper():
            idx = i
            break
    rows = []
    if idx is None:
        return rows
    for l in lines[idx + 1:]:
        parts = l.split()
        if len(parts) >= 2 and parts[0].isdigit() and len(parts[0]) == 4:
            vals = []
            for v in parts[1:13]:
                try:
                    f = float(v)
                except ValueError:
                    f = None
                if f is not None and f <= -999:
                    f = None
                vals.append(f)
            rows.append((int(parts[0]), vals))
    return rows


def main():
    meta = {"updated": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            "source": "NOAA CPC standardized SOI", "url": URL, "status": "ok"}
    try:
        rows = parse_standardized(fetch(URL))
        latest, series = None, []
        for year, vals in rows:
            for m, v in enumerate(vals):
                if v is not None:
                    latest = (year, m, v)
                    series.append({"t": "%d-%02d" % (year, m + 1), "v": round(v, 2)})
        if latest:
            y, m, v = latest
            meta["value"] = round(v, 2)
            meta["month"] = "%s %d" % (MONTHS[m], y)
            meta["phase"] = ("La Nina-like — wetter" if v >= 0.8 else
                             ("El Nino-like — drier, higher fire risk" if v <= -0.8 else "Neutral"))
            meta["series"] = series[-13:]
        else:
            meta["status"] = "no data parsed"
    except Exception as e:
        meta["status"] = "error: " + str(e)[:200]

    os.makedirs(DATA, exist_ok=True)
    # On failure keep any existing good file (don't overwrite real data with an error).
    if meta["status"] != "ok" and os.path.exists(OUT):
        try:
            prev = json.load(open(OUT))
            prev["status"] = meta["status"]
            prev["checked"] = meta["updated"]
            json.dump(prev, open(OUT, "w"), indent=0)
            print("SOI fetch failed (%s); kept previous value." % meta["status"])
            return
        except Exception:
            pass
    json.dump(meta, open(OUT, "w"), indent=0)
    print("SOI:", meta.get("value"), meta.get("month"), "|", meta["status"])


if __name__ == "__main__":
    main()
