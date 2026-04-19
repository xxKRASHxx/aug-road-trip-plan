import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  input,
  OnDestroy,
  output,
  ViewChild,
} from '@angular/core';
import * as L from 'leaflet';
import { Day, RouteData, Waypoint, WaypointType } from '../route.types';
import { Lang } from '../language.service';
import { UI } from '../i18n';

// Fix Leaflet default icon pathing when bundled
type DefaultIconProto = L.Icon.Default & { _getIconUrl?: unknown };
delete (L.Icon.Default.prototype as DefaultIconProto)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const TYPE_EMOJI: Record<WaypointType, string> = {
  start: '🚗',
  via: '⟶',
  viewpoint: '👁',
  activity: '⭐',
  overnight: '🛏',
};

interface MarkerEntry {
  day: Day;
  waypoint: Waypoint;
  marker: L.CircleMarker;
}

@Component({
  selector: 'app-map',
  standalone: true,
  template: `<div #mapEl class="leaflet-map"></div>`,
  styles: [`
    :host { display: block; width: 100%; height: 100%; }
    .leaflet-map { width: 100%; height: 100%; background: #1a1a1a; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapEl', { static: true }) mapEl!: ElementRef<HTMLDivElement>;

  /** Full route data */
  readonly route = input.required<RouteData>();
  /** 0 = overview (all days), 1..5 = focus that day */
  readonly selectedDay = input<number>(0);
  /** Waypoint id that should be centered and popped open. */
  readonly focusedWaypointId = input<string | null>(null);
  /** Current UI language — popup labels re-bind when this changes. */
  readonly lang = input<Lang>('en');

  readonly waypointClicked = output<string>();

  private map?: L.Map;
  private dayLayers = new Map<number, L.LayerGroup>();
  private markerIndex = new Map<string, MarkerEntry>();
  private allBounds?: L.LatLngBounds;
  private resizeObserver?: ResizeObserver;

  constructor() {
    effect(() => {
      const sel = this.selectedDay();
      if (this.map) this.applySelection(sel);
    });
    effect(() => {
      const id = this.focusedWaypointId();
      if (this.map && id) this.focusMarker(id);
    });
    // When language changes, the entire route signal is swapped out by
    // RouteService (different JSON file). Rebuild all layers/markers/popups
    // so labels and popup chrome pick up the new strings.
    effect(() => {
      this.route();
      this.lang();
      if (this.map) this.rebuildLayers();
    });
  }

  ngAfterViewInit(): void {
    const map = L.map(this.mapEl.nativeElement, {
      zoomControl: true,
      attributionControl: true,
    }).setView([47.0, 12.5], 8);

    // CartoDB "Dark Matter" — OpenStreetMap data rendered in a dark palette.
    // Free to use with attribution; retina-friendly via {r}.
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · © <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    this.map = map;
    this.buildLayers();

    // Leaflet measures its container size on init; if the container hasn't been
    // laid out yet (common when the map mounts inside a grid/flex shell after an
    // async data load), the initial measurement is wrong and fitBounds zooms to
    // the wrong level. Defer + invalidate before fitting.
    requestAnimationFrame(() => {
      map.invalidateSize();
      this.applySelection(this.selectedDay());
      const initialFocus = this.focusedWaypointId();
      if (initialFocus) this.focusMarker(initialFocus);
    });

    // Keep the map sized correctly when the sidebar layout changes.
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => map.invalidateSize());
      this.resizeObserver.observe(this.mapEl.nativeElement);
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.map?.remove();
  }

  /** Tear down all existing layers/markers then rebuild from current data. */
  private rebuildLayers(): void {
    if (!this.map) return;
    for (const [, group] of this.dayLayers) {
      this.map.removeLayer(group);
      group.clearLayers();
    }
    this.dayLayers.clear();
    this.markerIndex.clear();
    this.buildLayers();
    this.applySelection(this.selectedDay());
    const initialFocus = this.focusedWaypointId();
    if (initialFocus) this.focusMarker(initialFocus);
  }

  private buildLayers(): void {
    if (!this.map) return;
    const data = this.route();
    const allLatLngs: L.LatLng[] = [];

    for (const day of data.days) {
      const group = L.layerGroup();

      for (const leg of day.legs) {
        const latlngs = leg.geometry.coordinates.map(([lon, lat]) => L.latLng(lat, lon));
        allLatLngs.push(...latlngs);
        L.polyline(latlngs, {
          color: day.color,
          weight: 4,
          opacity: 0.85,
          dashArray: leg.manual ? '8 8' : undefined,
        }).addTo(group);
      }

      for (const wp of day.waypoints) {
        const [lat, lon] = wp.coords;
        allLatLngs.push(L.latLng(lat, lon));
        const marker = L.circleMarker([lat, lon], {
          radius: wp.type === 'overnight' ? 9 : 7,
          color: '#ffffff',
          weight: 2,
          fillColor: day.color,
          fillOpacity: 0.95,
        });
        marker.bindPopup(this.popupHtml(day, wp));
        marker.bindTooltip(`${TYPE_EMOJI[wp.type]} ${wp.label}`, { direction: 'top' });
        marker.on('click', () => this.waypointClicked.emit(wp.id));
        marker.addTo(group);
        this.markerIndex.set(wp.id, { day, waypoint: wp, marker });
      }

      this.dayLayers.set(day.day, group);
    }

    this.allBounds = L.latLngBounds(allLatLngs);
  }

  /**
   * Turn a waypoint label into a clean place name suitable for a maps search query.
   * Strips trip-context annotations like "(start)", "(overnight)" and collapses whitespace.
   */
  private searchName(label: string): string {
    return label
      .replace(/\s*\((?:start|overnight|home)\)\s*/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private popupHtml(day: Day, wp: Waypoint): string {
    const [lat, lon] = wp.coords;
    const name = this.searchName(wp.label);
    const encName = encodeURIComponent(name);
    // Prefer per-waypoint POI shortlinks when provided (they land on the real
    // place card in each app). Fall back to name + coordinate search URLs
    // which work for any waypoint but point to a generic pin.
    const gmaps = wp.googleMapsUrl
      ?? `https://www.google.com/maps/search/?api=1&query=${encName}%20${lat},${lon}`;
    const amaps = wp.appleMapsUrl
      ?? `https://maps.apple.com/?q=${encName}&ll=${lat},${lon}`;
    const l = this.lang();
    const dayLabel = UI['map.popup.day'][l];
    const gLabel = UI['map.popup.google'][l];
    const aLabel = UI['map.popup.apple'][l];
    return `
      <div class="wp-popup">
        <div class="wp-day" style="color:${day.color}">${dayLabel} ${day.day} · ${this.escapeHtml(day.title)}</div>
        <div class="wp-label">${TYPE_EMOJI[wp.type]} ${this.escapeHtml(wp.label)}</div>
        <div class="wp-coords">${lat.toFixed(4)}, ${lon.toFixed(4)}</div>
        <div class="wp-links">
          <a href="${gmaps}" target="_blank" rel="noopener">${gLabel}</a>
          <a href="${amaps}" target="_blank" rel="noopener">${aLabel}</a>
        </div>
      </div>
    `;
  }

  private escapeHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private applySelection(selected: number): void {
    if (!this.map) return;
    const map = this.map;

    for (const [, group] of this.dayLayers) map.removeLayer(group);

    // Re-measure before fitting — guards against stale layout after tab switch.
    map.invalidateSize();

    if (selected === 0) {
      for (const [, group] of this.dayLayers) group.addTo(map);
      if (this.allBounds) map.fitBounds(this.allBounds, { padding: [32, 32] });
      return;
    }

    const group = this.dayLayers.get(selected);
    if (!group) return;
    group.addTo(map);

    const day = this.route().days.find(d => d.day === selected);
    if (!day) return;

    const pts: L.LatLng[] = [];
    for (const leg of day.legs) {
      for (const [lon, lat] of leg.geometry.coordinates) pts.push(L.latLng(lat, lon));
    }
    for (const wp of day.waypoints) pts.push(L.latLng(wp.coords[0], wp.coords[1]));
    if (pts.length) map.fitBounds(L.latLngBounds(pts), { padding: [40, 40] });
  }

  private focusMarker(id: string): void {
    const entry = this.markerIndex.get(id);
    if (!this.map || !entry) return;

    // Make sure the day layer is visible
    const group = this.dayLayers.get(entry.day.day);
    if (group && !this.map.hasLayer(group)) group.addTo(this.map);

    const [lat, lon] = entry.waypoint.coords;
    this.map.setView([lat, lon], Math.max(this.map.getZoom(), 11), { animate: true });
    entry.marker.openPopup();
  }
}
