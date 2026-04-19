import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { MapComponent } from './map/map.component';
import { DayPanelComponent } from './day-panel/day-panel.component';
import { RouteService } from './route.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [MapComponent, DayPanelComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App implements OnInit {
  private routeSvc = inject(RouteService);

  readonly route = this.routeSvc.data;
  readonly loading = this.routeSvc.loading;
  readonly error = this.routeSvc.error;

  readonly selectedDay = signal(0);

  readonly ready = computed(() => !this.loading() && this.route() !== null);

  ngOnInit(): void {
    void this.routeSvc.load();
  }

  onSelectionChange(day: number): void {
    this.selectedDay.set(day);
  }
}
