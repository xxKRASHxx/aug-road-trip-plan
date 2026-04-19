import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Day, RouteData, WaypointType } from '../route.types';

const TYPE_EMOJI: Record<WaypointType, string> = {
  start: '🚗',
  via: '⟶',
  viewpoint: '👁',
  activity: '⭐',
  overnight: '🛏',
};

/** 'overview' | 'overnights' | day number (1..5) */
export type PanelView = 'overview' | 'overnights' | number;

@Component({
  selector: 'app-day-panel',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './day-panel.component.html',
  styleUrl: './day-panel.component.scss',
})
export class DayPanelComponent {
  readonly route = input.required<RouteData>();
  readonly view = input<PanelView>('overview');
  readonly focusedWaypointId = input<string | null>(null);

  readonly viewChange = output<PanelView>();
  readonly focusWaypoint = output<string>();

  readonly activeDay = computed<Day | null>(() => {
    const v = this.view();
    if (typeof v !== 'number') return null;
    return this.route().days.find(d => d.day === v) ?? null;
  });

  readonly overviewStats = computed(() => {
    const days = this.route().days;
    let driveMin = 0;
    let totalKm = 0;
    let activityMin = 0;
    for (const d of days) {
      for (const leg of d.legs) {
        if (leg.duration_s != null) driveMin += leg.duration_s / 60;
        if (leg.distance_m != null) totalKm += leg.distance_m / 1000;
      }
      for (const a of d.activities) activityMin += a.duration_min ?? 0;
      for (const s of d.significantStops) activityMin += s.duration_min ?? 0;
    }
    return {
      driveMin: Math.round(driveMin),
      activityMin: Math.round(activityMin),
      totalKm: Math.round(totalKm),
    };
  });

  readonly activeDayStats = computed(() => {
    const d = this.activeDay();
    if (!d) return null;
    let driveMin = 0, km = 0, activityMin = 0;
    for (const leg of d.legs) {
      if (leg.duration_s != null) driveMin += leg.duration_s / 60;
      if (leg.distance_m != null) km += leg.distance_m / 1000;
    }
    for (const a of d.activities) activityMin += a.duration_min ?? 0;
    for (const s of d.significantStops) activityMin += s.duration_min ?? 0;
    return {
      driveMin: Math.round(driveMin),
      activityMin: Math.round(activityMin),
      km: Math.round(km),
    };
  });

  /** Per-day activity minutes (used in the overview day list). */
  activityMinutesFor(d: { activities: { duration_min?: number }[]; significantStops: { duration_min?: number }[] }): number {
    let total = 0;
    for (const a of d.activities) total += a.duration_min ?? 0;
    for (const s of d.significantStops) total += s.duration_min ?? 0;
    return total;
  }

  /** Per-day driving minutes (used in the overview day list). */
  driveMinutesFor(d: { legs: { duration_s: number | null }[] }): number {
    let total = 0;
    for (const l of d.legs) total += (l.duration_s ?? 0) / 60;
    return Math.round(total);
  }

  /** Compact route listing for the "Route" section — waypoints + leg stats. */
  readonly activeDayRouteRows = computed(() => {
    const d = this.activeDay();
    if (!d) return [];
    return d.waypoints.map((wp, idx) => ({
      index: idx + 1,
      waypoint: wp,
      legAfter: idx < d.legs.length ? d.legs[idx] : null,
    }));
  });

  setView(v: PanelView): void {
    this.viewChange.emit(v);
  }

  focus(waypointId: string | undefined): void {
    if (waypointId) this.focusWaypoint.emit(waypointId);
  }

  isFocused(waypointId: string | undefined): boolean {
    return !!waypointId && this.focusedWaypointId() === waypointId;
  }

  isDayTab(v: PanelView, day: number): boolean {
    return typeof v === 'number' && v === day;
  }

  typeIcon(t: WaypointType): string {
    return TYPE_EMOJI[t];
  }

  fmtMins(m: number): string {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    if (h === 0) return `${mm} min`;
    return `${h}h ${mm.toString().padStart(2, '0')}min`;
  }

  fmtLeg(leg: { duration_s: number | null; distance_m: number | null; manual?: boolean } | null): string | null {
    if (!leg) return null;
    if (leg.manual) return 'not routable';
    const parts: string[] = [];
    if (leg.duration_s != null) parts.push(this.fmtMins(Math.round(leg.duration_s / 60)));
    if (leg.distance_m != null) parts.push(`${(leg.distance_m / 1000).toFixed(1)} km`);
    return parts.join(' · ');
  }
}
