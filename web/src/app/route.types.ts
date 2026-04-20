export type WaypointType = 'start' | 'via' | 'viewpoint' | 'activity' | 'meal' | 'overnight' | 'end';

export interface Waypoint {
  id: string;
  label: string;
  coords: [number, number]; // [lat, lon]
  type: WaypointType;
  /**
   * Optional shortlinks that resolve to a specific POI in each maps app.
   * - Apple Maps  : https://maps.apple/p/<shortId>   (Share sheet → Copy link)
   * - Google Maps : https://maps.app.goo.gl/<id>     (Share → Copy link)
   * When present, the map popup uses these instead of coord-based search URLs,
   * so the link lands on the real place card (reviews, photos, hours) rather
   * than a generic coordinate pin.
   */
  appleMapsUrl?: string;
  googleMapsUrl?: string;
  /**
   * Optional address components used to disambiguate the map-search query.
   * The popup builds `[feature] ${label}, ${city}, ${postcode}, ${region}`
   * (each piece skipped when empty). Per-waypoint values override the
   * enclosing Day's defaults.
   *
   *   feature  — POI type hint prepended to the label, e.g. "Hotel", "Gasthof",
   *              "Rifugio". Skip when the label already carries it
   *              ("Goldenes Dachl", "Rifugio Auronzo") to avoid duplication.
   *   city     — town / city (e.g. "Innsbruck", "Kaprun").
   *   postcode — postal code (e.g. "6020", "39015").
   *   region   — administrative region / country (e.g. "Tirol, Austria").
   */
  feature?: string;
  city?: string;
  postcode?: string;
  region?: string;
}

export interface Leg {
  duration_s: number | null;
  distance_m: number | null;
  geometry: {
    type: 'LineString';
    coordinates: [number, number][]; // [lon, lat]
  };
  manual?: boolean;
}

export interface TimelineItem {
  time: string;
  event: string;
  notes: string | null;
  waypointRef?: string;
}

/**
 * A hotlinked photo with attribution metadata.
 * `src` is the direct image URL (we use Wikimedia Commons
 * Special:FilePath so any filename resolves to the underlying file).
 * `href` is an optional click-through (usually the Commons file page).
 */
export interface Photo {
  src: string;
  alt: string;
  credit: string;
  href?: string;
}

/** Named external link (official site, tickets, wiki article, etc.). */
export interface LinkRef {
  label: string;
  url: string;
  note?: string;
}

export interface Activity {
  name: string;
  /** Short type label: 'walk', 'hike', 'via ferrata', 'cable car', etc. */
  kind: string;
  waypointRef?: string;
  summary: string;
  details: string[];
  /** Estimated duration in minutes (door-to-door, including approach + return). */
  duration_min: number;
  /**
   * When true, this activity is an OPTIONAL extra (weather plan B, fitness
   * upgrade, or side-trip). The UI renders it with an "OPTIONAL" badge and
   * EXCLUDES its duration from the default day / overview totals — it's
   * surfaced separately in an "optional extras" aux line.
   */
  optional?: boolean;
  links?: LinkRef[];
  photos?: Photo[];
}

export interface SignificantStop {
  name: string;
  waypointRef?: string;
  note?: string;
  /** Estimated dwell time in minutes (photo / lunch / short look). */
  duration_min?: number;
  /** Same semantics as `Activity.optional` — excluded from default totals. */
  optional?: boolean;
}

/** How to reach the restaurant from wherever the meal slot starts. */
export type MealTravelMode = 'walk' | 'drive' | 'included';

/** A scheduled eating break: counts toward the day's total time. */
export interface Meal {
  /** Display time window, e.g. "12:30–13:15". */
  time: string;
  /** Meal type — drives the icon and label in the UI. */
  kind: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'picnic';
  /** Venue or setting, e.g. "Innsbruck old town — Herzog-Friedrich-Straße". */
  place: string;
  waypointRef?: string;
  /** Planned dwell time (at the table) in minutes. */
  duration_min: number;
  /**
   * Round-trip travel time (in minutes) to reach the venue from wherever
   * the meal slot starts — short walk from parking, stroll from the
   * hotel, short drive to a nearby village, etc. Defaults to 0 when the
   * venue IS the current waypoint. Always included in day / meal totals.
   */
  travel_min?: number;
  /** Travel mode — drives the icon (🚶 / 🚗 / ∅). */
  travel_mode?: MealTravelMode;
  /** Short hint about the travel leg ("5 min walk from Congressgarage"). */
  travel_note?: string;
  /** Short hint (dish to try, budget, booking tip). */
  note?: string;
  links?: LinkRef[];
}

export interface Overnight {
  town: string;
  /** null = [ BOOK: TBD ] placeholder */
  property: string | null;
  note: string;
  bookingUrl?: string;
}

/**
 * Editorial lead-in shown at the top of the day view — mirrors the
 * trip overview blurb: a short narrative paragraph, a few "character"
 * facts (toll, pass, highlight, etc., not raw times), and a hint.
 * Facts intentionally complement the stat grid rather than duplicating it.
 */
export interface DayBlurb {
  summary: string;
  facts?: Array<{ label: string; value: string }>;
  hint?: string;
}

/**
 * Subjective "how busy is this day" rating. Rendered as a 5-dot pip
 * badge (●●●○○) with a short label + one-line rationale. This is
 * editorial, not computed from drive/activity minutes — it captures
 * altitude exposure, physical demand, logistics complexity, and time
 * pressure.
 */
export interface DayStress {
  /** 1 = relaxed, 2 = easy, 3 = moderate, 4 = busy, 5 = intense. */
  level: 1 | 2 | 3 | 4 | 5;
  /** One-line rationale (why this level). */
  summary: string;
}

export interface Day {
  day: number;
  title: string;
  theme: string;
  color: string;
  from: string;
  to: string;
  /**
   * Default address components used as the map-search query suffix for every
   * waypoint in this day: `[feature] ${label}, ${city}, ${postcode}, ${region}`.
   * Each is overridable per-waypoint via the same-named fields on `Waypoint`.
   * `region` is the most impactful (kills cross-border ambiguity); `city` and
   * `postcode` sharpen POI resolution inside a region; `feature` is rarely
   * useful at the day level (mixed POI types) but supported for symmetry.
   */
  region?: string;
  city?: string;
  postcode?: string;
  feature?: string;
  overnight: Overnight | null;
  waypoints: Waypoint[];
  legs: Leg[];
  timeline: TimelineItem[];
  activities: Activity[];
  significantStops: SignificantStop[];
  /**
   * Scheduled meals for the day. Always counted toward the total; rendered
   * in their own section between Activities and Significant stops.
   */
  meals?: Meal[];
  /** 3–4 highlight photos for the day (thumbnail grid at the top of the day view). */
  photos?: Photo[];
  blurb?: DayBlurb;
  /** Subjective day intensity rating — rendered as a pip badge in the day header and overview. */
  stress?: DayStress;
}

/** Top-of-overview editorial block — same shape as a day's blurb. */
export interface OverviewBlurb {
  summary: string;
  facts?: Array<{ label: string; value: string }>;
  hint?: string;
}

export interface RouteData {
  days: Day[];
  /**
   * Language-specific editorial intro shown on the Overview tab.
   * Emitted by build-route.mjs; the runtime renders plain strings.
   */
  overview?: OverviewBlurb;
}
