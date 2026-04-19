export type WaypointType = 'start' | 'via' | 'viewpoint' | 'activity' | 'overnight';

export interface Waypoint {
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

export interface Day {
  day: number;
  title: string;
  color: string;
  overnight: string | null;
  waypoints: Waypoint[];
  legs: Leg[];
}

export interface RouteData {
  days: Day[];
}
