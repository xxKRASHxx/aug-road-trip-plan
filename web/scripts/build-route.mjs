#!/usr/bin/env node
// Build route.json from trip waypoints + hand-synced structured content.
// - Fetches GeoJSON road polylines from public OSRM for each consecutive pair of waypoints.
// - Manual (non-routable) legs (toll roads, cable cars) are drawn as straight dashed lines.
// - Per-day content (timeline, activities, significantStops, overnight) is embedded for the web app.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import RU from './translations.ru.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '..', 'public', 'assets');
const OUT_EN = path.join(OUT_DIR, 'route.en.json');
const OUT_RU = path.join(OUT_DIR, 'route.ru.json');

// Top-level overview blurb shown on the Overview tab. Same shape as a day's
// blurb (summary + facts + hint). Russian version is in translations.ru.mjs.
const OVERVIEW_EN = {
  summary:
    'A 5-day loop from Klagenfurt through the eastern Alps: ' +
    "Austria's highest pass road, a cable-car day in Innsbruck up to the " +
    '2,256 m Nordkette ridge, a full-day via ferrata in the Ötztal, two spectacular ' +
    'South-Tyrolean passes with a stop at Lago di Braies, and home via Lago di ' +
    'Misurina and Tre Cime.',
  facts: [
    { label: 'Start / end',    value: 'Klagenfurt' },
    { label: 'Duration',       value: '5 days · 4 nights' },
    { label: 'Daily rhythm',   value: 'Wake 07:30–09:00 · depart by 10:00 · dinner wraps by ~21:00 (Day 5 home ~16:30)' },
    { label: 'Highest point',  value: '2,571 m (Edelweißspitze, Day 1)' },
    { label: 'Driving style',  value: 'Scenic over fastest' },
  ],
  hint:
    'Click any day tab above, or a marker on the map, to see its route, ' +
    'activities, meals, sightseeing stops, and overnight.',
};

/**
 * Waypoint ids follow the pattern d{day}-w{index}.
 * Timeline / activity / stop entries reference those ids.
 */

// --- Photo helpers (Wikimedia Commons) ------------------------------------
// Special:FilePath redirects any filename to the underlying file and respects
// a requested width, so these URLs are stable across Commons thumbnail churn.
const COMMONS = 'https://commons.wikimedia.org';
const wmSrc  = (file, w = 800) => `${COMMONS}/wiki/Special:FilePath/${encodeURIComponent(file)}?width=${w}`;
const wmPage = (file)          => `${COMMONS}/wiki/File:${encodeURIComponent(file).replace(/%20/g, '_')}`;
/**
 * Build a Photo object from a Commons filename and metadata.
 * @param {string} file   exact Commons filename, WITH extension (e.g. "Fuscher_Lacke.jpg")
 * @param {string} alt    accessible alt text
 * @param {string} credit human-readable attribution ("Author / CC BY-SA 4.0 via Wikimedia Commons")
 */
const wmPhoto = (file, alt, credit) => ({
  src: wmSrc(file),
  alt,
  credit,
  href: wmPage(file),
});

