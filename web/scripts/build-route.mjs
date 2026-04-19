#!/usr/bin/env node
// Build route.json from trip waypoints + hand-synced structured content.
// - Fetches GeoJSON road polylines from public OSRM for each consecutive pair of waypoints.
// - Manual (non-routable) legs (toll roads, cable cars) are drawn as straight dashed lines.
// - Per-day content (timeline, activities, significantStops, overnight) is embedded for the web app.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '..', 'public', 'assets', 'route.json');

/**
 * Waypoint ids follow the pattern d{day}-w{index}.
 * Timeline / activity / stop entries reference those ids.
 */

const days = [
  // =========================================================================
  // DAY 1 — Klagenfurt -> Großglockner -> Kaprun
  // =========================================================================
  {
    day: 1,
    title: 'Klagenfurt → Großglockner → Kaprun',
    theme: "Austria's highest alpine pass road, iconic high-altitude lake",
    color: '#e63946',
    from: 'Klagenfurt',
    to: 'Kaprun',
    waypoints: [
      { id: 'd1-w0', label: 'Klagenfurt (start)',                      coords: [46.6228, 14.3050], type: 'start' },
      { id: 'd1-w1', label: 'Heiligenblut — toll gate & church',       coords: [47.0401, 12.8454], type: 'viewpoint' },
      { id: 'd1-w2', label: 'Hochtor (2,504 m)',                        coords: [47.0830, 12.8530], type: 'viewpoint' },
      { id: 'd1-w3', label: 'Fuscher Lacke (2,262 m)',                  coords: [47.1185, 12.8369], type: 'activity' },
      { id: 'd1-w4', label: 'Bruck a.d. Großglocknerstraße',            coords: [47.2862, 12.8218], type: 'via' },
      { id: 'd1-w5', label: 'Kaprun (overnight)',                       coords: [47.2724, 12.7477], type: 'overnight' },
    ],
    // Großglockner Hochalpenstraße is a toll road — drawn as straight lines
    // between waypoints (OSRM would re-route around it). Times are estimates.
    manualLegs: [
      { index: 1, duration_min: 40, distance_km: 25 }, // Heiligenblut → Hochtor
      { index: 2, duration_min: 15, distance_km: 7  }, // Hochtor → Fuscher Lacke
      { index: 3, duration_min: 35, distance_km: 22 }, // Fuscher Lacke → Bruck (descent)
    ],
    timeline: [
      { time: '09:00', event: 'Wake',                                  notes: 'Klagenfurt',                                                                           waypointRef: 'd1-w0' },
      { time: '10:00', event: 'Depart',                                notes: 'B100 → B106 Mölltal scenic — not A10',                                                 waypointRef: 'd1-w0' },
      { time: '~12:17', event: 'Heiligenblut toll gate',               notes: '10 min photo stop at the Gothic church viewpoint',                                    waypointRef: 'd1-w1' },
      { time: '~12:30', event: 'Großglockner High Alpine Road',        notes: '~€37–40 / car. Drive northbound.',                                                    waypointRef: 'd1-w1' },
      { time: '~13:15', event: 'Hochtor (2,504 m)',                    notes: 'Highest point, short panorama stop',                                                  waypointRef: 'd1-w2' },
      { time: '~13:45', event: 'Fuscher Lacke',                        notes: 'Park, ~30–45 min loop walk around the lake',                                          waypointRef: 'd1-w3' },
      { time: '~14:30', event: 'Continue north',                       notes: 'Descend via Ferleiten',                                                               waypointRef: 'd1-w3' },
      { time: '~15:00', event: 'Exit toll road at Bruck',              notes: null,                                                                                  waypointRef: 'd1-w4' },
      { time: '~15:17', event: 'Arrive Kaprun',                        notes: '17 min from Bruck. Check in.',                                                        waypointRef: 'd1-w5' },
      { time: 'Evening', event: 'Settle in',                           notes: 'Kaprun stroll or 10 min drive to Zell am See lakeshore',                              waypointRef: 'd1-w5' },
    ],
    activities: [
      {
        name: 'Fuscher Lacke lake walk',
        kind: 'walk',
        waypointRef: 'd1-w3',
        duration_min: 45,
        summary: 'Small high-alpine lake at 2,262 m on the Großglockner High Alpine Road.',
        details: [
          'Easy flat perimeter path — ~20 min loop, no elevation gain',
          'Großglockner (3,798 m) and surrounding glaciers frame the lake; mirror reflections on clear mornings',
          'Café and toilets at the parking',
          'Crowds peak in early afternoon; post-lunch arrival (~13:45) often quietest',
          'Trail shoes sufficient — gravel / grassed path',
        ],
      },
    ],
    significantStops: [
      { name: 'Heiligenblut church + Großglockner backdrop', waypointRef: 'd1-w1', duration_min: 15, note: 'The classic Austrian postcard view' },
      { name: 'Hochtor panorama (2,504 m)',                  waypointRef: 'd1-w2', duration_min: 15, note: 'Highest point on the road, Austria/Salzburg border tunnel' },
      { name: 'Bruck an der Großglocknerstraße',             waypointRef: 'd1-w4', duration_min: 0,  note: 'North exit of the toll road; refuel here if needed' },
    ],
    overnight: {
      town: 'Kaprun',
      property: null,
      note: "6 km south of Zell am See, 20–40% cheaper, far less crowded. Has Kitzsteinhorn glacier cable car; Zell lakeshore 10 min by car.",
      bookingUrl: 'https://www.booking.com/searchresults.html?ss=Kaprun',
    },
  },

  // =========================================================================
  // DAY 2 — Kaprun -> Innsbruck Nordkette -> Zirl
  // =========================================================================
  {
    day: 2,
    title: 'Kaprun → Nordkette → Zirl',
    theme: 'Alpine city cable car, panorama ridge, old town stroll',
    color: '#f4a261',
    from: 'Kaprun',
    to: 'Zirl',
    waypoints: [
      { id: 'd2-w0', label: 'Kaprun (start)',                           coords: [47.2724, 12.7477], type: 'start' },
      { id: 'd2-w1', label: 'Innsbruck — Hungerburg / Congress',        coords: [47.2867, 11.4034], type: 'activity' },
      { id: 'd2-w2', label: 'Seegrube (1,905 m) — Nordkette',           coords: [47.3167, 11.3833], type: 'viewpoint' },
      { id: 'd2-w3', label: 'Hafelekar (2,256 m) — Nordkette top',      coords: [47.3236, 11.3897], type: 'viewpoint' },
      { id: 'd2-w4', label: 'Innsbruck old town — Goldenes Dachl',      coords: [47.2682, 11.3933], type: 'activity' },
      { id: 'd2-w5', label: 'Zirl (overnight)',                         coords: [47.2677, 11.2395], type: 'overnight' },
    ],
    // Cable car segments — funicular + gondola, not road.
    manualLegs: [
      { index: 1, duration_min: 8,  distance_km: 2.5 }, // Hungerburg → Seegrube (gondola up)
      { index: 2, duration_min: 5,  distance_km: 1   }, // Seegrube → Hafelekar (gondola up)
      { index: 3, duration_min: 20, distance_km: 3.5 }, // Hafelekar → Old town (full ride down + short walk)
    ],
    timeline: [
      { time: '09:00', event: 'Wake',                                  notes: 'Kaprun',                                                                               waypointRef: 'd2-w0' },
      { time: '10:00', event: 'Depart',                                notes: 'B311 → B178 → A12 Inn valley motorway',                                                waypointRef: 'd2-w0' },
      { time: '~12:32', event: 'Arrive Innsbruck',                     notes: 'Park Congressgarage or Marktplatz',                                                   waypointRef: 'd2-w1' },
      { time: '12:30–13:15', event: 'Lunch in old town',               notes: 'Herzog-Friedrich-Straße',                                                             waypointRef: 'd2-w4' },
      { time: '13:30', event: 'Hungerburgbahn funicular',              notes: '8-min ride up from Rennweg (Congress)',                                               waypointRef: 'd2-w1' },
      { time: '13:40', event: 'Nordkette gondola to Seegrube',         notes: 'Transfer from Hungerburg',                                                            waypointRef: 'd2-w2' },
      { time: '14:00–15:30', event: 'Nordkette hike',                  notes: 'Gondola to Hafelekar; walk panorama trail back to Seegrube (~1h, moderate)',          waypointRef: 'd2-w3' },
      { time: '15:30', event: 'Ride down',                             notes: 'Seegrube → Hungerburg → Congress',                                                    waypointRef: 'd2-w2' },
      { time: '16:00–18:00', event: 'Innsbruck old town',              notes: 'Goldenes Dachl, Maria-Theresien-Str., Triumphpforte',                                 waypointRef: 'd2-w4' },
      { time: '18:00', event: 'Depart Innsbruck',                      notes: '~18 min west on A12',                                                                 waypointRef: 'd2-w4' },
      { time: '~18:20', event: 'Arrive Zirl',                          notes: 'Check in',                                                                            waypointRef: 'd2-w5' },
    ],
    activities: [
      {
        name: 'Nordkette cable car + Hafelekar panorama hike',
        kind: 'cable-car + hike',
        waypointRef: 'd2-w3',
        duration_min: 180,
        summary: 'Urban cable car system: Innsbruck (631 m) → Hafelekar (2,256 m) in ~20 min, then panorama trail back to Seegrube.',
        details: [
          'Route: Congress → Hungerburg (funicular) → Seegrube (gondola) → Hafelekar (gondola)',
          'Hafelekar → Seegrube panorama trail ~1h, moderate — some steep rocky sections, solid footwear',
          'Easier option: plateau walk at Seegrube level (~45 min flat)',
          'Queues of 20–30 min at Hungerburg / Seegrube in July–August — book online in advance',
          'Full return ticket ~€40–45 / person',
        ],
      },
      {
        name: 'Innsbruck old town stroll',
        kind: 'walk',
        waypointRef: 'd2-w4',
        duration_min: 90,
        summary: 'Medieval city core around Goldenes Dachl.',
        details: [
          'Goldenes Dachl (Golden Roof) — the must-see; courtyard and streets are free',
          'Maria-Theresien-Straße for the postcard view of the Nordkette ridge',
          'Triumphpforte, Hofkirche, Hofburg if time allows',
        ],
      },
    ],
    // Stops covered by the activities above — no extra dwell time to count.
    significantStops: [
      { name: 'Seegrube (1,905 m)',             waypointRef: 'd2-w2', duration_min: 0, note: 'Innsbruck and Inn valley from the ridge (included in cable-car activity)' },
      { name: 'Hafelekar (2,256 m)',            waypointRef: 'd2-w3', duration_min: 0, note: 'Top station — best panorama (included in cable-car activity)' },
      { name: 'Goldenes Dachl',                  waypointRef: 'd2-w4', duration_min: 0, note: 'Iconic Innsbruck golden roof (included in old-town stroll)' },
    ],
    overnight: {
      town: 'Zirl',
      property: null,
      note: 'Small Inn valley town 18 min west of Innsbruck. Quieter and cheaper than the city. Saves 13 min on Day 3 morning drive to Ötztal.',
      bookingUrl: 'https://www.booking.com/searchresults.html?ss=Zirl+Tirol',
    },
  },

  // =========================================================================
  // DAY 3 — Zirl -> Stuibenfall Klettersteig -> Ötztal
  // =========================================================================
  {
    day: 3,
    title: 'Zirl → Stuibenfall Klettersteig → Ötztal',
    theme: "Full-day via ferrata — Austria's longest waterfall",
    color: '#2a9d8f',
    from: 'Zirl',
    to: 'Umhausen / Längenfeld',
    // Route is strictly southward down the Ötztal valley — no backtracking.
    // Stuibenfall waterfall and ferrata approach are on foot from the Umhausen
    // gear rental + parking area, so there is no separate drive leg out to the
    // trailhead.
    waypoints: [
      { id: 'd3-w0', label: 'Zirl (start)',                               coords: [47.2677, 11.2395], type: 'start' },
      { id: 'd3-w1', label: 'Umhausen — gear rental, parking & Stuibenfall trailhead', coords: [47.1289, 10.9349], type: 'activity' },
      { id: 'd3-w2', label: 'Längenfeld (overnight)',                     coords: [47.0731, 10.9736], type: 'overnight' },
    ],
    manualLegs: [],
    timeline: [
      { time: '09:00', event: 'Wake',                                notes: 'Zirl — check weather (mountain-forecast + ZAMG Tirol)',                                  waypointRef: 'd3-w0' },
      { time: '10:00', event: 'Depart',                              notes: 'B171 → B186 into Ötztal',                                                               waypointRef: 'd3-w0' },
      { time: '~11:03', event: 'Arrive Umhausen',                    notes: 'Park at / near the gear shop — you walk from here, no further driving',                 waypointRef: 'd3-w1' },
      { time: '11:00–11:30', event: 'Gear pickup',                   notes: 'Helmet, harness, via ferrata Y-lanyard — reserve ahead',                                waypointRef: 'd3-w1' },
      { time: '11:30', event: 'Walk / approach to trailhead',        notes: '~15–30 min walk east to the Stuibenfall base',                                          waypointRef: 'd3-w1' },
      { time: '12:00–15:00', event: 'Stuibenfall Klettersteig',      notes: 'B/C difficulty, ~2.5–3h on route',                                                      waypointRef: 'd3-w1' },
      { time: '~15:15', event: 'Descent',                            notes: '~45 min walk back to the village',                                                      waypointRef: 'd3-w1' },
      { time: '~16:00', event: 'Return gear in Umhausen',            notes: null,                                                                                    waypointRef: 'd3-w1' },
      { time: '~16:15', event: 'Drive on to Längenfeld',             notes: 'South on B186 — new road, no backtracking',                                             waypointRef: 'd3-w2' },
      { time: '~16:37', event: 'Arrive Längenfeld',                  notes: 'Check in, shower, optional Aqua Dome thermal spa',                                      waypointRef: 'd3-w2' },
      { time: 'Evening', event: 'Dinner',                            notes: 'Längenfeld or Umhausen village',                                                        waypointRef: 'd3-w2' },
    ],
    activities: [
      {
        name: 'Stuibenfall Klettersteig',
        kind: 'via ferrata',
        waypointRef: 'd3-w1',
        duration_min: 270,
        summary: "Via ferrata alongside Austria's highest waterfall (159 m). Iron rungs and cables bolted to the rock beside the cascade.",
        details: [
          'Approached on foot from Umhausen (no separate drive — park once at the gear shop)',
          'Difficulty: B/C (moderate-difficult, UIAA via ferrata scale)',
          'Significant exposure — sections over the gorge with big drop below',
          'Total time: ~20–30 min approach + 2.5–3h ferrata + 45 min descent = ~4–4.5h door to door',
          'No own gear: book a certified guide (€60–120/pp) 4–6 weeks ahead, or rent Y-lanyard + harness + helmet locally (requires prior B/C experience)',
          'Footwear: approach shoes or stiff hiking boots — not trail runners',
          'ABORT on thunderstorm risk — lightning on a metal-clipped route is life-threatening',
        ],
      },
    ],
    significantStops: [
      { name: 'Stuibenfall waterfall (159 m)', waypointRef: 'd3-w1', duration_min: 0,  note: "Austria's highest waterfall — visible from the approach trail (included in ferrata activity)" },
      { name: 'Umhausen village',              waypointRef: 'd3-w1', duration_min: 30, note: 'Gear pickup + return, plus lunch' },
    ],
    overnight: {
      town: 'Umhausen or Längenfeld (Ötztal)',
      property: null,
      note: 'Small valley villages with guesthouses / Gasthöfe. Längenfeld (10 km up from Umhausen) has Aqua Dome thermal spa if legs are tired.',
      bookingUrl: 'https://www.booking.com/searchresults.html?ss=L%C3%A4ngenfeld+%C3%96tztal',
    },
  },

  // =========================================================================
  // DAY 4 — Ötztal -> Timmelsjoch -> Passeier -> Jaufenpass -> Sterzing -> Cortina
  // Scenic alternative to the Brenner motorway — two iconic alpine passes.
  // =========================================================================
  {
    day: 4,
    title: 'Ötztal → Timmelsjoch → Jaufenpass → Cortina',
    theme: 'Two high alpine passes through South Tyrol to the Dolomites',
    color: '#457b9d',
    from: 'Längenfeld (Ötztal)',
    to: "Cortina d'Ampezzo",
    waypoints: [
      { id: 'd4-w0', label: 'Längenfeld (start)',                        coords: [47.0731, 10.9736], type: 'start' },
      { id: 'd4-w1', label: 'Sölden',                                    coords: [46.9676, 11.0075], type: 'via' },
      { id: 'd4-w2', label: 'Timmelsjoch / Passo del Rombo (2,509 m)',   coords: [46.9053, 11.0972], type: 'viewpoint' },
      { id: 'd4-w3', label: 'Walten / Valtina — Passeier valley',        coords: [46.8257, 11.2887], type: 'via' },
      { id: 'd4-w4', label: 'Jaufenpass / Passo Giovo (2,094 m)',        coords: [46.8394, 11.3211], type: 'viewpoint' },
      { id: 'd4-w5', label: 'Sterzing / Vipiteno',                       coords: [46.8963, 11.4336], type: 'via' },
      { id: 'd4-w6', label: "Cortina d'Ampezzo (overnight)",             coords: [46.5366, 12.1357], type: 'overnight' },
    ],
    // Timmelsjoch toll road (Sölden → summit → Walten) may not be fully routed
    // by OSRM: the Austrian side is a private toll road (access=customers on
    // some segments). If OSRM routes around it via the Brenner, we fall back
    // to straight manual legs with estimated times so the map stays honest.
    manualLegs: [],
    timeline: [
      { time: '09:00',        event: 'Wake',                              notes: 'Längenfeld (Ötztal)',                                                                                   waypointRef: 'd4-w0' },
      { time: '10:00',        event: 'Depart',                            notes: 'B186 south through the upper Ötztal',                                                                   waypointRef: 'd4-w0' },
      { time: '~10:20',       event: 'Sölden',                            notes: 'Quick coffee / fuel stop — last Austrian town before the pass',                                          waypointRef: 'd4-w1' },
      { time: '~11:00–11:30', event: 'Timmelsjoch summit (2,509 m)',      notes: "One of Europe's most spectacular pass roads. Toll ~€22/car. Architecture pavilions at the border.",     waypointRef: 'd4-w2' },
      { time: '~11:30–12:20', event: 'Descend into Passeier',             notes: 'Italian side — tight hairpins, views back into the Ötztal Alps',                                        waypointRef: 'd4-w3' },
      { time: '~12:20–13:15', event: 'Walten / Valtina — lunch',          notes: 'Tiny Passeier-valley hamlet at 1,300 m. Gasthaus / trattoria lunch. Stretch.',                           waypointRef: 'd4-w3' },
      { time: '~13:15',       event: 'Depart via St. Leonhard',           notes: 'SS44 east — Jaufenpass road branches off at St. Leonhard',                                                waypointRef: 'd4-w3' },
      { time: '~13:50–14:15', event: 'Jaufenpass summit (2,094 m)',       notes: 'Northernmost pass entirely within Italy — ~20 switchbacks on the climb',                                 waypointRef: 'd4-w4' },
      { time: '~14:15–14:55', event: 'Descend to Sterzing / Vipiteno',    notes: 'Medieval South-Tyrolean town on the Eisack; arcaded Neustadt',                                           waypointRef: 'd4-w5' },
      { time: '~14:55–15:15', event: 'Sterzing — stretch / photo',        notes: 'Quick walk down Neustadt arcade if time allows',                                                        waypointRef: 'd4-w5' },
      { time: '~15:15',       event: 'Depart',                            notes: 'A22 south to Brixen/Bressanone, then SS49 (Val Pusteria) → SR51 to Cortina',                             waypointRef: 'd4-w5' },
      { time: '~17:00',       event: "Arrive Cortina d'Ampezzo",          notes: 'Check in; evening stroll on Corso Italia',                                                               waypointRef: 'd4-w6' },
      { time: 'Evening',      event: 'Dinner',                            notes: 'Corso Italia restaurants — one block off main is noticeably cheaper',                                    waypointRef: 'd4-w6' },
    ],
    activities: [
      {
        name: 'Timmelsjoch pass drive (Passo del Rombo)',
        kind: 'scenic drive',
        waypointRef: 'd4-w2',
        duration_min: 90,
        summary: "Austria's most spectacular paved pass road (2,509 m), connecting Ötztal with the Passeier valley via ~34 km of hairpins on the Italian descent.",
        details: [
          'Open roughly late May to late October — closes with first heavy snow. Check https://www.timmelsjoch.com before departure',
          'Toll ~€22 per car (2025 prices); purchased at the Austrian toll gate above Hochgurgl',
          'Architecture pavilions at the summit (Matthias Schmuck) with short walks — good 20–30 min stop',
          'Views: Ötztal Alps north, Dolomites and Passeier south from the summit',
          'Caravans / trailers prohibited on the road',
        ],
      },
      {
        name: 'Jaufenpass drive (Passo Giovo)',
        kind: 'scenic drive',
        waypointRef: 'd4-w4',
        duration_min: 60,
        summary: 'Free public pass (SS44) at 2,094 m connecting Passeier and Sterzing with ~20 switchbacks each side.',
        details: [
          'Open year-round barring heavy snow; simpler and less exposed than Timmelsjoch',
          'Small Gasthaus at the summit — coffee / strudel stop',
          "Less-touristed than Timmelsjoch; traffic usually light except on weekends",
          'Good fallback if Timmelsjoch is closed — reroute via Jaufenpass + A22 down to Cortina',
        ],
      },
    ],
    significantStops: [
      { name: 'Sölden (1,368 m)',                 waypointRef: 'd4-w1', duration_min: 15, note: 'Ötztal\'s best-known ski town; last fuel before the pass toll gate' },
      { name: 'Walten / Valtina (1,300 m)',       waypointRef: 'd4-w3', duration_min: 55, note: 'Passeier-valley hamlet, frazione of St. Leonhard — Gasthaus lunch stop with the Pfarrkirche St. Anton on the roadside' },
      { name: 'Sterzing / Vipiteno (948 m)',      waypointRef: 'd4-w5', duration_min: 20, note: 'Medieval arcaded town; quick stretch / coffee on Neustadt before the A22 south' },
    ],
    overnight: {
      town: "Cortina d'Ampezzo",
      property: null,
      note: 'Upscale mountain resort; July–August tightens fast. Cheaper alternatives within 15 min: San Vito di Cadore, Pocol. (Arrival ~17:00 with the scenic route — book ahead.)',
      bookingUrl: "https://www.booking.com/searchresults.html?ss=Cortina+d%27Ampezzo",
    },
  },

  // =========================================================================
  // DAY 5 — Cortina -> Misurina -> Tre Cime -> Klagenfurt
  // =========================================================================
  {
    day: 5,
    title: 'Cortina → Lago di Misurina → Tre Cime → Klagenfurt',
    theme: 'Two iconic Dolomites stops on the way home — no backtracking',
    color: '#6d4c93',
    from: "Cortina d'Ampezzo",
    to: 'Klagenfurt (home)',
    waypoints: [
      { id: 'd5-w0', label: "Cortina d'Ampezzo (start)",            coords: [46.5366, 12.1357], type: 'start' },
      { id: 'd5-w1', label: 'Lago di Misurina (1,754 m)',           coords: [46.5827, 12.2533], type: 'activity' },
      { id: 'd5-w2', label: 'Rifugio Auronzo / Tre Cime (2,333 m)', coords: [46.6128, 12.2967], type: 'viewpoint' },
      { id: 'd5-w3', label: 'Klagenfurt (home)',                    coords: [46.6228, 14.3050], type: 'start' },
    ],
    // Tre Cime toll road (Misurina -> Rifugio Auronzo) is private and not routed by OSRM.
    manualLegs: [
      { index: 1, duration_min: 15, distance_km: 8 }, // Misurina → Rifugio Auronzo (toll road uphill)
    ],
    timeline: [
      { time: '09:00', event: 'Wake',                                  notes: "Cortina d'Ampezzo",                                                                  waypointRef: 'd5-w0' },
      { time: '09:30', event: 'Depart Cortina',                        notes: 'SR48 east toward Misurina',                                                          waypointRef: 'd5-w0' },
      { time: '~10:00', event: 'Arrive Lago di Misurina',              notes: '~45 min flat lake walk (2.6 km perimeter)',                                          waypointRef: 'd5-w1' },
      { time: '~10:45', event: 'Drive up Tre Cime toll road',          notes: '~€30 / car round trip, ~15 min up',                                                  waypointRef: 'd5-w2' },
      { time: '~11:00', event: 'Arrive Rifugio Auronzo (2,333 m)',     notes: 'Paved parking; can fill by mid-morning on sunny weekends',                           waypointRef: 'd5-w2' },
      { time: '11:15–12:45', event: 'Tre Cime viewpoint walk',         notes: 'Rifugio Auronzo → Rifugio Lavaredo and back, ~1h30, graded path',                    waypointRef: 'd5-w2' },
      { time: '~12:45', event: 'Drive back down toll road',            notes: '~15 min to Misurina',                                                                waypointRef: 'd5-w1' },
      { time: '~13:00', event: 'Lunch to go in Misurina',              notes: null,                                                                                 waypointRef: 'd5-w1' },
      { time: '13:30', event: 'Depart east for home',                  notes: 'SR48 → Auronzo → SS51 → SS52 → A23 → A2',                                            waypointRef: 'd5-w1' },
      { time: '~15:00', event: 'Cross into Austria',                   notes: 'Tarvisio border',                                                                    waypointRef: 'd5-w3' },
      { time: '~16:48', event: 'Arrive Klagenfurt',                    notes: 'Home',                                                                               waypointRef: 'd5-w3' },
    ],
    activities: [
      {
        name: 'Lago di Misurina lake walk',
        kind: 'walk',
        waypointRef: 'd5-w1',
        duration_min: 45,
        summary: '"Pearl of Cadore" — largest natural lake of the area at 1,754 m.',
        details: [
          'Easy flat perimeter, ~2.6 km, no elevation, paved/gravel mix',
          '~45 min relaxed pace',
          'Reflections of Sorapiss (south) and Tre Cime (north)',
          'Busy midday — ~10:00 is quiet',
          'Cafés, toilets, paid parking (~€3/hr)',
        ],
      },
      {
        name: 'Tre Cime di Lavaredo viewpoint walk',
        kind: 'walk',
        waypointRef: 'd5-w2',
        duration_min: 90,
        summary: 'The iconic Dolomites panorama — three vertical rock towers (Cima Grande 2,999 m).',
        details: [
          'Short loop: Rifugio Auronzo (2,333 m) → Rifugio Lavaredo (2,344 m) and back, ~4 km, ~1h30',
          'Wide gravel path, minimal elevation — trail shoes fine',
          'Gives the famous north-face view without the full 3-hour Rifugio Locatelli loop',
          'Plateau is exposed — bring a wind layer even in August',
          'Morning is usually clearest; afternoon clouds often build by 13:00',
        ],
      },
    ],
    significantStops: [
      { name: 'Lago di Misurina (1,754 m)',   waypointRef: 'd5-w1', duration_min: 0, note: '"Pearl of Cadore"; panorama of Sorapiss & Tre Cime (included in lake walk)' },
      { name: 'Rifugio Auronzo (2,333 m)',    waypointRef: 'd5-w2', duration_min: 0, note: 'Trailhead viewpoint under the Tre Cime north face (included in Tre Cime walk)' },
    ],
    overnight: null,
  },
];

