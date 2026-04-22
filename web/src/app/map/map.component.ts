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
  meal: '🍽',
  overnight: '🛏',
  end: '🏠',
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
  // Basemap + overlay tile layers + the Leaflet layers-control that toggles
  // them. Persisted so we can rebuild the control (with freshly translated
  // labels) when the UI language changes without tearing down the tiles
  // themselves.
  private darkBasemap?: L.TileLayer;
  private topoBasemap?: L.TileLayer;
  private hillshadeOverlay?: L.TileLayer;
  private layersControl?: L.Control.Layers;

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
    // so labels and popup chrome pick up the new strings. Also rebuild the
    // layers-control so its labels ("Dark" / "Topographic" / "Hillshade")
    // pick up the new translation — Leaflet doesn't support live relabeling.
    effect(() => {
      this.route();
      this.lang();
      if (this.map) {
        this.rebuildLayers();
        this.rebuildLayersControl();
      }
    });
  }

  ngAfterViewInit(): void {
    const map = L.map(this.mapEl.nativeElement, {
      zoomControl: true,
      attributionControl: true,
    }).setView([47.0, 12.5], 8);

    // --- Basemap layers ----------------------------------------------------
    // Dark: CartoDB "Dark Matter" — OSM data in a dark palette. Matches the
    // app chrome; default on load. Free, no API key.
    this.darkBasemap = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      {
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · © <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      },
    );
    // Topographic: OpenTopoMap — OSM data with SRTM contour lines and
    // hillshading baked in. Great for reading Alpine passes and ridges.
    // Free, fair-use; tile usage policy applies.
    this.topoBasemap = L.tileLayer(
      'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      {
        attribution:
          'Map data: © <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors, ' +
          '<a href="http://viewfinderpanoramas.org">SRTM</a> | ' +
          'Style: © <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
        subdomains: 'abc',
        maxZoom: 17,
      },
    );
    // Hillshade OVERLAY: Esri World Hillshade — grayscale relief. Added on top
    // of any basemap to hint elevation without breaking the basemap palette.
    // Free, no API key. maxZoom 16 — Leaflet silently stops requesting above.
    this.hillshadeOverlay = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Hillshade © <a href="https://www.esri.com/">Esri</a>',
        opacity: 0.35,
        maxZoom: 16,
      },
    );

    this.darkBasemap.addTo(map);

    this.map = map;
    this.rebuildLayersControl();
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

  /**
   * (Re)create the top-right layers-control with labels in the current UI
   * language. Leaflet's control has no live-rename API, so on lang change we
   * remove the old control and build a fresh one against the same tile-layer
   * instances — the basemap currently on the map stays active.
   */
  private rebuildLayersControl(): void {
    if (!this.map || !this.darkBasemap || !this.topoBasemap || !this.hillshadeOverlay) return;
    this.layersControl?.remove();
    const l = this.lang();
    this.layersControl = L.control.layers(
      {
        [UI['map.layer.dark'][l]]: this.darkBasemap,
        [UI['map.layer.topo'][l]]: this.topoBasemap,
      },
      {
        [UI['map.layer.hillshade'][l]]: this.hillshadeOverlay,
      },
      { position: 'topright', collapsed: true },
    ).addTo(this.map);
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
          radius: wp.type === 'overnight' || wp.type === 'end' || wp.type === 'start' ? 9 : 7,
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
   * Turn a waypoint label into a clean place name suitable for a maps search
   * query. We aggressively strip trip-context annotations because both Google
   * and Apple Maps' text search resolves to a real place card only when the
   * input is an actual name — any trailing clause ("— fuel stop", altitude
   * notes, etc.) degrades the result to a generic pin.
   *
   * Stripped:
   *   • trip markers:    "(start)", "(overnight)", "(home)"
   *   • trailing note:   " — …"  or  " - …"   (em-/en-dash with a space around)
   *   • altitude parens: "(2,504 m)", "(1,494 m)"  — only pure-altitude
   *                      parentheticals; disambiguators like "(Jaufenpass,
   *                      2,094 m)" are preserved because the word content
   *                      helps the search land on the right POI.
   */
  private searchName(label: string): string {
    return label
      .replace(/\s*\((?:start|overnight|home)\)\s*/gi, ' ')
      // drop any " — trailing note" or " - trailing note" (em/en dash + space)
      .replace(/\s+[—–-]\s+.+$/u, '')
      // drop pure altitude parens: (2,504 m) / (1494 m) / (2 094 m)
      .replace(/\s*\(\s*[\d,.\s]+\s*m\s*\)\s*/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Compose the maps-app search query from structured address components:
   *   `[feature] ${name}, ${city}, ${postcode}, ${region}`
   *
   * Each component is optional and resolves per-waypoint first, then day-level.
   * Missing pieces are dropped cleanly (no stray commas). The goal is to hand
   * Google / Apple an address-like string so the ranker stops resolving
   * ambiguous proper nouns ("Sölden", "Hochtor", "Edelweiss") to same-named
   * places elsewhere in the world.
   */
  private buildSearchQuery(day: Day, wp: Waypoint): string {
    const name = this.searchName(wp.label);
    const feature  = wp.feature  ?? day.feature;
    const city     = wp.city     ?? day.city;
    const postcode = wp.postcode ?? day.postcode;
    const region   = wp.region   ?? day.region;

    const head = feature ? `${feature} ${name}` : name;
    const tail = [city, postcode, region].filter(Boolean).join(', ');
    return tail ? `${head}, ${tail}` : head;
  }

  private popupHtml(day: Day, wp: Waypoint): string {
    const [lat, lon] = wp.coords;
    const query = this.buildSearchQuery(day, wp);
    const encQ = encodeURIComponent(query);
    // Prefer per-waypoint Share links (`googleMapsUrl` / `appleMapsUrl`) — they
    // open the exact POI. Fallbacks are **text search only** (no lat/lon in the
    // URL): both apps treat `q` / `query` as a maps search toward a place card.
    // `buildSearchQuery()` must be specific enough (city, postcode, region) to
    // disambiguate. If a stop still resolves wrong, paste app-specific place
    // URLs on that waypoint.
    const gmaps = wp.googleMapsUrl
      ?? `https://www.google.com/maps/search/?api=1&query=${encQ}`;
    const amaps = wp.appleMapsUrl
      ?? `https://maps.apple.com/?q=${encQ}`;
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
