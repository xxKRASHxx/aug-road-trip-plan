import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { Day, RouteData, WaypointType } from '../route.types';
import { Lang } from '../language.service';
import { UI, UIKey } from '../i18n';

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
  readonly lang = input<Lang>('en');

  readonly viewChange = output<PanelView>();
  readonly focusWaypoint = output<string>();
  readonly langChange = output<Lang>();

  /**
   * Per-item selection key, unique across every clickable sidebar row.
   * Several timeline / activity / stop rows can share the same `waypointRef`
   * (same place, different events), so we highlight by item key rather than
   * by waypoint id to avoid selecting multiple rows at once.
   *
   * Key formats:
   *   wp-<waypointId>            route row for a waypoint
   *   act-<dayNum>-<index>       activity card
   *   stop-<dayNum>-<index>      significant stop
   *   tl-<dayNum>-<index>        timeline entry
   */
  readonly focusedItemKey = signal<string | null>(null);

  constructor() {
    // Map → sidebar: when the outside world focuses a waypoint, mirror that
    // as the route-row highlight (always 1:1, so unique).
    effect(() => {
      const wpId = this.focusedWaypointId();
      this.focusedItemKey.set(wpId ? `wp-${wpId}` : null);
    });
    // View change clears any stale selection.
    effect(() => {
      this.view();
      this.focusedItemKey.set(null);
    });
  }

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

  setLang(l: Lang): void {
    if (l !== this.lang()) this.langChange.emit(l);
  }

  /**
   * Select a sidebar item uniquely AND emit its map-waypoint reference.
   * @param itemKey      unique-per-row key (see `focusedItemKey` doc)
   * @param waypointRef  optional waypoint id to pan the map to
   */
  focusItem(itemKey: string, waypointRef: string | null | undefined): void {
    this.focusedItemKey.set(itemKey);
    if (waypointRef) this.focusWaypoint.emit(waypointRef);
  }

  isFocused(itemKey: string | null | undefined): boolean {
    return !!itemKey && this.focusedItemKey() === itemKey;
  }

  isDayTab(v: PanelView, day: number): boolean {
    return typeof v === 'number' && v === day;
  }

  typeIcon(t: WaypointType): string {
    return TYPE_EMOJI[t];
  }

  t(key: UIKey): string {
    return UI[key][this.lang()];
  }

  fmtMins(m: number): string {
    const l = this.lang();
    const unitMin = UI['unit.min'][l];
    const unitHour = UI['unit.hour'][l];
    const h = Math.floor(m / 60);
    const mm = m % 60;
    if (h === 0) return `${mm} ${unitMin}`;
    return `${h}${unitHour} ${mm.toString().padStart(2, '0')}${unitMin}`;
  }

  fmtLeg(leg: { duration_s: number | null; distance_m: number | null; manual?: boolean } | null): string | null {
    if (!leg) return null;
    const l = this.lang();
    if (leg.manual) return UI['unit.notRoutable'][l];
    const parts: string[] = [];
    if (leg.duration_s != null) parts.push(this.fmtMins(Math.round(leg.duration_s / 60)));
    if (leg.distance_m != null) parts.push(`${(leg.distance_m / 1000).toFixed(1)} ${UI['unit.km'][l]}`);
    return parts.join(' · ');
  }
}
