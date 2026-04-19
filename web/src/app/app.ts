import { ChangeDetectionStrategy, Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { MapComponent } from './map/map.component';
import { DayPanelComponent, PanelView } from './day-panel/day-panel.component';
import { RouteService } from './route.service';

const SIDEBAR_MIN = 320;
const SIDEBAR_MAX = 900;
const SIDEBAR_DEFAULT = 380;
const SIDEBAR_PRESETS = [380, 560, 760]; // cycle on double-click
const LS_KEY = 'alps-trip.sidebar-width';

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

  readonly view = signal<PanelView>('overview');
  readonly focusedWaypointId = signal<string | null>(null);

  readonly sidebarWidth = signal<number>(SIDEBAR_DEFAULT);
  readonly dragging = signal<boolean>(false);

  readonly sidebarGridTemplate = computed(
    () => `${this.sidebarWidth()}px 6px 1fr`,
  );

  readonly mapSelectedDay = computed<number>(() => {
    const v = this.view();
    return typeof v === 'number' ? v : 0;
  });

  readonly ready = computed(() => !this.loading() && this.route() !== null);

  constructor() {
    effect(() => {
      this.view();
      this.focusedWaypointId.set(null);
    });
  }

  ngOnInit(): void {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const n = parseInt(raw, 10);
        if (Number.isFinite(n)) this.sidebarWidth.set(this.clamp(n));
      }
    } catch {
      // localStorage may be unavailable (private mode) — keep default
    }
    void this.routeSvc.load();
  }

  onViewChange(v: PanelView): void {
    this.view.set(v);
  }

  onFocusWaypoint(id: string): void {
    const data = this.route();
    if (data) {
      const owning = data.days.find(d => d.waypoints.some(w => w.id === id));
      if (owning && this.view() !== owning.day) {
        this.view.set(owning.day);
      }
    }
    this.focusedWaypointId.set(id);
  }

  /** Begin drag-resizing the sidebar width. */
  onSplitterPointerDown(ev: PointerEvent): void {
    if (ev.button !== 0) return;
    ev.preventDefault();
    const startX = ev.clientX;
    const startW = this.sidebarWidth();
    this.dragging.set(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMove = (e: PointerEvent) => {
      this.sidebarWidth.set(this.clamp(startW + (e.clientX - startX)));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      this.dragging.set(false);
      this.persistWidth();
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  /** Double-click the splitter to cycle through preset widths. */
  onSplitterDblClick(): void {
    const current = this.sidebarWidth();
    const next = SIDEBAR_PRESETS.find(p => p > current) ?? SIDEBAR_PRESETS[0];
    this.sidebarWidth.set(next);
    this.persistWidth();
  }

  private clamp(n: number): number {
    return Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, Math.round(n)));
  }

  private persistWidth(): void {
    try {
      localStorage.setItem(LS_KEY, String(this.sidebarWidth()));
    } catch {
      // ignore
    }
  }
}