// -----------------------------------------------------------------------------

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
    geometry: route.geometry,
  };
}

function straightLeg(fromCoords, toCoords, meta = {}) {
  const [flat, flon] = fromCoords;
  const [tlat, tlon] = toCoords;
  return {
    duration_s: meta.duration_min != null ? meta.duration_min * 60 : null,
    distance_m: meta.distance_km != null ? meta.distance_km * 1000 : null,
    geometry: { type: 'LineString', coordinates: [[flon, flat], [tlon, tlat]] },
    manual: true,
  };
}

/** Normalize manualLegs: accept either numbers or `{ index, duration_min?, distance_km? }` objects. */
function manualLegsMap(raw) {
  const m = new Map();
  if (!raw) return m;
  for (const entry of raw) {
    if (typeof entry === 'number') m.set(entry, {});
    else m.set(entry.index, { duration_min: entry.duration_min, distance_km: entry.distance_km });
  }
  return m;
}

async function main() {
  const result = { days: [] };
  for (const d of days) {
    const legs = [];
    const manual = manualLegsMap(d.manualLegs);
    for (let i = 0; i < d.waypoints.length - 1; i++) {
      const from = d.waypoints[i].coords;
      const to   = d.waypoints[i + 1].coords;
      if (manual.has(i)) {
        legs.push(straightLeg(from, to, manual.get(i)));
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
        await new Promise(r => setTimeout(r, 400));
      }
    }
    result.days.push({
      day: d.day,
      title: d.title,
      theme: d.theme,
      color: d.color,
      from: d.from,
      to: d.to,
      overnight: d.overnight,
      waypoints: d.waypoints,
      timeline: d.timeline,
      activities: d.activities,
      significantStops: d.significantStops,
      legs,
    });
  }
  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.writeFile(OUT, JSON.stringify(result, null, 2));
  console.log(`\nWrote ${OUT}`);
}

main().catch(err => { console.error(err); process.exit(1); });
