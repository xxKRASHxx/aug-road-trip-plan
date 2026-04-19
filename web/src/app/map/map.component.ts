import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import * as L from 'leaflet';
import { Day, RouteData, WaypointType } from '../route.types';

// Fix Leaflet default icon pathing when bundled
// (default marker icons reference relative paths that break in bundlers)
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

  private map?: L.Map;
  private layers = new Map<number, L.LayerGroup>();
  private allBounds?: L.LatLngBounds;

  constructor() {
    effect(() => {
      const sel = this.selectedDay();
      if (this.map) this.applySelection(sel);
    });
  }

  ngAfterViewInit(): void {
    const map = L.map(this.mapEl.nativeElement, {
      zoomControl: true,
      attributionControl: true,
    }).setView([47.0, 12.5], 8);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    this.map = map;
    this.buildLayers();
    this.applySelection(this.selectedDay());
  }

  ngOnDestroy(): void {
    this.map?.remove();
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
        const poly = L.polyline(latlngs, {
          color: day.color,
          weight: 4,
          opacity: 0.85,
          dashArray: leg.manual ? '8 8' : undefined,
        });
        poly.addTo(group);
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
        marker.bindPopup(this.popupHtml(day, wp.label, wp.type));
        marker.bindTooltip(`${TYPE_EMOJI[wp.type]} ${wp.label}`, { direction: 'top' });
        marker.addTo(group);
      }

      this.layers.set(day.day, group);
    }

    this.allBounds = L.latLngBounds(allLatLngs);
  }

  private popupHtml(day: Day, label: string, type: WaypointType): string {
    return `
      <div class="wp-popup">
        <div class="wp-day" style="color:${day.color}">Day ${day.day} · ${day.title}</div>
        <div class="wp-label">${TYPE_EMOJI[type]} ${label}</div>
      </div>
    `;
  }

  private applySelection(selected: number): void {
    if (!this.map) return;

    // Remove all, re-add relevant
    for (const [, group] of this.layers) this.map.removeLayer(group);

    if (selected === 0) {
      for (const [, group] of this.layers) group.addTo(this.map);
      if (this.allBounds) this.map.fitBounds(this.allBounds, { padding: [32, 32] });
    } else {
      const group = this.layers.get(selected);
      if (group) {
        group.addTo(this.map);
        const data = this.route();
        const day = data.days.find(d => d.day === selected);
        if (day) {
          const pts: L.LatLng[] = [];
          for (const leg of day.legs) {
            for (const [lon, lat] of leg.geometry.coordinates) pts.push(L.latLng(lat, lon));
          }
          for (const wp of day.waypoints) pts.push(L.latLng(wp.coords[0], wp.coords[1]));
          if (pts.length) this.map.fitBounds(L.latLngBounds(pts), { padding: [40, 40] });
        }
      }
    }
  }
}
