# Alps Loop — Trip Overview

**Route:** Klagenfurt → Hohe Tauern (Großglockner) → Kaprun → Innsbruck → Ötztal (Stuibenfall) → Cortina d'Ampezzo → Klagenfurt  
**Duration:** 5 days, 4 nights  
**Season:** July–August  
**Home base:** Klagenfurt (no overnight counted)

---

## Route at a glance

```
Klagenfurt
    ↓  Mölltal scenic road (B106)
Heiligenblut  →  Großglockner High Alpine Road (toll)
    ↓  Fuscher Lacke (2,262 m)
Kaprun  [Night 1]
    ↓  Inn valley / A12
Innsbruck  →  Nordkette cable car
    ↓
Zirl  [Night 2]
    ↓  Ötztal (B186)
Umhausen  →  Stuibenfall Klettersteig
    ↓
Ötztal valley  [Night 3]
    ↓  Brenner A13 / A22
Cortina d'Ampezzo  →  Lago Ghedina
    ↓
Cortina  [Night 4]
    ↓  Cinque Torri chairlift  →  SS51 → A23 → A2
Klagenfurt  (home)
```

---

## Day summary

| Day | From → To | Drive (OSRM) | Main activity | Sleep |
|-----|-----------|--------------|---------------|-------|
| 1 | Klagenfurt → Kaprun | ~4h 04min + 45 min lake stop | Großglockner road + **Fuscher Lacke** (2,262 m) | **Kaprun** |
| 2 | Kaprun → Zirl | ~2h 32min | **Nordkette** cable car + Innsbruck old town | **Zirl** |
| 3 | Zirl → Ötztal | ~1h 03min | **Stuibenfall Klettersteig** (B/C via ferrata, full day) | **Umhausen / Längenfeld** |
| 4 | Ötztal → Cortina | ~3h 20min | **Lago Ghedina** easy lake walk | **Cortina d'Ampezzo** |
| 5 | Cortina → Klagenfurt | ~3h 18min | **Cinque Torri** chairlift + plateau loop | — home — |

> **OSRM times are idealized** (no traffic). Add 20–40 min for summer traffic on Brenner A22 and around Innsbruck. Leave all buffers on the generous side.

---

## Overnight placeholders

| Night | Town | Property | Booking note |
|-------|------|----------|--------------|
| 1 | **Kaprun** | `[ BOOK: TBD ]` | 20–40 % cheaper than Zell am See; book early for July–Aug |
| 2 | **Zirl** | `[ BOOK: TBD ]` | Small Inn valley town; easy availability |
| 3 | **Umhausen or Längenfeld** (Ötztal) | `[ BOOK: TBD ]` | Valley guesthouses; reserve ahead |
| 4 | **Cortina d'Ampezzo** | `[ BOOK: TBD ]` | Peak-season resort prices; alt: San Vito di Cadore (15 min) |

---

## Confirmed OSRM driving times

| Leg | OSRM | Distance |
|-----|------|----------|
| Klagenfurt → Heiligenblut (Mölltal B106) | ~2h 17min | 162 km |
| Heiligenblut → Bruck (Großglockner road, toll) | ~1h 30min est. | not OSRM-routable |
| Bruck an der Großglocknerstraße → Kaprun | ~17 min | 12 km |
| Kaprun → Innsbruck (Hungerburg area) | ~2h 32min | 150 km |
| Innsbruck → Zirl | ~18 min | 15.5 km |
| Zirl → Umhausen | ~1h 03min | 56 km |
| Umhausen → Cortina d'Ampezzo / Cinque Torri | ~3h 20min | 210 km |
| Cinque Torri → Klagenfurt | ~3h 18min | 233 km |

---

## Key costs to budget

| Item | Approx. cost |
|------|-------------|
| Großglockner toll (Day 1) | ~€37–40 / car |
| Nordkette funicular + gondola return (Day 2) | ~€40–45 / person |
| Stuibenfall gear rental (Day 3) | ~€20–30 / person |
| Stuibenfall guide (Day 3, recommended) | ~€60–120 / person (group rate varies) |
| Brenner A13 + A22 motorway tolls (Day 4) | ~€15–20 total |
| Cinque Torri chairlift return (Day 5) | ~€15 / person |
| A23 + A2 return tolls (Day 5) | ~€10–15 total |

---

## Phase 2 — Interactive map (separate context)

When building the Firebase + Leaflet web app, use these references:

- **Leaflet.js docs:** https://leafletjs.com/reference.html
- **OSRM GeoJSON polylines:** `http://router.project-osrm.org/route/v1/driving/{lon1,lat1;lon2,lat2}?geometries=geojson&overview=full`
- **OpenStreetMap tile URL:** `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
- **Firebase Hosting quickstart:** https://firebase.google.com/docs/hosting/quickstart
- **Firebase CLI install:** `npm install -g firebase-tools`
- **Firebase init + deploy:**
  ```bash
  firebase login
  firebase init hosting   # public dir: src, single-page: no
  firebase deploy
  ```

Waypoint coordinates for `route.json` are embedded as frontmatter in each `day-0X.md` file.
