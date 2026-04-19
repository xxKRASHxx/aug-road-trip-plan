#!/usr/bin/env node
// Build route.json from trip waypoints.
// Fetches GeoJSON road polylines from public OSRM for each consecutive pair of waypoints.
// Großglockner High Alpine Road is a private toll road not in OSRM; we add a synthetic polyline
// through known key points (Heiligenblut -> Hochtor -> Fuscher Lacke -> Ferleiten -> Bruck).

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '..', 'public', 'assets', 'route.json');

const days = [
  {
    day: 1,
    title: 'Klagenfurt → Großglockner → Kaprun',
    color: '#e63946',
    overnight: 'Kaprun',
    waypoints: [
      { label: 'Klagenfurt (start)',              coords: [46.6228, 14.3050], type: 'start' },
      { label: 'Heiligenblut — toll gate',         coords: [47.0401, 12.8454], type: 'viewpoint' },
      { label: 'Hochtor (2,504 m)',                coords: [47.0830, 12.8530], type: 'viewpoint' },
      { label: 'Fuscher Lacke (2,262 m)',          coords: [47.1185, 12.8369], type: 'activity' },
      { label: 'Bruck a.d. Großglocknerstraße',    coords: [47.2862, 12.8218], type: 'via' },
      { label: 'Kaprun (overnight)',               coords: [47.2724, 12.7477], type: 'overnight' },
    ],
    // These legs are NOT routable in OSRM (Großglockner toll road), mark them to use straight / manual line:
    manualLegs: [1, 2, 3], // indices: Heiligenblut→Hochtor, Hochtor→Fuscher, Fuscher→Bruck
  },
  {
    day: 2,
    title: 'Kaprun → Nordkette → Zirl',
    color: '#f4a261',
    overnight: 'Zirl',
    waypoints: [
      { label: 'Kaprun (start)',           coords: [47.2724, 12.7477], type: 'start' },
      { label: 'Innsbruck — Hungerburg',   coords: [47.2867, 11.4034], type: 'activity' },
      { label: 'Seegrube (1,905 m)',       coords: [47.3167, 11.3833], type: 'viewpoint' },
      { label: 'Hafelekar (2,256 m)',      coords: [47.3236, 11.3897], type: 'viewpoint' },
      { label: 'Innsbruck old town',       coords: [47.2682, 11.3933], type: 'activity' },
      { label: 'Zirl (overnight)',         coords: [47.2677, 11.2395], type: 'overnight' },
    ],
    // Nordkette cable car legs aren't roads; make those manual too
    manualLegs: [1, 2, 3], // Hungerburg→Seegrube, Seegrube→Hafelekar, Hafelekar→Innsbruck
  },
  {
    day: 3,
    title: 'Zirl → Stuibenfall Klettersteig → Ötztal',
    color: '#2a9d8f',
    overnight: 'Umhausen / Längenfeld',
    waypoints: [
      { label: 'Zirl (start)',              coords: [47.2677, 11.2395], type: 'start' },
      { label: 'Umhausen — gear rental',    coords: [47.1108, 10.9241], type: 'via' },
      { label: 'Stuibenfall Klettersteig',  coords: [47.1140, 10.9280], type: 'activity' },
      { label: 'Längenfeld (overnight)',    coords: [47.0731, 10.9736], type: 'overnight' },
    ],
    manualLegs: [],
  },
  {
    day: 4,
    title: 'Ötztal → Brenner → Cortina d\'Ampezzo',
    color: '#457b9d',
    overnight: 'Cortina d\'Ampezzo',
    waypoints: [
      { label: 'Längenfeld (start)',        coords: [47.0731, 10.9736], type: 'start' },
      { label: 'Brenner pass (1,374 m)',    coords: [47.0071, 11.5069], type: 'viewpoint' },
      { label: 'Cortina d\'Ampezzo',        coords: [46.5366, 12.1357], type: 'via' },
      { label: 'Lago Ghedina',              coords: [46.5461, 12.1289], type: 'activity' },
      { label: 'Cortina (overnight)',       coords: [46.5366, 12.1357], type: 'overnight' },
    ],
    manualLegs: [],
  },
  {
    day: 5,
    title: 'Cinque Torri → Klagenfurt (home)',
    color: '#6d4c93',
    overnight: null,
    waypoints: [
      { label: 'Cortina (start)',                 coords: [46.5366, 12.1357], type: 'start' },
      { label: 'Cinque Torri chairlift',          coords: [46.5175, 12.0566], type: 'activity' },
      { label: 'Rifugio Scoiattoli (2,255 m)',    coords: [46.5120, 12.0530], type: 'viewpoint' },
      { label: 'Klagenfurt (home)',               coords: [46.6228, 14.3050], type: 'start' },
    ],
    // Chairlift is not a road
    manualLegs: [1], // Cinque Torri chairlift → Rifugio Scoiattoli
  },
];

async function fetchLeg(fromCoords, toCoords) {
  const [flat, flon] = fromCoords;
  const [tlat, tlon] = toCoords;
  const url = `http://router.project-osrm.org/route/v1/driving/${flon},${flat};${tlon},${tlat}?geometries=geojson&overview=full`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM HTTP ${res.status} for ${url}`);
  const data = await res.json();
  if (data.code !== 'Ok') throw new Error(`OSRM code ${data.code}: ${JSON.stringify(data)}`);
  const route = data.routes[0];
  return {
    duration_s: route.duration,
    distance_m: route.distance,
    geometry: route.geometry, // {type:"LineString", coordinates: [[lon,lat],...]}
  };
}

function straightLeg(fromCoords, toCoords) {
  const [flat, flon] = fromCoords;
  const [tlat, tlon] = toCoords;
  return {
    duration_s: null,
    distance_m: null,
    geometry: { type: 'LineString', coordinates: [[flon, flat], [tlon, tlat]] },
    manual: true,
  };
}

async function main() {
  const result = { days: [] };
  for (const d of days) {
    const legs = [];
    for (let i = 0; i < d.waypoints.length - 1; i++) {
      const from = d.waypoints[i].coords;
      const to   = d.waypoints[i + 1].coords;
      if (d.manualLegs?.includes(i)) {
        legs.push(straightLeg(from, to));
      } else {
        process.stdout.write(`  day ${d.day} leg ${i}: ${d.waypoints[i].label} → ${d.waypoints[i + 1].label} ... `);
        try {
          const leg = await fetchLeg(from, to);
          console.log(`${(leg.duration_s / 60).toFixed(1)} min, ${(leg.distance_m / 1000).toFixed(1)} km`);
          legs.push(leg);
        } catch (e) {
          console.log(`OSRM failed (${e.message}) — falling back to straight line`);
          legs.push(straightLeg(from, to));
        }
        await new Promise(r => setTimeout(r, 400)); // gentle rate-limit
      }
    }
    result.days.push({
      day: d.day,
      title: d.title,
      color: d.color,
      overnight: d.overnight,
      waypoints: d.waypoints,
      legs,
    });
  }
  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.writeFile(OUT, JSON.stringify(result, null, 2));
  console.log(`\nWrote ${OUT}`);
}

main().catch(err => { console.error(err); process.exit(1); });
