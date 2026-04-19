export type WaypointType = 'start' | 'via' | 'viewpoint' | 'activity' | 'overnight';

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
  links?: LinkRef[];
  photos?: Photo[];
}

export interface SignificantStop {
  name: string;
  waypointRef?: string;
  note?: string;
  /** Estimated dwell time in minutes (photo / lunch / short look). */
  duration_min?: number;
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

export interface Day {
  day: number;
  title: string;
  theme: string;
  color: string;
  from: string;
  to: string;
  overnight: Overnight | null;
  waypoints: Waypoint[];
  legs: Leg[];
  timeline: TimelineItem[];
  activities: Activity[];
  significantStops: SignificantStop[];
  /** 3–4 highlight photos for the day (thumbnail grid at the top of the day view). */
  photos?: Photo[];
  blurb?: DayBlurb;
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
