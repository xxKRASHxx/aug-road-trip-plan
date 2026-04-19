# aug-road-trip-plan

5-day Alps family trip: **Klagenfurt → Hohe Tauern → Kaprun → Innsbruck/Nordkette → Stuibenfall Klettersteig → Dolomites (Cortina) → Klagenfurt**.

Two deliverables live in this repo:

1. **`trip/`** — Markdown plan (one file per day + overview + checklists).
2. **`web/`** — Angular + Leaflet app that renders the route on an interactive map, with an overview view and a day-by-day view.

---

## `trip/` — the Markdown plan

| File | Purpose |
| --- | --- |
| `trip/overview.md` | High-level summary, OSRM driving times, cost budget, overnight placeholders. |
| `trip/day-01.md` … `trip/day-05.md` | Per-day timelines, activities, sightseeing, practical notes, useful links. Each has a YAML frontmatter with waypoint coordinates used to build the map. |
| `trip/checklists.md` | Bookings, via-ferrata kit, tolls, packing list, emergency contacts. |

Overnights are left as `[BOOK: TBD]` — fill in once accommodation is confirmed.

---

## `web/` — interactive map

Angular 21 + Leaflet 1.9, hitting public OpenStreetMap tiles. No API keys needed.

### Run locally

```bash
cd web
npm install
npm start
```

Then open <http://localhost:4200>.

### Rebuild route data

Waypoints live inside `web/scripts/build-route.mjs`. The script fetches driving polylines from the public OSRM API and writes `web/public/assets/route.json`.

```bash
cd web
npm run build:route
```

Manual (non-routed) segments are used for:

- **Großglockner High Alpine Road** — it's a private toll road, not in OSRM. Rendered as a dashed line via key viewpoints (Heiligenblut → Hochtor → Fuscher Lacke → Ferleiten).
- **Nordkette cable car** (Hungerburg → Seegrube → Hafelekar).
- **Cinque Torri chairlift** (Bai de Dones → Rifugio Scoiattoli).

### Production build

```bash
cd web
npm run build
```

Output goes to `web/dist/web/browser/`.

### Deploy to Firebase Hosting (optional)

```bash
cd web
npm install -g firebase-tools         # one-time
firebase login                         # one-time
firebase init hosting                  # pick "dist/web/browser" as public dir, single-page app: NO
firebase deploy
```

Any static host works (GitHub Pages, Netlify, Vercel, Cloudflare Pages). Just serve `web/dist/web/browser/`.

---

## Tech choices

- **Angular 21** standalone components with signals.
- **Leaflet 1.9** for the map; **OpenStreetMap** tiles.
- **OSRM** public routing API for drive-time / distance / road polylines.
- **SCSS** for styles; dark theme.

## License / data attribution

- Map data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright).
- Routing © [OSRM](http://project-osrm.org/).