const days = [
  // =========================================================================
  // DAY 1, Klagenfurt -> Großglockner -> Kaprun
  // =========================================================================
  {
    day: 1,
    title: 'Klagenfurt → Großglockner → Kaprun',
    theme: 'Epic pass-road day, switchbacks above the clouds, marmots, and a glacial sky-lake',
    color: '#e63946',
    // Most of the day is inside Hohe Tauern National Park (Salzburg/Carinthia);
    // "Klagenfurt" and "Kaprun" are unique enough to resolve with this bias.
    region: 'Hohe Tauern, Austria',
    blurb: {
      summary:
        "A scenic crossing of Austria's highest mountain road. Long climbs above the tree " +
        "line, pastel-blue alpine lakes, and near-certain marmot sightings. By late " +
        "afternoon you drop into the green Kaprun valley for dinner at the foot of the " +
        "Kitzsteinhorn.",
      facts: [
        { label: 'Pass',          value: 'Hochtor · 2,504 m' },
        { label: 'Highest point', value: 'Edelweißspitze · 2,571 m' },
        { label: 'Toll',          value: '€44 / car (1-day Glocknerstraße)' },
        { label: 'Highlight',     value: 'Fuscher Lacke turquoise lake' },
        { label: 'Wildlife',      value: 'Marmots & ibex likely' },
        { label: 'Bring',         value: 'Warm layer, ~10 °C colder up top' },
      ],
      hint: 'Click any marker on the map, or a row below, to focus that location.',
    },
    stress: {
      level: 2,
      summary: 'Full day on a tourist-heavy high-alpine toll road; altitude, switchbacks, and wind, but no real hiking or time pressure.',
    },
    from: 'Klagenfurt',
    to: 'Kaprun',
    // REQUIRED waypoints, base route (drive + short stops).
    // Edelweißspitze is a ~1.6 km paved spur off Fuscher Törl, small detour,
    // highest viewpoint on the entire Glocknerstraße (360° panorama).
    waypoints: [
      { id: 'd1-w0', label: 'Klagenfurt (start)',                      coords: [46.6228, 14.3050], type: 'start',     city: 'Klagenfurt am Wörthersee', postcode: '9020', region: 'Carinthia, Austria' },
      { id: 'd1-w1', label: 'Heiligenblut (toll gate & church)',      coords: [47.0401, 12.8454], type: 'viewpoint', city: 'Heiligenblut am Großglockner', postcode: '9844' },
      {
        id: 'd1-w2',
        label: 'Hochtor (2,504 m)',
        // OSM mountain_pass Hochtor (Großglockner); not the Hochtor peak N of Fusch — that
        // confuses Apple/Google name search if coords/query are ambiguous.
        coords: [47.0812, 12.8426],
        type: 'viewpoint',
        feature: 'Großglockner Hochalpenstraße',
        city: 'Heiligenblut am Großglockner',
        postcode: '9844',
      },
      { id: 'd1-w3', label: 'Edelweißspitze (2,571 m)',                coords: [47.1261, 12.8389], type: 'viewpoint' },
      {
        id: 'd1-w4', label: 'Fuscher Lacke (2,262 m)',
        coords: [47.1185, 12.8369], type: 'activity',
      },
      { id: 'd1-w5', label: 'Bruck a.d. Großglocknerstraße',           coords: [47.2862, 12.8218], type: 'via',       city: 'Bruck an der Großglocknerstraße', postcode: '5671', region: 'Salzburg, Austria' },
      { id: 'd1-w6', label: 'Kaprun (overnight)',                      coords: [47.2724, 12.7477], type: 'overnight', city: 'Kaprun', postcode: '5710', region: 'Salzburg, Austria' },
    ],
    // Großglockner Hochalpenstraße is in OSM; OSRM routes the toll road (legs 1–4).
    // B100 → B106 Mölltal (scenic); via Spittal keeps OSRM off the A10 short-cut.
    osrmVias: {
      0: [[46.7970, 13.4950]],
    },
    timeline: [
      { time: '09:00',  event: 'Wake',                                 notes: 'Klagenfurt',                                                                           waypointRef: 'd1-w0' },
      { time: '10:00',  event: 'Depart',                               notes: 'B100 → B106 Mölltal scenic, not A10',                                                 waypointRef: 'd1-w0' },
      { time: '~12:17', event: 'Heiligenblut toll gate',               notes: '10 min photo stop at the Gothic church viewpoint',                                    waypointRef: 'd1-w1' },
      { time: '~12:30', event: 'Großglockner High Alpine Road',        notes: '~€37–40 / car. Drive northbound.',                                                    waypointRef: 'd1-w1' },
      { time: '~13:15', event: 'Hochtor (2,504 m)',                    notes: 'Highest point, panorama stop',                                                       waypointRef: 'd1-w2' },
      { time: '~13:35', event: 'Edelweißspitze spur',                  notes: '1.6 km paved spur off Fuscher Törl to the best 360° panorama on the whole road',      waypointRef: 'd1-w3' },
      { time: '14:00–15:00', event: 'Fuscher Törl lunch (60 min)',     notes: 'Sit-down lunch at the panorama Gasthaus at 2,428 m',                                  waypointRef: 'd1-w4' },
      { time: '15:00–15:30', event: 'Fuscher Lacke lake loop',         notes: '~20 min perimeter walk with Großglockner reflections',                                waypointRef: 'd1-w4' },
      { time: '~15:30', event: 'Continue north',                       notes: 'Descend via Ferleiten',                                                               waypointRef: 'd1-w4' },
      { time: '~16:05', event: 'Exit toll road at Bruck',              notes: null,                                                                                  waypointRef: 'd1-w5' },
      { time: '~16:22', event: 'Arrive Kaprun',                        notes: '17 min from Bruck. Check in.',                                                        waypointRef: 'd1-w6' },
      { time: 'Evening', event: 'Dinner in Kaprun',                    notes: 'Kaprun stroll or 10 min drive to Zell am See lakeshore',                              waypointRef: 'd1-w6' },
    ],
    activities: [
      {
        name: 'Fuscher Lacke lake walk',
        kind: 'walk',
        waypointRef: 'd1-w4',
        duration_min: 30,
        summary: 'Small high-alpine lake at 2,262 m on the Großglockner High Alpine Road.',
        details: [
          'Easy flat perimeter path, ~20 min loop, no elevation gain',
          'Großglockner (3,798 m) and surrounding glaciers frame the lake; mirror reflections on clear mornings',
          'Café and toilets at the parking',
          'Crowds peak in early afternoon; post-lunch arrival (~14:00) often quietest',
          'Trail shoes sufficient, gravel / grassed path',
        ],
        links: [
          { label: 'Großglockner High Alpine Road (official)', url: 'https://www.grossglockner.at/gg/en', note: 'Tolls, opening status, webcams' },
          { label: 'Hohe Tauern National Park', url: 'https://hohetauern.at/en/' },
        ],
        photos: [
          wmPhoto('Fuscher Lacke Panorama Großglocknerhochalpenstraße.jpg',
                  'Fuscher Lacke panorama on the Großglockner road',
                  'Public domain via Wikimedia Commons'),
        ],
      },
      // OPTIONAL: add Kitzsteinhorn Gipfelwelt 3,000 if arriving Kaprun with
      // daylight to spare (cable car closes ~16:00, so this is only realistic
      // when skipping Edelweißspitze or KFJ-Höhe).
      {
        name: 'Kitzsteinhorn Gipfelwelt 3,000 (OPTIONAL)',
        kind: 'cable car',
        waypointRef: 'd1-w6',
        duration_min: 150,
        optional: true,
        summary: 'Glacier cable car from Kaprun to 3,029 m, viewing platform, ice tunnel, panorama walks.',
        details: [
          'Return ticket ~€56 / adult; last uphill ~15:00–15:30 (varies by season)',
          '~30 min drive between Kaprun hotels and the valley station',
          'Top Of Salzburg viewing platform over the Hohe Tauern glaciers',
          'Realistic only if you skip Edelweißspitze or arrive Kaprun by ~15:00',
          'Weather gated: low clouds = milk-white view with no refund',
        ],
        links: [
          { label: 'Kitzsteinhorn (tickets + live status)', url: 'https://www.kitzsteinhorn.at/en' },
        ],
        photos: [
          wmPhoto('Kitzsteinhorn und Schmiedingerkees.JPG',
                  'Kitzsteinhorn summit area with Schmiedinger glacier',
                  'CC BY-SA 4.0 via Wikimedia Commons'),
        ],
      },
    ],
    // Meals, counted toward the day's total time.
    meals: [
      {
        time: '14:00–15:00',
        kind: 'lunch',
        place: 'Fuscher Törl / Fuscher Lacke Panoramarestaurant (2,428 m)',
        waypointRef: 'd1-w4',
        duration_min: 60,
        travel_min: 0,
        travel_mode: 'included',
        travel_note: 'Restaurant is right at the Fuscher Törl parking, no transfer.',
        note: 'High-altitude mountain Gasthaus right on the road with Großglockner views, strudel, Kasnocken, beer.',
      },
    ],
    significantStops: [
      { name: 'Heiligenblut church + Großglockner backdrop', waypointRef: 'd1-w1', duration_min: 15, note: 'The classic Austrian postcard view' },
      { name: 'Hochtor panorama (2,504 m)',                  waypointRef: 'd1-w2', duration_min: 15, note: 'Highest point on the road, Austria/Salzburg border tunnel' },
      { name: 'Edelweißspitze (2,571 m)',                    waypointRef: 'd1-w3', duration_min: 20, note: 'Highest point on the Glocknerstraße network, 360° panorama over the Hohe Tauern glaciers' },
      { name: 'Bruck an der Großglocknerstraße',             waypointRef: 'd1-w5', duration_min: 0,  note: 'North exit of the toll road; refuel here if needed' },
      // OPTIONAL spur, adds ~60 min round trip but gives the actual Pasterze
      // glacier + Großglockner massif view. Decide at Heiligenblut before
      // entering the toll road.
      {
        name: 'Kaiser-Franz-Josefs-Höhe / Pasterze glacier (OPTIONAL)',
        waypointRef: 'd1-w1',
        duration_min: 75,
        optional: true,
        note: '9 km dead-end spur from Heiligenblut (toll included). Parking deck + café at 2,369 m with direct views of Großglockner (3,798 m) and the receding Pasterze glacier. Funicular down to the ice edge runs when conditions allow.',
        photos: [
          wmPhoto('Kaiser-Franz-Josefs-Höhe.jpg',
                  'Kaiser-Franz-Josefs-Höhe viewpoint toward Großglockner and Pasterze glacier',
                  'CC BY-SA 3.0 via Wikimedia Commons'),
        ],
      },
    ],
    overnight: {
      town: 'Kaprun',
      property: null,
      note: "6 km south of Zell am See, 20–40% cheaper, far less crowded. Has Kitzsteinhorn glacier cable car; Zell lakeshore 10 min by car.",
      bookingUrl: 'https://www.booking.com/searchresults.html?ss=Kaprun',
    },
    photos: [
      wmPhoto('1291-Heiligenblut.jpg',
              'Heiligenblut church with Großglockner behind, the classic postcard view',
              'CC BY-SA 3.0 via Wikimedia Commons'),
      wmPhoto('Fuscher Lacke Panorama Großglocknerhochalpenstraße.jpg',
              'Panorama of Fuscher Lacke at 2,262 m',
              'Public domain via Wikimedia Commons'),
      wmPhoto('Grossglockner High Alpine Road, National Park Hohe Tauern Austria.jpg',
              'Großglockner High Alpine Road switchbacks',
              'CC BY-SA 4.0 via Wikimedia Commons'),
      wmPhoto('Grossglockner hochalpenstrasse 12 2016.jpg',
              'Großglockner Hochalpenstraße in summer',
              'CC BY-SA 4.0 via Wikimedia Commons'),
    ],
  },

  // =========================================================================
  // DAY 2, Kaprun -> Innsbruck Nordkette -> Fulpmes
  // =========================================================================
  {
    day: 2,
    title: 'Kaprun → Nordkette → Fulpmes',
    theme: 'Motorway sprint, then the cable car straight from Innsbruck old town to a 2,256 m ridge',
    // Day starts in Salzburg (Kaprun / Zell am See) then runs west into Tirol.
    // Default to Tirol since 5 of 7 waypoints are there; Salzburg waypoints
    // override below.
    region: 'Tirol, Austria',
    blurb: {
      summary:
        'A fast motorway transfer west, then a classic Innsbruck half-day: a funicular ' +
        'plus two cable cars straight from the city centre to 2,256 m. Panoramic lunch ' +
        'above the Inn valley, an old-town stroll at golden hour, and a night in Fulpmes (Stubaital).',
      facts: [
        { label: 'Cable car',  value: 'Nordkettenbahnen (~€47 pp return)' },
        { label: 'Top',        value: 'Hafelekar · 2,256 m' },
        { label: 'Old town',   value: 'Goldenes Dachl, Hofgarten' },
        { label: 'Driving',    value: 'A10 → A12 motorway' },
        { label: 'Sleep',      value: 'Hotel Garni Hubertus · Fulpmes' },
      ],
      hint: 'Click any marker on the map, or a row below, to focus that location.',
    },
    stress: {
      level: 1,
      summary: 'Mostly motorway driving, a city half-day with cable cars doing the altitude work. Lightest day of the trip.',
    },
    color: '#f4a261',
    from: 'Kaprun',
    to: 'Fulpmes',
    // Zell am See lakefront stretch-break added on departure, the lake is
    // 10 min from Kaprun and is the "missing" sight of the Salzburg leg.
    waypoints: [
      { id: 'd2-w0', label: 'Kaprun (start)',                           coords: [47.2724, 12.7477], type: 'start',     city: 'Kaprun',      postcode: '5710', region: 'Salzburg, Austria' },
      { id: 'd2-w1', label: 'Zell am See lakefront',                   coords: [47.3250, 12.7959], type: 'viewpoint', city: 'Zell am See', postcode: '5700', region: 'Salzburg, Austria' },
      { id: 'd2-w2', label: 'Innsbruck Hungerburgbahn',                coords: [47.2867, 11.4034], type: 'activity',  city: 'Innsbruck',   postcode: '6020' },
      { id: 'd2-w3', label: 'Seegrube Nordkette (1,905 m)',            coords: [47.3167, 11.3833], type: 'viewpoint', city: 'Innsbruck',   postcode: '6020' },
      { id: 'd2-w4', label: 'Hafelekar Nordkette (2,256 m)',           coords: [47.3236, 11.3897], type: 'viewpoint', city: 'Innsbruck',   postcode: '6020' },
      { id: 'd2-w5', label: 'Goldenes Dachl, Innsbruck',               coords: [47.2682, 11.3933], type: 'activity',  city: 'Innsbruck',   postcode: '6020' },
      { id: 'd2-w6', label: 'Fulpmes (overnight)',                      coords: [47.1527, 11.3489], type: 'overnight', city: 'Fulpmes',     postcode: '6166', region: 'Stubaital, Tirol, Austria', feature: 'Hotel' },
    ],
    // Cable car segments (funicular + gondola): not on the drivable network, so manual.
    // Hafelekar → old town is OSRM-routed (drive down via Nordkette service road).
    manualLegs: [
      { index: 2, duration_min: 8,  distance_km: 2.5 }, // Hungerburg → Seegrube (gondola up)
      { index: 3, duration_min: 5,  distance_km: 1   }, // Seegrube → Hafelekar (gondola up)
    ],
    manualPaths: {
      2: [
        [47.2867, 11.4034], [47.2895, 11.4015], [47.2930, 11.3995], [47.2970, 11.3975],
        [47.3010, 11.3955], [47.3050, 11.3935], [47.3090, 11.3915], [47.3130, 11.3895],
        [47.3167, 11.3833],
      ],
      3: [
        [47.3167, 11.3833], [47.3185, 11.3850], [47.3205, 11.3870], [47.3236, 11.3897],
      ],
    },
    // Force A12 Inn valley motorway via Wörgl (OSRM otherwise prefers B164 Hochkönig).
    osrmVias: {
      1: [[47.4886, 12.0683]],
    },
    timeline: [
      { time: '09:00',  event: 'Wake',                                 notes: 'Kaprun',                                                                               waypointRef: 'd2-w0' },
      { time: '10:00',  event: 'Depart',                               notes: 'B311 → B178 → A12 Inn valley motorway',                                                waypointRef: 'd2-w0' },
      { time: '~10:10', event: 'Zell am See lakefront',                notes: '10 min stretch / photos at Esplanade, the lake day 1 skipped',                        waypointRef: 'd2-w1' },
      { time: '~12:45', event: 'Arrive Innsbruck',                     notes: 'Park Congressgarage or Marktplatz',                                                   waypointRef: 'd2-w2' },
      { time: '13:00–14:00', event: 'Lunch in old town (60 min)',      notes: 'Herzog-Friedrich-Straße, Tiroler Gröstl, schnitzel, apfelstrudel',                    waypointRef: 'd2-w5' },
      { time: '14:15',  event: 'Hungerburgbahn funicular',             notes: '8-min ride up from Rennweg (Congress)',                                               waypointRef: 'd2-w2' },
      { time: '14:25',  event: 'Nordkette gondola to Seegrube',        notes: 'Transfer from Hungerburg',                                                            waypointRef: 'd2-w3' },
      { time: '14:45–16:15', event: 'Nordkette hike',                  notes: 'Gondola to Hafelekar; walk panorama trail back to Seegrube (~1 h, moderate)',         waypointRef: 'd2-w4' },
      { time: '16:15',  event: 'Ride down',                            notes: 'Seegrube → Hungerburg → Congress',                                                    waypointRef: 'd2-w3' },
      { time: '16:45–18:00', event: 'Innsbruck old town',              notes: 'Goldenes Dachl, Maria-Theresien-Str., Triumphpforte',                                 waypointRef: 'd2-w5' },
      { time: '18:00',  event: 'Depart Innsbruck',                     notes: '~25 min south into the Stubaital (L12)',                                              waypointRef: 'd2-w5' },
      { time: '~18:25', event: 'Arrive Fulpmes',                       notes: 'Check in at Hotel Garni Hubertus (Medrazerstraße 10)',                                waypointRef: 'd2-w6' },
      { time: 'Evening', event: 'Dinner in Fulpmes',                   notes: 'Hotel partner Pizzeria Pavillon (~1 min walk) or Stubaital Gasthof',                  waypointRef: 'd2-w6' },
    ],
    activities: [
      {
        name: 'Nordkette cable car + Hafelekar panorama hike',
        kind: 'cable-car + hike',
        waypointRef: 'd2-w4',
        duration_min: 150,
        summary: 'Urban cable car system: Innsbruck (631 m) → Hafelekar (2,256 m) in ~20 min, then panorama trail back to Seegrube.',
        details: [
          'Route: Congress → Hungerburg (funicular) → Seegrube (gondola) → Hafelekar (gondola)',
          'Hafelekar → Seegrube panorama trail ~1 h, moderate, some steep rocky sections, solid footwear',
          'Easier option: plateau walk at Seegrube level (~45 min flat)',
          'Queues of 20–30 min at Hungerburg / Seegrube in July–August, book online in advance',
          'Full return ticket ~€40–45 / person',
        ],
        links: [
          { label: 'Nordkette cable car (tickets + timetable)', url: 'https://www.nordkette.com/en/', note: 'Buy online to skip the Hungerburg queue' },
          { label: 'Hungerburgbahn (funicular)',               url: 'https://www.nordkette.com/en/ticket-shop/' },
          { label: 'Innsbruck Card',                            url: 'https://www.innsbruck.info/en/highlights/innsbruck-card.html', note: 'Includes the Nordkette return + most museums' },
        ],
        photos: [
          wmPhoto('Airport Innsbruck (LOWI) Panorama - Nordkette.jpg',
                  'Nordkette ridge towering over Innsbruck',
                  'CC BY-SA 4.0 via Wikimedia Commons'),
        ],
      },
      {
        name: 'Innsbruck old town stroll',
        kind: 'walk',
        waypointRef: 'd2-w5',
        duration_min: 90,
        summary: 'Medieval city core around Goldenes Dachl.',
        details: [
          'Goldenes Dachl (Golden Roof), the must-see; courtyard and streets are free',
          'Maria-Theresien-Straße for the postcard view of the Nordkette ridge',
          'Triumphpforte, Hofkirche, Hofburg if time allows',
        ],
        links: [
          { label: 'Innsbruck tourist info',  url: 'https://www.innsbruck.info/en/' },
          { label: 'Goldenes Dachl (museum)', url: 'https://www.innsbruck.gv.at/maximilianeum' },
        ],
        photos: [
          wmPhoto('Goldenes Dachl (Innsbruck).jpg',
                  'Goldenes Dachl, the Golden Roof of Innsbruck',
                  'CC BY-SA 3.0 via Wikimedia Commons'),
        ],
      },
      // OPTIONAL: 15 min summit bump from Hafelekar top station, much less
      // crowded than the Seegrube panorama trail, sharper viewpoint.
      {
        name: 'Hafelekarspitze summit bump (OPTIONAL)',
        kind: 'short hike',
        waypointRef: 'd2-w4',
        duration_min: 30,
        optional: true,
        summary: 'Short zig-zag trail from the Hafelekar top station to the 2,334 m summit cross.',
        details: [
          'Round trip ~30 min; ~80 m elevation gain, loose rocky path',
          'Noticeably less crowded than the Seegrube panorama trail',
          'Sharper, more dramatic summit viewpoint over Innsbruck',
          'Skip in rain or snow, exposed last 20 m',
        ],
        photos: [
          wmPhoto('Hafelekarspitze N.JPG',
                  'Hafelekarspitze summit above Innsbruck',
                  'CC BY-SA 4.0 via Wikimedia Commons'),
        ],
      },
    ],
    meals: [
      {
        time: '13:00–14:00',
        kind: 'lunch',
        place: 'Innsbruck old town, Herzog-Friedrich-Straße',
        waypointRef: 'd2-w5',
        duration_min: 60,
        travel_min: 10,
        travel_mode: 'walk',
        travel_note: '~5 min walk each way from Congressgarage / Marktplatz to the old-town pedestrian street.',
        note: 'Tiroler Gröstl, Schnitzel, Kaiserschmarrn, Weisses Rössl and Stiftskeller are reliable staples.',
        links: [
          { label: 'Innsbruck dining guide', url: 'https://www.innsbruck.info/en/eat-and-drink/', note: 'Tourism office restaurant list' },
        ],
      },
      {
        time: 'Evening',
        kind: 'dinner',
        place: 'Pizzeria Pavillon or Fulpmes Gasthof',
        waypointRef: 'd2-w6',
        duration_min: 90,
        travel_min: 0,
        travel_mode: 'walk',
        travel_note: 'Pizzeria Pavillon is ~1 min from Hotel Garni Hubertus (hotel partner; half-board menu available).',
        note: 'Tiroler classics or pizza after the Innsbruck day. Hotel settles bills in cash or bank transfer — no credit/EC cards on site.',
        links: [
          { label: 'Hotel Garni Hubertus', url: 'https://www.hubertus-fulpmes.at/?lang=en' },
        ],
      },
    ],
    // Stops covered by the activities above, no extra dwell time to count.
    significantStops: [
      { name: 'Zell am See lakefront',           waypointRef: 'd2-w1', duration_min: 10, note: 'Esplanade photo stop, the Salzburg-leg lake the plan would otherwise skip' },
      { name: 'Seegrube (1,905 m)',              waypointRef: 'd2-w3', duration_min: 0,  note: 'Innsbruck and Inn valley from the ridge (included in cable-car activity)' },
      { name: 'Hafelekar (2,256 m)',             waypointRef: 'd2-w4', duration_min: 0,  note: 'Top station, best panorama (included in cable-car activity)' },
      { name: 'Goldenes Dachl',                  waypointRef: 'd2-w5', duration_min: 0,  note: 'Iconic Innsbruck golden roof (included in old-town stroll)' },
    ],
    overnight: {
      town: 'Fulpmes',
      property: 'Hotel Garni Hubertus',
      note: 'Booked — Stubaital village ~25 min south of Innsbruck. Indoor pool & sauna at the hotel. Check-in 15:00–20:00; hotel prefers cash or bank transfer (no credit/EC cards).',
      bookingUrl: 'https://www.booking.com/Share-E41tuyP',
    },
    photos: [
      wmPhoto('Airport Innsbruck (LOWI) Panorama - Nordkette.jpg',
              'Nordkette ridge over Innsbruck from the south',
              'CC BY-SA 4.0 via Wikimedia Commons'),
      wmPhoto('Goldenes Dachl (Innsbruck).jpg',
              'Goldenes Dachl, Golden Roof of Innsbruck',
              'CC BY-SA 3.0 via Wikimedia Commons'),
      wmPhoto('2731 - Innsbruck - Goldenes Dachl.JPG',
              'Innsbruck old town alley toward Goldenes Dachl',
              'CC BY-SA 2.5 via Wikimedia Commons'),
    ],
  },

  // =========================================================================
  // DAY 3, Fulpmes -> Stuibenfall Klettersteig -> Ötztal
  // =========================================================================
  {
    day: 3,
    title: 'Fulpmes → Stuibenfall Klettersteig → Ötztal',
    theme: "The adrenaline day, 3 h of iron rungs beside Austria's 159 m waterfall, thermal baths at night",
    // Entire day is inside the Ötztal valley.
    region: 'Ötztal, Tirol, Austria',
    blurb: {
      summary:
        "Short morning drive into the Ötztal, then the whole day is on rock: a guided " +
        "via ferrata climb beside Tirol's tallest waterfall. Rental gear from the Ötztal " +
        "centre, ~3–4 h on the wire, easy evening stroll in Längenfeld.",
      facts: [
        { label: 'Main event',   value: 'Stuibenfall Klettersteig (B/C)' },
        { label: 'Guide + gear', value: '~€95 / person' },
        { label: 'Time on rock', value: '3–4 hours' },
        { label: 'Minimum age',  value: '12 years' },
        { label: 'Weather',      value: 'Dry rock only, reschedule if rain' },
      ],
      hint: 'Click any marker on the map, or a row below, to focus that location.',
    },
    stress: {
      level: 5,
      summary: 'Most physically demanding day, 3 h on a B/C-grade via ferrata with significant exposure. Weather-dependent; no room to improvise.',
    },
    color: '#2a9d8f',
    from: 'Fulpmes',
    to: 'Umhausen / Längenfeld',
    // Route is strictly southward down the Ötztal valley, no backtracking.
    // Stuibenfall waterfall and ferrata approach are on foot from the Umhausen
    // gear rental + parking area, so there is no separate drive leg out to the
    // trailhead.
    waypoints: [
      { id: 'd3-w0', label: 'Fulpmes (start)',                            coords: [47.1527, 11.3489], type: 'start',     city: 'Fulpmes',    postcode: '6166', region: 'Stubaital, Tirol, Austria', feature: 'Hotel' },
      { id: 'd3-w1', label: 'Stuibenfall trailhead, Umhausen',            coords: [47.1289, 10.9349], type: 'activity',  city: 'Umhausen',   postcode: '6441' },
      { id: 'd3-w2', label: 'Längenfeld (overnight)',                     coords: [47.0731, 10.9736], type: 'overnight', city: 'Längenfeld', postcode: '6444' },
    ],
    manualLegs: [],
    timeline: [
      { time: '09:00',       event: 'Wake',                          notes: 'Fulpmes, check weather (mountain-forecast + ZAMG Tirol)',                               waypointRef: 'd3-w0' },
      { time: '10:00',       event: 'Depart',                        notes: 'B171 → B186 into Ötztal',                                                               waypointRef: 'd3-w0' },
      { time: '~11:03',      event: 'Arrive Umhausen',               notes: 'Park at / near the gear shop, you walk from here, no further driving',                 waypointRef: 'd3-w1' },
      { time: '11:05–11:30', event: 'Gear pickup',                   notes: 'Helmet, harness, via ferrata Y-lanyard, reserve ahead',                                waypointRef: 'd3-w1' },
      { time: '11:30–12:30', event: 'Pre-climb lunch (60 min)',      notes: 'Proper sit-down lunch at an Umhausen Gasthof, fuel for 3 h on rock. No food once harness is on.', waypointRef: 'd3-w1' },
      { time: '12:30',       event: 'Walk / approach to trailhead',  notes: '~15–30 min walk east to the Stuibenfall base',                                          waypointRef: 'd3-w1' },
      { time: '13:00–16:00', event: 'Stuibenfall Klettersteig',      notes: 'B/C difficulty, ~2.5–3 h on route',                                                     waypointRef: 'd3-w1' },
      { time: '~16:15',      event: 'Descent',                       notes: '~45 min walk back to the village',                                                      waypointRef: 'd3-w1' },
      { time: '~17:00',      event: 'Return gear in Umhausen',       notes: null,                                                                                    waypointRef: 'd3-w1' },
      { time: '~17:15',      event: 'Drive on to Längenfeld',        notes: 'South on B186, new road, no backtracking',                                             waypointRef: 'd3-w2' },
      { time: '~17:37',      event: 'Arrive Längenfeld',             notes: 'Check in, shower; optional Aqua Dome thermal spa before dinner',                        waypointRef: 'd3-w2' },
      { time: '19:30',       event: 'Dinner',                        notes: 'Längenfeld or Umhausen village Gasthof',                                                waypointRef: 'd3-w2' },
    ],
    activities: [
      {
        name: 'Stuibenfall Klettersteig',
        kind: 'via ferrata',
        waypointRef: 'd3-w1',
        duration_min: 270,
        summary: "Via ferrata alongside Austria's highest waterfall (159 m). Iron rungs and cables bolted to the rock beside the cascade.",
        details: [
          'Approached on foot from Umhausen (no separate drive, park once at the gear shop)',
          'Difficulty: B/C (moderate-difficult, UIAA via ferrata scale)',
          'Significant exposure, sections over the gorge with big drop below',
          'Total time: ~20–30 min approach + 2.5–3h ferrata + 45 min descent = ~4–4.5h door to door',
          'No own gear: book a certified guide (€60–120/pp) 4–6 weeks ahead, or rent Y-lanyard + harness + helmet locally (requires prior B/C experience)',
          'Footwear: approach shoes or stiff hiking boots, not trail runners',
          'ABORT on thunderstorm risk, lightning on a metal-clipped route is life-threatening',
        ],
        links: [
          { label: 'Stuibenfall Klettersteig (Ötztal Tourismus)', url: 'https://www.oetztal.com/en/active-in-the-oetztal/outdoor-oetztal/climbing/via-ferrata-oetztal/stuibenfall.html', note: 'Route map, topo, gear, guide bookings' },
          { label: 'Weather (mountain-forecast.com)',             url: 'https://www.mountain-forecast.com/peaks/Acherkogel/forecasts/2987' },
          { label: 'Weather (ZAMG Tirol)',                        url: 'https://www.zamg.ac.at/cms/de/wetter/wetter-oesterreich/tirol' },
          { label: 'Ötztal tourism portal',                       url: 'https://www.oetztal.com/en/' },
        ],
        photos: [
          wmPhoto('Stuibenfall, Hängebrücke.jpg',
                  'Suspension bridge and iron stairs on the Stuibenfall ferrata',
                  'CC BY-SA 4.0 via Wikimedia Commons'),
          wmPhoto('Hängebrücke und Treppenanlage am Stuibenfall.jpg',
                  'Upper section of the Stuibenfall ferrata',
                  'CC BY-SA 4.0 via Wikimedia Commons'),
        ],
      },
      // OPTIONAL: post-climb thermal spa recovery. Legal-to-drive distance
      // from the ferrata gear return, 90–120 min is plenty for the soak and
      // still get to a civilised dinner.
      {
        name: 'Aqua Dome Längenfeld thermal spa (OPTIONAL)',
        kind: 'thermal spa',
        waypointRef: 'd3-w2',
        duration_min: 120,
        optional: true,
        summary: 'Award-winning thermal bath complex in Längenfeld, outdoor sulphur pools with Ötztal mountain views.',
        details: [
          'Adult 3 h ticket ~€35 (2025)',
          '12 pools indoor/outdoor, saunas, steam baths, ideal for tired ferrata arms',
          'Bring flip-flops and swimwear (rental available but slow)',
          'Busy after 17:00; quieter 16:00–17:30 window',
        ],
        links: [
          { label: 'Aqua Dome (tickets + hours)', url: 'https://www.aqua-dome.at/en' },
        ],
        photos: [
          wmPhoto('AQUA DOME Außen Schalen 2.jpg',
                  'Aqua Dome thermal spa outdoor pools, Längenfeld',
                  'CC BY-SA 4.0 via Wikimedia Commons'),
        ],
      },
      // OPTIONAL: weather Plan B, if the ferrata is cancelled (rain, lightning
      // risk, or wet rock), swap in a cable-car day at Gaislachkogl in Sölden.
      {
        name: 'Sölden Gaislachkogl cable car (OPTIONAL, weather Plan B)',
        kind: 'cable car',
        waypointRef: 'd3-w1',
        duration_min: 180,
        optional: true,
        summary: 'Bail-out: gondola from Sölden to 3,058 m. Weather-tolerant substitute for the ferrata day.',
        details: [
          'Use ONLY when the Stuibenfall ferrata is cancelled, otherwise ferrata takes priority',
          '25 min drive south from Umhausen to Sölden gondola base',
          'Return ticket ~€40; top station at 3,058 m with 360° panorama + 007 Elements museum',
          'Top station restaurant "ice Q" (Bond filming location) if lunch inside at altitude',
          'Reliable in cloud/drizzle but not in lightning, still check the 3,000 m forecast',
        ],
        links: [
          { label: 'Gaislachkogl cable car',  url: 'https://www.soelden.com/en/summer/hike-nature/summer-ascents/gaislachkoglbahn.html' },
          { label: '007 Elements museum',     url: 'https://www.007elements.com/en/' },
        ],
        photos: [
          wmPhoto('Gaislachkogl Ⅱ Talstation 01.jpg',
                  'Gaislachkoglbahn valley station, Sölden',
                  'CC BY-SA 4.0 via Wikimedia Commons'),
        ],
      },
    ],
    meals: [
      {
        time: '11:30–12:30',
        kind: 'lunch',
        place: 'Umhausen, village Gasthof (pre-climb)',
        waypointRef: 'd3-w1',
        duration_min: 60,
        travel_min: 10,
        travel_mode: 'walk',
        travel_note: '~5 min walk each way from the gear shop to a village Gasthof.',
        note: 'Sit-down lunch before gearing up, no food once the harness is on. Hearty carbs + 1 L water minimum; avoid heavy alcohol.',
      },
      {
        time: '19:30–20:45',
        kind: 'dinner',
        place: 'Längenfeld, village Gasthof',
        waypointRef: 'd3-w2',
        duration_min: 75,
        travel_min: 20,
        travel_mode: 'walk',
        travel_note: '~10 min walk each way from the Längenfeld hotel to the village centre.',
        note: 'Earned calories after 3 h on rock, Kaspressknödel, Schlutzkrapfen, local Tirol beer.',
      },
    ],
    significantStops: [
      { name: 'Stuibenfall waterfall (159 m)', waypointRef: 'd3-w1', duration_min: 0,  note: "Austria's highest waterfall, visible from the approach trail (included in ferrata activity)" },
      { name: 'Umhausen village',              waypointRef: 'd3-w1', duration_min: 30, note: 'Gear pickup + return; short stroll between climb sections' },
    ],
    overnight: {
      town: 'Umhausen or Längenfeld (Ötztal)',
      property: null,
      note: 'Small valley villages with guesthouses / Gasthöfe. Längenfeld (10 km up from Umhausen) has Aqua Dome thermal spa if legs are tired.',
      bookingUrl: 'https://www.booking.com/searchresults.html?ss=L%C3%A4ngenfeld+%C3%96tztal',
    },
    photos: [
      wmPhoto('Stuibenfall, Hängebrücke.jpg',
              "Stuibenfall, Austria's highest waterfall at 159 m",
              'CC BY-SA 4.0 via Wikimedia Commons'),
      wmPhoto('Hängebrücke und Treppenanlage am Stuibenfall.jpg',
              'Iron stairs beside the Stuibenfall cascade',
              'CC BY-SA 4.0 via Wikimedia Commons'),
      wmPhoto('Sölden Ötztal Strasse.jpg',
              'Ötztal valley road, the B186',
              'CC BY-SA 4.0 via Wikimedia Commons'),
    ],
  },

  // =========================================================================
  // DAY 4, Ötztal -> Timmelsjoch -> Passeier -> Jaufenpass -> Sterzing -> Cortina
  // Scenic alternative to the Brenner motorway, two iconic alpine passes.
  // =========================================================================
  {
    day: 4,
    title: 'Ötztal → Timmelsjoch → Jaufenpass → Cortina',
    theme: 'Long scenic transfer to Italy, two cinematic passes, a border, and an emerald lake at dusk',
    // Border-crossing day. Most waypoints (Timmelsjoch summit + Italian side
    // through to Braies) sit in South Tyrol; Austrian-side starts and the
    // Veneto-side Cortina endpoint override below.
    region: 'South Tyrol, Italy',
    blurb: {
      summary:
        'Two high Alpine passes and the famous Lago di Braies. Climb Timmelsjoch ' +
        '(2,509 m) from Sölden, drop south through the Passeier valley, lunch in ' +
        'Walten / Valtina, cross the Jaufenpass (coffee at the Jaufenhaus optional), ' +
        'then hit Lago di Braies after 16:00 (no permit needed) before dinner in Cortina.',
      facts: [
        { label: 'Passes',    value: 'Timmelsjoch + Jaufenpass' },
        { label: 'Toll',      value: '~€22 (Timmelsjoch, car)' },
        { label: 'Bonus',     value: 'Lago di Braies after 16:00, no permit' },
        { label: 'Border',    value: 'Austria → Italy' },
        { label: 'Language',  value: 'German → Italian / Ladin' },
        { label: 'Drive',     value: 'Longest day · ~4 h behind the wheel' },
      ],
      hint: 'Click any marker on the map, or a row below, to focus that location.',
    },
    stress: {
      level: 4,
      summary: 'Longest driving day (~4 h), two high passes with switchbacks, a border crossing, and a time-sensitive Braies arrival window.',
    },
    color: '#457b9d',
    from: 'Längenfeld (Ötztal)',
    to: "Cortina d'Ampezzo",
    // Lago di Braies / Pragser Wildsee is on the route between Brixen and
    // Cortina (5 min detour off SS49). Access caps 09:30–16:00 May–Oct; we
    // time arrival for ~16:00+ so no permit is needed.
    waypoints: [
      { id: 'd4-w0', label: 'Längenfeld (start)',                        coords: [47.0731, 10.9736], type: 'start',     city: 'Längenfeld',               postcode: '6444',  region: 'Ötztal, Tirol, Austria' },
      { id: 'd4-w1', label: 'Sölden',                                    coords: [46.9676, 11.0075], type: 'via',       city: 'Sölden',                   postcode: '6450',  region: 'Ötztal, Tirol, Austria' },
      { id: 'd4-w2', label: 'Timmelsjoch / Passo del Rombo (2,509 m)',   coords: [46.9053, 11.0972], type: 'viewpoint' },
      {
        id: 'd4-w3',
        label: 'Walten / Valtina — Passeier valley',
        coords: [46.8257, 11.2887],
        type: 'meal',
        city: 'St. Leonhard in Passeier - San Leonardo in Passiria',
        postcode: '39015',
      },
      { id: 'd4-w4', label: 'Jaufenhaus (Jaufenpass, 2,094 m)',         coords: [46.8394, 11.3211], type: 'meal',      city: 'St. Leonhard in Passeier', postcode: '39015', feature: 'Gasthaus' },
      { id: 'd4-w5', label: 'Sterzing / Vipiteno',                      coords: [46.8963, 11.4336], type: 'via',       city: 'Sterzing',                 postcode: '39049' },
      { id: 'd4-w6', label: 'Lago di Braies / Pragser Wildsee (1,494 m)', coords: [46.6946, 12.0858], type: 'viewpoint', city: 'Prags',                    postcode: '39030' },
      { id: 'd4-w7', label: "Cortina d'Ampezzo (overnight)",             coords: [46.5366, 12.1357], type: 'overnight', city: "Cortina d'Ampezzo",        postcode: '32043', region: 'Dolomites, Veneto, Italy' },
    ],
    // Timmelsjoch toll road is in OSM; OSRM routes legs 1–2.
    timeline: [
      { time: '09:00',        event: 'Wake',                              notes: 'Längenfeld (Ötztal)',                                                                                   waypointRef: 'd4-w0' },
      { time: '10:00',        event: 'Depart',                            notes: 'B186 south through the upper Ötztal',                                                                   waypointRef: 'd4-w0' },
      { time: '~10:20',       event: 'Sölden, fuel + coffee',            notes: 'Last fuel before the Timmelsjoch toll gate',                                                             waypointRef: 'd4-w1' },
      { time: '~11:10',       event: 'Timmelsjoch summit (2,509 m)',      notes: "One of Europe's most spectacular pass roads. Toll ~€22 / car. Architecture pavilions at the border.",   waypointRef: 'd4-w2' },
      { time: '12:20–13:15',  event: 'Walten / Valtina — lunch',          notes: 'Passeier-valley hamlet ~1,300 m. Gasthaus / trattoria lunch (see trip/day-04.md).',                      waypointRef: 'd4-w3' },
      { time: '~13:50',       event: 'Jaufenpass summit / Jaufenhaus',    notes: 'Gasthaus at 2,094 m — coffee / strudel; ~20 switchbacks each side of the pass.',                         waypointRef: 'd4-w4' },
      { time: '~14:30',       event: 'Descend to Sterzing',               notes: 'SS44, ~20 switchbacks on the descent',                                                                  waypointRef: 'd4-w5' },
      { time: '~14:30–14:45', event: 'Sterzing, fuel / coffee',          notes: 'Skip the long old-town stroll to preserve time for Braies',                                              waypointRef: 'd4-w5' },
      { time: '~14:45',       event: 'Depart on A22',                     notes: 'A22 south to Brixen/Bressanone, then SS49 (Val Pusteria) east',                                         waypointRef: 'd4-w5' },
      { time: '~16:00–16:45', event: 'Lago di Braies / Pragser Wildsee',  notes: 'Access is permit-free after 16:00 (Mon–Sun May–Oct). ~30 min lakeshore walk, one of the most photographed lakes in the Alps.', waypointRef: 'd4-w6' },
      { time: '~17:30',       event: "Arrive Cortina d'Ampezzo",          notes: 'Check in; evening stroll on Corso Italia',                                                               waypointRef: 'd4-w7' },
      { time: '19:30',        event: 'Dinner',                            notes: 'Corso Italia restaurants, one block off main is noticeably cheaper',                                    waypointRef: 'd4-w7' },
    ],
    activities: [
      {
        name: 'Timmelsjoch pass drive (Passo del Rombo)',
        kind: 'scenic drive',
        waypointRef: 'd4-w2',
        duration_min: 75,
        summary: "Austria's most spectacular paved pass road (2,509 m), connecting Ötztal with the Passeier valley via ~34 km of hairpins on the Italian descent.",
        details: [
          'Open roughly late May to late October, closes with first heavy snow. Check https://www.timmelsjoch.com before departure',
          'Toll ~€22 per car (2025 prices); purchased at the Austrian toll gate above Hochgurgl',
          'Architecture pavilions at the summit (Matthias Schmuck) with short walks, good 20–30 min stop',
          'Views: Ötztal Alps north, Dolomites and Passeier south from the summit',
          'Caravans / trailers prohibited on the road',
        ],
        links: [
          { label: 'Timmelsjoch official (status / tolls / webcams)', url: 'https://www.timmelsjoch.com', note: 'Check opening status before departure' },
          { label: 'Timmelsjoch Experience (summit pavilions)',        url: 'https://www.timmelsjoch.com/en/experience/' },
          { label: 'Wikipedia: Timmelsjoch',                           url: 'https://en.wikipedia.org/wiki/Timmelsjoch' },
        ],
        photos: [
          wmPhoto('Passo del Rombo 06.JPG',
                  'Timmelsjoch / Passo del Rombo pass road',
                  'CC BY-SA 3.0 via Wikimedia Commons'),
        ],
      },
      {
        name: 'Jaufenpass drive (Passo Giovo)',
        kind: 'scenic drive',
        waypointRef: 'd4-w4',
        duration_min: 45,
        summary: 'Free public pass (SS44) at 2,094 m connecting Passeier and Sterzing with ~20 switchbacks each side.',
        details: [
          'Open year-round barring heavy snow; simpler and less exposed than Timmelsjoch',
          'Summit Gasthaus is ideal for coffee / strudel after lunch in Walten (see Meals)',
          "Less-touristed than Timmelsjoch; traffic usually light except on weekends",
          'Good fallback if Timmelsjoch is closed, reroute via Jaufenpass + A22 down to Cortina',
        ],
        links: [
          { label: 'Wikipedia: Jaufenpass',       url: 'https://en.wikipedia.org/wiki/Jaufen_Pass' },
          { label: 'Sterzing / Vipiteno tourism', url: 'https://www.vipiteno.com/en/' },
        ],
        photos: [
          wmPhoto('Passo di Monte Giovo-Jaufenpass 004.JPG',
                  'Jaufenpass road in South Tyrol',
                  'CC BY-SA 3.0 via Wikimedia Commons'),
          wmPhoto('Jaufenhaus 01.jpg',
                  'Jaufenhaus, the Gasthaus at the Jaufenpass summit',
                  'CC BY-SA 4.0 via Wikimedia Commons'),
        ],
      },
      {
        name: 'Lago di Braies / Pragser Wildsee lakeshore walk',
        kind: 'walk',
        waypointRef: 'd4-w6',
        duration_min: 45,
        summary: 'Emerald alpine lake at 1,494 m under the Seekofel, one of the most photographed lakes in the Alps.',
        details: [
          'Flat gravel lakeshore loop ~3.5 km (~45 min), trail shoes fine',
          'Arrival after 16:00 avoids the daily 09:30–16:00 access permit (May–Oct)',
          'Parking ~€7 (P2/P3); the lot closest to the lake (P5) is often full',
          'Historic wooden rowboats at the boathouse, rental ~€25 / 30 min',
          'Golden hour on the Seekofel face is genuinely magical, linger if weather cooperates',
        ],
        links: [
          { label: 'Pragser Wildsee official (access + booking)', url: 'https://www.prags.info/en/travel-to-prags/arrival-by-car-and-shuttle/', note: 'Permit rules, free after 16:00' },
          { label: 'Wikipedia: Lago di Braies',                    url: 'https://en.wikipedia.org/wiki/Lake_Braies' },
        ],
        photos: [
          wmPhoto('Pragser Wildsee Seekofel.jpg',
                  'Pragser Wildsee / Lago di Braies with Seekofel',
                  'CC BY-SA 4.0 via Wikimedia Commons'),
        ],
      },
      // OPTIONAL: post-arrival Cortina sunset. Runs till ~18:30 in summer.
      {
        name: 'Cinque Torri sunset chairlift (OPTIONAL)',
        kind: 'chairlift + short walk',
        waypointRef: 'd4-w7',
        duration_min: 120,
        optional: true,
        summary: '5 Torri rock towers above Cortina, open chairlift to Rifugio Scoiattoli, then a 20 min loop among the towers at golden hour.',
        details: [
          '15 min drive from Cortina to the Bain de Dones chairlift base',
          'Return chairlift ~€17; last uphill typically 17:30, last down ~18:45 (summer)',
          'Short circular walk from the top Rifugio past the towers, WWI open-air museum with trenches',
          'Genuinely better evening than another Corso Italia stroll',
          'Skip if cloud cap is below 2,400 m, the light is the whole point',
        ],
        links: [
          { label: 'Cinque Torri area (trails + lift)', url: 'https://www.cortinadolomiti.eu/en/cinque-torri/' },
          { label: 'Rifugio Scoiattoli',                url: 'https://www.rifugioscoiattoli.it/en/' },
        ],
        photos: [
          wmPhoto('Cinque Torri 1.jpg',
                  'Cinque Torri rock towers in the Dolomites',
                  'CC BY-SA 3.0 via Wikimedia Commons'),
        ],
      },
    ],
    meals: [
      {
        time: '12:20–13:15',
        kind: 'lunch',
        place: 'Walten / Valtina — Passeier valley hamlet (~1,300 m)',
        waypointRef: 'd4-w3',
        duration_min: 55,
        travel_min: 0,
        travel_mode: 'included',
        travel_note: 'Park along SS44 through the hamlet; several trattorias / Gasthöfe.',
        note: 'Tiny valley stop between Timmelsjoch descent and the Jaufenpass climb — matches trip/day-04.md.',
        links: [],
      },
      {
        time: '~14:00',
        kind: 'snack',
        place: 'Jaufenhaus (Jaufenpass summit, 2,094 m) — optional',
        waypointRef: 'd4-w4',
        duration_min: 25,
        travel_min: 0,
        travel_mode: 'included',
        travel_note: 'Gasthaus at the pass parking — coffee, Apfelstrudel, or a light second course if hungry.',
        note: 'Classic terrace views both sides of the ridge. Skip if Walten lunch ran long.',
        links: [
          { label: 'Jaufenhaus', url: 'https://www.jaufenhaus.it/en/' },
        ],
      },
      {
        time: '19:30–21:00',
        kind: 'dinner',
        place: "Cortina d'Ampezzo, one block off Corso Italia",
        waypointRef: 'd4-w7',
        duration_min: 90,
        travel_min: 20,
        travel_mode: 'walk',
        travel_note: '~10 min walk each way from the Cortina hotel to the Corso Italia side streets.',
        note: 'Main Corso is overpriced; side streets (via Mercato, via Stazione) are 20–30% cheaper for the same kitchen. Book ahead in July–August.',
      },
    ],
    significantStops: [
      { name: 'Sölden (1,368 m)',                 waypointRef: 'd4-w1', duration_min: 15, note: "Ötztal's best-known ski town; last fuel before the pass toll gate" },
      { name: 'Walten / Valtina (~1,300 m)',      waypointRef: 'd4-w3', duration_min: 55, note: 'Passeier-valley hamlet; planned lunch stop. Pfarrkirche St. Anton on the roadside.' },
      { name: 'Sterzing / Vipiteno (948 m)',      waypointRef: 'd4-w5', duration_min: 15, note: 'Medieval arcaded town, fuel + coffee. Deep old-town stroll skipped to preserve time for Braies.' },
    ],
    overnight: {
      town: 'Longarone',
      property: 'Antico Borgo',
      note: 'Booked 13–14 Aug 2026 (8 guests). ~40 min south of Cortina on SS51 toward Belluno — check in after Cortina dinner. Day 5: allow extra drive time to Misurina vs staying in Cortina.',
      bookingUrl: 'https://www.booking.com/hotel/it/antico-borgo-longarone.html?checkin=2026-08-13&checkout=2026-08-14&group_adults=8&no_rooms=1',
    },
    photos: [
      wmPhoto('Passo del Rombo 06.JPG',
              'Timmelsjoch, the high pass into South Tyrol',
              'CC BY-SA 3.0 via Wikimedia Commons'),
      wmPhoto('Passo di Monte Giovo-Jaufenpass 004.JPG',
              'Jaufenpass switchbacks above Sterzing',
              'CC BY-SA 3.0 via Wikimedia Commons'),
      wmPhoto('Sterzing-Vipiteno.JPG',
              'Sterzing / Vipiteno, medieval South-Tyrolean town',
              'CC BY-SA 3.0 via Wikimedia Commons'),
      wmPhoto('Pragser Wildsee Seekofel.jpg',
              'Pragser Wildsee / Lago di Braies with Seekofel',
              'CC BY-SA 4.0 via Wikimedia Commons'),
      wmPhoto("Cortina d'Ampezzo 01.jpg",
              "Cortina d'Ampezzo with the Tofane range",
              'CC BY-SA 4.0 via Wikimedia Commons'),
    ],
  },

  // =========================================================================
  // DAY 5, Cortina -> Misurina -> Tre Cime -> Klagenfurt
  // =========================================================================
  {
    day: 5,
    title: 'Cortina → Lago di Misurina → Tre Cime → Klagenfurt',
    theme: 'Dolomites encore, early start, walk below Tre Cime, then the long drive home',
    // Morning is all Italian Dolomites; the Klagenfurt endpoint is overridden
    // to Carinthia.
    region: 'Dolomites, Italy',
    blurb: {
      summary:
        'An early start while the Dolomites are still quiet: Lago di Misurina, then ' +
        'the toll road up to Rifugio Auronzo for the iconic view of Tre Cime di ' +
        'Lavaredo. Lunch lakeside, then a long afternoon drive home across Friuli and ' +
        'Carinthia, you should be back in Klagenfurt by late afternoon.',
      facts: [
        { label: 'Icon',        value: 'Tre Cime di Lavaredo viewpoint' },
        { label: 'Toll road',   value: 'Rifugio Auronzo · ~€30 car' },
        { label: 'Lake',        value: 'Lago di Misurina · 1,754 m' },
        { label: 'Early start', value: 'Depart 08:00, before the parking cap fills' },
        { label: 'Drive home',  value: '~3 h 15 min' },
        { label: 'Home by',     value: '~16:30 if on schedule' },
      ],
      hint: 'Click any marker on the map, or a row below, to focus that location.',
    },
    stress: {
      level: 3,
      summary: 'Early start to beat the Tre Cime parking cap, a short altitude walk, then a 3 h drive home, tight morning, relaxed afternoon.',
    },
    color: '#6d4c93',
    from: "Cortina d'Ampezzo",
    to: 'Klagenfurt (home)',
    waypoints: [
      { id: 'd5-w0', label: "Cortina d'Ampezzo (start)",            coords: [46.5366, 12.1357], type: 'start',    city: "Cortina d'Ampezzo",        postcode: '32043' },
      { id: 'd5-w1', label: 'Lago di Misurina (1,754 m)',           coords: [46.5827, 12.2533], type: 'activity', city: 'Auronzo di Cadore',        postcode: '32041' },
      { id: 'd5-w2', label: 'Rifugio Auronzo / Tre Cime (2,333 m)', coords: [46.6128, 12.2967], type: 'viewpoint', city: 'Auronzo di Cadore',       postcode: '32041' },
      { id: 'd5-w3', label: 'Klagenfurt (home)',                    coords: [46.6228, 14.3050], type: 'end',      city: 'Klagenfurt am Wörthersee', postcode: '9020', region: 'Carinthia, Austria' },
    ],
    // Tre Cime toll road (Misurina → Rifugio Auronzo) is in OSM; OSRM routes leg 1.
    // Early start so we hit the Tre Cime toll road parking before it fills
    // (sunny weekends: full by 09:30–10:00).
    timeline: [
      { time: '07:00',       event: 'Wake',                           notes: "Cortina d'Ampezzo, early start to beat the Tre Cime parking cap",                   waypointRef: 'd5-w0' },
      { time: '07:00–08:00', event: 'Breakfast at the hotel (60 min)',notes: 'Most Cortina hotels serve from 07:00, proper breakfast, not to-go, since lunch is only after the Tre Cime walk', waypointRef: 'd5-w0' },
      { time: '08:00',       event: 'Depart Cortina',                 notes: 'SR48 east toward Misurina',                                                           waypointRef: 'd5-w0' },
      { time: '~08:30',      event: 'Arrive Lago di Misurina',        notes: '~45 min flat lake walk (2.6 km perimeter), still quiet',                             waypointRef: 'd5-w1' },
      { time: '~09:15',      event: 'Drive up Tre Cime toll road',    notes: '~€30 / car round trip, ~15 min up',                                                   waypointRef: 'd5-w2' },
      { time: '~09:30',      event: 'Arrive Rifugio Auronzo (2,333 m)', notes: 'Paved parking; arriving before 10:00 almost always gets a spot',                    waypointRef: 'd5-w2' },
      { time: '09:45–11:15', event: 'Tre Cime viewpoint walk',        notes: 'Rifugio Auronzo → Rifugio Lavaredo and back, ~1 h 30, graded path',                   waypointRef: 'd5-w2' },
      { time: '~11:30',      event: 'Drive back down toll road',      notes: '~15 min to Misurina',                                                                 waypointRef: 'd5-w1' },
      { time: '12:00–13:00', event: 'Lunch in Misurina',              notes: 'Sit-down lunch at a lakeside café, you have time today',                             waypointRef: 'd5-w1' },
      { time: '13:15',       event: 'Depart east for home',           notes: 'SR48 → Auronzo → SS51 → SS52 → A23 → A2',                                             waypointRef: 'd5-w1' },
      { time: '~14:45',      event: 'Cross into Austria',             notes: 'Tarvisio border, fuel tip: diesel ~15–20 ¢/L cheaper in Italy, top up before',      waypointRef: 'd5-w3' },
      { time: '~16:30',      event: 'Arrive Klagenfurt',              notes: 'Home',                                                                                waypointRef: 'd5-w3' },
    ],
    activities: [
      {
        name: 'Lago di Misurina lake walk',
        kind: 'walk',
        waypointRef: 'd5-w1',
        duration_min: 45,
        summary: '"Pearl of Cadore", largest natural lake of the area at 1,754 m.',
        details: [
          'Easy flat perimeter, ~2.6 km, no elevation, paved/gravel mix',
          '~45 min relaxed pace',
          'Reflections of Sorapiss (south) and Tre Cime (north)',
          'Busy midday, ~10:00 is quiet',
          'Cafés, toilets, paid parking (~€3/hr)',
        ],
        links: [
          { label: 'Wikipedia: Lake Misurina', url: 'https://en.wikipedia.org/wiki/Lake_Misurina' },
          { label: 'Misurina area info',        url: 'https://www.misurina.com/en' },
        ],
        photos: [
          wmPhoto('Lago di misurina.jpg',
                  'Lago di Misurina at 1,754 m with Dolomite peaks',
                  'GFDL / CC BY-SA 3.0 via Wikimedia Commons'),
        ],
      },
      {
        name: 'Tre Cime di Lavaredo viewpoint walk',
        kind: 'walk',
        waypointRef: 'd5-w2',
        duration_min: 90,
        summary: 'The iconic Dolomites panorama, three vertical rock towers (Cima Grande 2,999 m).',
        details: [
          'Short loop: Rifugio Auronzo (2,333 m) → Rifugio Lavaredo (2,344 m) and back, ~4 km, ~1 h 30',
          'Wide gravel path, minimal elevation, trail shoes fine',
          'Gives the famous north-face view without the full 3-hour Rifugio Locatelli loop',
          'Plateau is exposed, bring a wind layer even in August',
          'Morning is usually clearest; afternoon clouds often build by 13:00',
        ],
        links: [
          { label: 'Tre Cime toll road (info + live status)', url: 'https://www.dolomiti.org/en/cortina/places/tre-cime-di-lavaredo/', note: 'Paid access road from Misurina to Rifugio Auronzo' },
          { label: 'Rifugio Auronzo (refuge)',                 url: 'https://www.rifugioauronzo.it/' },
          { label: 'Wikipedia: Tre Cime di Lavaredo',          url: 'https://en.wikipedia.org/wiki/Tre_Cime_di_Lavaredo' },
        ],
        photos: [
          wmPhoto('Dsdas.jpg',
                  'Tre Cime di Lavaredo north face',
                  'CC BY 3.0 via Wikimedia Commons'),
          wmPhoto('DreiZinnenHütte.JPG',
                  'Drei Zinnen hut (Rifugio Locatelli) below the Tre Cime',
                  'CC BY-SA 3.0 via Wikimedia Commons'),
        ],
      },
      // OPTIONAL: upgrade the out-and-back to the full Locatelli loop, the
      // single biggest hiking upgrade of the trip. Adds 90 min; home ~18:30.
      {
        name: 'Tre Cime full Locatelli loop (OPTIONAL)',
        kind: 'hike',
        waypointRef: 'd5-w2',
        duration_min: 180,
        optional: true,
        summary: 'Full anti-clockwise loop Rifugio Auronzo → Lavaredo → Locatelli → Auronzo, the classic Dolomites trek.',
        details: [
          '~10 km, ~350 m elevation gain, 3–3.5 h moderate hiking',
          'Replaces the short out-and-back, adds ~90 min but gives the iconic NORTH-face view from Locatelli',
          'Trail shoes are the minimum; hiking boots recommended',
          'Exposed plateau, check the mountain forecast and carry a wind + rain layer',
          'Only do this if starting the walk by 09:30 at the latest (home arrival ~18:30)',
        ],
        links: [
          { label: 'Tre Cime loop topo', url: 'https://en.wikipedia.org/wiki/Tre_Cime_di_Lavaredo' },
        ],
        photos: [
          wmPhoto('DreiZinnenHütte.JPG',
                  'Rifugio Locatelli (Drei Zinnen hut) with Tre Cime di Lavaredo',
                  'CC BY-SA 3.0 via Wikimedia Commons'),
          wmPhoto('Dsdas.jpg',
                  'Tre Cime di Lavaredo north face from the plateau',
                  'CC BY 3.0 via Wikimedia Commons'),
        ],
      },
    ],
    meals: [
      {
        time: '07:00–08:00',
        kind: 'breakfast',
        place: 'Cortina hotel',
        waypointRef: 'd5-w0',
        duration_min: 60,
        travel_min: 0,
        travel_mode: 'included',
        travel_note: 'Breakfast is in the hotel, no transfer.',
        note: 'Proper hotel breakfast, lunch is only after the Tre Cime walk (~13:00), so eat well: eggs, cheese, bread, coffee.',
      },
      {
        time: '12:00–13:00',
        kind: 'lunch',
        place: 'Misurina, lakeside café',
        waypointRef: 'd5-w1',
        duration_min: 60,
        travel_min: 5,
        travel_mode: 'walk',
        travel_note: '~2–3 min walk each way from the lake parking to the lakeside cafés.',
        note: 'Proper sit-down lunch today (not to-go): goulash, tortelloni al ragù. Options: Lavaredo, Genziana, Café Mario.',
      },
    ],
    significantStops: [
      { name: 'Lago di Misurina (1,754 m)',   waypointRef: 'd5-w1', duration_min: 0, note: '"Pearl of Cadore"; panorama of Sorapiss & Tre Cime (included in lake walk)' },
      { name: 'Rifugio Auronzo (2,333 m)',    waypointRef: 'd5-w2', duration_min: 0, note: 'Trailhead viewpoint under the Tre Cime north face (included in Tre Cime walk)' },
      // OPTIONAL nearby lakes, tiny detours, big ROI if weather holds.
      {
        name: 'Lago di Antorno (OPTIONAL)',
        waypointRef: 'd5-w1',
        duration_min: 15,
        optional: true,
        note: '2 min detour next to Misurina, smaller, quieter, often the better reflection of Cadini di Misurina.',
        photos: [
          wmPhoto('Lago di Antorno (1).jpg',
                  'Lago di Antorno near Misurina',
                  'CC BY-SA 4.0 via Wikimedia Commons'),
        ],
      },
      {
        name: 'Lago di Landro / Dürrensee (OPTIONAL)',
        waypointRef: 'd5-w0',
        duration_min: 10,
        optional: true,
        note: 'Roadside stop on SS51 between Cortina and Dobbiaco, Cristallo massif mirrored in the lake. Free parking, no walking.',
        photos: [
          wmPhoto('Dürrensee, Dolomite, South Tyrol - 52106015064.jpg',
                  'Dürrensee (Lago di Landro) in the Dolomites',
                  'CC BY-SA 2.0 via Wikimedia Commons'),
        ],
      },
    ],
    overnight: null,
    photos: [
      wmPhoto('Lago di misurina.jpg',
              'Lago di Misurina, "Pearl of Cadore"',
              'GFDL / CC BY-SA 3.0 via Wikimedia Commons'),
      wmPhoto('Dsdas.jpg',
              'Tre Cime di Lavaredo, north face panorama',
              'CC BY 3.0 via Wikimedia Commons'),
      wmPhoto('Tre Cime di Lavaredo 2012 2.jpg',
              'Tre Cime di Lavaredo from the south',
              'CC BY-SA 4.0 via Wikimedia Commons'),
      wmPhoto('DreiZinnenHütte.JPG',
              'Drei Zinnen hut with the Tre Cime behind',
              'CC BY-SA 3.0 via Wikimedia Commons'),
    ],
  },
];

