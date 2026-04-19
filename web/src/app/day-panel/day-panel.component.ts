import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Day, RouteData, WaypointType } from '../route.types';

const TYPE_EMOJI: Record<WaypointType, string> = {
  start: '🚗',
  via: '⟶',
  viewpoint: '👁',
  activity: '⭐',
  overnight: '🛏',
};

@Component({
  selector: 'app-day-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './day-panel.component.html',
  styleUrl: './day-panel.component.scss',
})
export class DayPanelComponent {
  readonly route = input.required<RouteData>();
  readonly selected = input<number>(0);
  readonly selectedChange = output<number>();

  readonly activeDay = computed<Day | null>(() => {
    const sel = this.selected();
    if (sel === 0) return null;
    return this.route().days.find(d => d.day === sel) ?? null;
  });

  readonly overviewStats = computed(() => {
    const days = this.route().days;
    let totalMin = 0;
    let totalKm = 0;
    for (const d of days) {
      for (const leg of d.legs) {
        if (leg.duration_s != null) totalMin += leg.duration_s / 60;
        if (leg.distance_m != null) totalKm += leg.distance_m / 1000;
      }
    }
    return { totalMin: Math.round(totalMin), totalKm: Math.round(totalKm) };
  });

  readonly activeDayStats = computed(() => {
    const d = this.activeDay();
    if (!d) return null;
    let mins = 0, km = 0;
    for (const leg of d.legs) {
      if (leg.duration_s != null) mins += leg.duration_s / 60;
      if (leg.distance_m != null) km += leg.distance_m / 1000;
    }
    return { mins: Math.round(mins), km: Math.round(km) };
  });

  select(day: number): void {
    this.selectedChange.emit(day);
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
}
