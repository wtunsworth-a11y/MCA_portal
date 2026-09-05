# Portal logos

`credits.js` (funder/partner strip + credits page) references these files. Until a
file exists, that partner shows a text chip instead — so add the file and it upgrades
automatically, no code change needed.

| File | Organisation | Notes |
|---|---|---|
| `eu-emblem.svg` | European Union | ✅ present — generated from the official EU emblem specification |
| `cifor-icraf.svg` | CIFOR-ICRAF | **needed** — SVG preferred; PNG on transparent/white also fine (rename to `.png` and update the path in `js/credits.js`) |
| `opg.png` | Oro Provincial Government | **needed** |
| `dnpm.png` | Dept. of National Planning & Monitoring (PNG) | **needed** |

Guidance:
- Prefer **SVG**; otherwise PNG with a transparent (or white) background.
- Aim for a logo that reads at ~34 px tall (footer) / ~54 px (credits page).
- Keep the original aspect ratio; the CSS sizes by height and lets width follow.
- If a file uses a different name/extension than above, update its `logo:` path in
  `js/credits.js` (single source of truth).

Also set the EU programme/grant text in `js/credits.js` → `FUNDING.programme`.
