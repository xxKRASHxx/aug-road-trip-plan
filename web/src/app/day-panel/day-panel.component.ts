import { ChangeDetectionStrategy, Component, HostListener, computed, effect, input, output, signal } from '@angular/core';
import { Day, DayStress, Meal, MealTravelMode, Photo, RouteData, WaypointType } from '../route.types';
import { Lang } from '../language.service';
import { UI, UIKey } from '../i18n';

const TYPE_EMOJI: Record<WaypointType, string> = {
  start: '🚗',
  via: '⟶',
  viewpoint: '👁',
  activity: '⭐',
  meal: '🍽',
  overnight: '🛏',
  end: '🏠',
};

const MEAL_EMOJI: Record<Meal['kind'], string> = {
  breakfast: '🥐',
  lunch: '🍽',
  dinner: '🍝',
  snack: '🥨',
  picnic: '🧺',
};

const TRAVEL_EMOJI: Record<MealTravelMode, string> = {
  walk: '🚶',
  drive: '🚗',
  included: '📍',
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

  /**
   * In-page lightbox state. When non-null, a full-screen overlay renders the
   * photo at higher resolution with its credit. Set via {@link openPhoto} and
   * cleared by clicking the backdrop, the close button, or pressing Escape.
   */
  readonly lightboxPhoto = signal<Photo | null>(null);

  openPhoto(p: Photo, event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    this.lightboxPhoto.set(p);
  }

  closePhoto(): void {
    this.lightboxPhoto.set(null);
  }

  /**
   * Derive a large-resolution version of a Commons photo URL. Our images are
   * served via Special:FilePath with a `width` query param (default 800);
   * bumping it to 1600 gives a sharp lightbox view on retina displays without
   * reloading a full-quality original. For non-Commons URLs the input is
   * returned unchanged.
   */
  lightboxSrc(p: Photo): string {
    const src = p.src;
    if (/[?&]width=\d+/.test(src)) return src.replace(/([?&]width=)\d+/, '$11600');
    return src;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.lightboxPhoto()) this.closePhoto();
  }

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
    let mealMin = 0;
    let extrasMin = 0;
    for (const d of days) {
      for (const leg of d.legs) {
        if (leg.duration_s != null) driveMin += leg.duration_s / 60;
        if (leg.distance_m != null) totalKm += leg.distance_m / 1000;
      }
      for (const a of d.activities) {
        if (a.optional) extrasMin += a.duration_min ?? 0;
        else activityMin += a.duration_min ?? 0;
      }
      for (const s of d.significantStops) {
        if (s.optional) extrasMin += s.duration_min ?? 0;
        else activityMin += s.duration_min ?? 0;
      }
      for (const m of d.meals ?? []) {
        mealMin += (m.duration_min ?? 0) + (m.travel_min ?? 0);
      }
    }
    return {
      driveMin: Math.round(driveMin),
      activityMin: Math.round(activityMin),
      mealMin: Math.round(mealMin),
      extrasMin: Math.round(extrasMin),
      totalKm: Math.round(totalKm),
    };
  });

  readonly activeDayStats = computed(() => {
    const d = this.activeDay();
    if (!d) return null;
    let driveMin = 0, km = 0, activityMin = 0, mealMin = 0, extrasMin = 0;
    for (const leg of d.legs) {
      if (leg.duration_s != null) driveMin += leg.duration_s / 60;
      if (leg.distance_m != null) km += leg.distance_m / 1000;
    }
    for (const a of d.activities) {
      if (a.optional) extrasMin += a.duration_min ?? 0;
      else activityMin += a.duration_min ?? 0;
    }
    for (const s of d.significantStops) {
      if (s.optional) extrasMin += s.duration_min ?? 0;
      else activityMin += s.duration_min ?? 0;
    }
    for (const m of d.meals ?? []) {
      mealMin += (m.duration_min ?? 0) + (m.travel_min ?? 0);
    }
    return {
      driveMin: Math.round(driveMin),
      activityMin: Math.round(activityMin),
      mealMin: Math.round(mealMin),
      extrasMin: Math.round(extrasMin),
      km: Math.round(km),
    };
  });

  /**
   * Per-day activity minutes for the overview day list.
   * REQUIRED activities + stops only — meals are intentionally EXCLUDED
   * from the overview (they live in the detailed day view).
   */
  activityMinutesFor(d: {
    activities: { duration_min?: number; optional?: boolean }[];
    significantStops: { duration_min?: number; optional?: boolean }[];
  }): number {
    let total = 0;
    for (const a of d.activities) if (!a.optional) total += a.duration_min ?? 0;
    for (const s of d.significantStops) if (!s.optional) total += s.duration_min ?? 0;
    return total;
  }

  /**
   * Display order for activities and significant stops: REQUIRED items
   * first, then OPTIONAL, preserving each group's original authoring order
   * (stable partition, not a full sort). This keeps the "core plan" visually
   * contiguous at the top of each block while still surfacing weather backups
   * and fitness upgrades below.
   */
  orderedActivities<T extends { optional?: boolean }>(items: readonly T[]): T[] {
    const required: T[] = [];
    const optional: T[] = [];
    for (const it of items) (it.optional ? optional : required).push(it);
    return [...required, ...optional];
  }

  /** Per-day driving minutes (used in the overview day list). */
  driveMinutesFor(d: { legs: { duration_s: number | null }[] }): number {
    let total = 0;
    for (const l of d.legs) total += (l.duration_s ?? 0) / 60;
    return Math.round(total);
  }

  /** Localized label for a meal kind ("lunch" / "обед" / ...). */
  mealKindLabel(kind: Meal['kind']): string {
    return UI[`meal.${kind}` as UIKey][this.lang()];
  }

  mealKindIcon(kind: Meal['kind']): string {
    return MEAL_EMOJI[kind];
  }

  /** Emoji for the travel chip — 🚶 / 🚗 / 📍 */
  mealTravelIcon(mode: MealTravelMode | undefined): string {
    return TRAVEL_EMOJI[mode ?? 'included'];
  }

  /** Localized short label for the travel mode. */
  mealTravelModeLabel(mode: MealTravelMode | undefined): string {
    return UI[`meal.travel.${mode ?? 'included'}` as UIKey][this.lang()];
  }

  /** Combined "at-table + transfer" minutes for a meal. */
  mealAllInMin(m: Meal): number {
    return (m.duration_min ?? 0) + (m.travel_min ?? 0);
  }

  /** "●●●○○" pip string for a 1–5 stress level. */
  stressPips(level: DayStress['level']): string {
    return '●'.repeat(level) + '○'.repeat(5 - level);
  }

  /** Localized level name ("Moderate" / "Умеренный" / …). */
  stressLevelLabel(level: DayStress['level']): string {
    return UI[`stress.${level}` as UIKey][this.lang()];
  }

  /** CSS modifier for colour ramping: .lvl-1 … .lvl-5 */
  stressClass(level: DayStress['level']): string {
    return `lvl-${level}`;
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

  /**
   * Compact, approximate formatter used in the stat-grid tiles and the
   * overview day list — favours readability over precision.
   *
   * Rules:
   *   • < 60 min          → "45m"   (floor to nearest 15 min)
   *   • ≥ 60 min          → "1h" / "1.5h" / "2h" …  (floor to nearest 30 min)
   *   • non-trivial excess → suffix "+" meaning "a bit more than this"
   *
   * Examples:
   *   60 → "1h"      75 → "1h+"     90 → "1.5h"
   *  120 → "2h"     195 → "3h+"    300 → "5h"
   *   45 → "45m"     55 → "45m+"    10 → "≤15m"
   */
  fmtRounded(m: number): string {
    const l = this.lang();
    const unitMin = UI['unit.min'][l];
    const unitHour = UI['unit.hour'][l];
    if (m <= 0) return `0${unitMin}`;
    if (m < 60) {
      // Floor to nearest 15 min for < 1h bucket so "45m" / "30m" show cleanly.
      const floored = Math.floor(m / 15) * 15;
      const rem = m - floored;
      if (floored === 0) return `≤15${unitMin}`;
      return rem >= 3 ? `${floored}${unitMin}+` : `${floored}${unitMin}`;
    }
    const halves = Math.floor(m / 30);
    const floored = halves * 30;
    const rem = m - floored;
    const h = halves / 2;
    const hStr = `${h}${unitHour}`;
    return rem >= 5 ? `${hStr}+` : hStr;
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