// -----------------------------------------------------------------------------

async function fetchLeg(fromCoords, toCoords, viaCoords = []) {
  const all = [fromCoords, ...viaCoords, toCoords];
  const pts = all.map(([lat, lon]) => `${lon},${lat}`).join(';');
  const url = `http://router.project-osrm.org/route/v1/driving/${pts}?geometries=geojson&overview=full`;
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

/** Manual leg with intermediate [lat, lon] points (toll roads, cable cars, etc.). */
function pathLeg(latLonPoints, meta = {}) {
  return {
    duration_s: meta.duration_min != null ? meta.duration_min * 60 : null,
    distance_m: meta.distance_km != null ? meta.distance_km * 1000 : null,
    geometry: {
      type: 'LineString',
      coordinates: latLonPoints.map(([lat, lon]) => [lon, lat]),
    },
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

/**
 * Apply Russian translations to a deep-cloned English result.
 * Arrays (timeline, activities, stops, photos) match positionally; waypoints
 * match by id. A length mismatch emits a warning so data drift surfaces early.
 */
function applyRu(resultEn, ru) {
  const result = JSON.parse(JSON.stringify(resultEn));
  if (ru.overview) result.overview = ru.overview;

  for (const day of result.days) {
    const rd = ru.days?.[day.day];
    if (!rd) {
      console.warn(`  ⚠ no RU translation for day ${day.day}`);
      continue;
    }
    if (rd.title) day.title = rd.title;
    if (rd.theme) day.theme = rd.theme;
    if (rd.from)  day.from  = rd.from;
    if (rd.to)    day.to    = rd.to;
    if (rd.blurb) day.blurb = rd.blurb;

    if (rd.waypoints) {
      for (const wp of day.waypoints) {
        if (rd.waypoints[wp.id]) wp.label = rd.waypoints[wp.id];
      }
    }

    const translateList = (enList, ruList, label, fields) => {
      if (!ruList) return;
      if (ruList.length !== enList.length) {
        console.warn(`  ⚠ day ${day.day} ${label}: RU has ${ruList.length}, EN has ${enList.length}`);
      }
      const n = Math.min(enList.length, ruList.length);
      for (let i = 0; i < n; i++) {
        for (const f of fields) {
          if (ruList[i][f] !== undefined) enList[i][f] = ruList[i][f];
        }
      }
    };

    translateList(day.timeline, rd.timeline, 'timeline', ['event', 'notes']);
    translateList(day.significantStops, rd.significantStops, 'significantStops', ['name', 'note']);
    if (rd.significantStops && day.significantStops) {
      const ns = Math.min(day.significantStops.length, rd.significantStops.length);
      for (let i = 0; i < ns; i++) {
        const en = day.significantStops[i];
        const ruS = rd.significantStops[i];
        if (ruS.photos && en.photos) {
          const m = Math.min(en.photos.length, ruS.photos.length);
          for (let j = 0; j < m; j++) {
            if (ruS.photos[j].alt) en.photos[j].alt = ruS.photos[j].alt;
          }
        }
      }
    }

    // Meals: translate `place`, `note`, and `travel_note`; also merge link
    // labels / notes one-for-one when provided.
    if (rd.meals && day.meals) {
      translateList(day.meals, rd.meals, 'meals', ['place', 'note', 'travel_note']);
      const n = Math.min(day.meals.length, rd.meals.length);
      for (let i = 0; i < n; i++) {
        const en = day.meals[i];
        const ruM = rd.meals[i];
        if (ruM.links && en.links) {
          const m = Math.min(en.links.length, ruM.links.length);
          for (let j = 0; j < m; j++) {
            if (ruM.links[j].label) en.links[j].label = ruM.links[j].label;
            if (ruM.links[j].note !== undefined) en.links[j].note = ruM.links[j].note;
          }
        }
      }
    }

    if (rd.activities) {
      translateList(day.activities, rd.activities, 'activities',
                    ['name', 'kind', 'summary', 'details']);
      const n = Math.min(day.activities.length, rd.activities.length);
      for (let i = 0; i < n; i++) {
        const en = day.activities[i];
        const ruA = rd.activities[i];
        if (ruA.links && en.links) {
          const m = Math.min(en.links.length, ruA.links.length);
          for (let j = 0; j < m; j++) {
            if (ruA.links[j].label) en.links[j].label = ruA.links[j].label;
            if (ruA.links[j].note !== undefined) en.links[j].note = ruA.links[j].note;
          }
        }
        if (ruA.photos && en.photos) {
          const m = Math.min(en.photos.length, ruA.photos.length);
          for (let j = 0; j < m; j++) {
            if (ruA.photos[j].alt) en.photos[j].alt = ruA.photos[j].alt;
          }
        }
      }
    }

    if (rd.overnight === null) {
      day.overnight = null;
    } else if (rd.overnight && day.overnight) {
      if (rd.overnight.town) day.overnight.town = rd.overnight.town;
      if (rd.overnight.property !== undefined) day.overnight.property = rd.overnight.property;
      if (rd.overnight.note !== undefined) day.overnight.note = rd.overnight.note;
    }

    if (rd.photos && day.photos) {
      const n = Math.min(day.photos.length, rd.photos.length);
      for (let i = 0; i < n; i++) {
        if (rd.photos[i].alt) day.photos[i].alt = rd.photos[i].alt;
      }
    }

    // Stress: only the human-readable `summary` is translated;
    // `level` is a number inherited from EN.
    if (rd.stress && day.stress) {
      if (rd.stress.summary) day.stress.summary = rd.stress.summary;
    }
  }
  return result;
}

async function main() {
  const result = { overview: OVERVIEW_EN, days: [] };
  for (const d of days) {
    const legs = [];
    const manual = manualLegsMap(d.manualLegs);
    const paths = d.manualPaths ?? {};
    const vias  = d.osrmVias ?? {};
    for (let i = 0; i < d.waypoints.length - 1; i++) {
      const from = d.waypoints[i].coords;
      const to   = d.waypoints[i + 1].coords;
      if (manual.has(i)) {
        const meta = manual.get(i);
        if (paths[i]) {
          legs.push(pathLeg(paths[i], meta));
        } else {
          legs.push(straightLeg(from, to, meta));
        }
      } else {
        const via = vias[i] ?? [];
        process.stdout.write(`  day ${d.day} leg ${i}: ${d.waypoints[i].label} → ${d.waypoints[i + 1].label} ... `);
        const leg = await fetchLeg(from, to, via);
        console.log(`${(leg.duration_s / 60).toFixed(1)} min, ${(leg.distance_m / 1000).toFixed(1)} km`);
        legs.push(leg);
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
      region: d.region ?? null,
      city: d.city ?? null,
      postcode: d.postcode ?? null,
      feature: d.feature ?? null,
      overnight: d.overnight,
      waypoints: d.waypoints,
      timeline: d.timeline,
      activities: d.activities,
      meals: d.meals ?? [],
      significantStops: d.significantStops,
      photos: d.photos ?? [],
      blurb: d.blurb ?? null,
      stress: d.stress ?? null,
      legs,
    });
  }

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(OUT_EN, JSON.stringify(result, null, 2));
  console.log(`\nWrote ${OUT_EN}`);

  console.log('Applying Russian translations...');
  const resultRu = applyRu(result, RU);
  await fs.writeFile(OUT_RU, JSON.stringify(resultRu, null, 2));
  console.log(`Wrote ${OUT_RU}`);
}

main().catch(err => { console.error(err); process.exit(1); });
