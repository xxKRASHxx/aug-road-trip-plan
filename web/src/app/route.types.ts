export type WaypointType = 'start' | 'via' | 'viewpoint' | 'activity' | 'overnight';

export interface Waypoint {
  id: string;
  label: string;
  coords: [number, number]; // [lat, lon]
  type: WaypointType;
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

export interface Activity {
  name: string;
  /** Short type label: 'walk', 'hike', 'via ferrata', 'cable car', etc. */
  kind: string;
  waypointRef?: string;
  summary: string;
  details: string[];
  /** Estimated duration in minutes (door-to-door, including approach + return). */
  duration_min: number;
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
}

export interface RouteData {
  days: Day[];
}
