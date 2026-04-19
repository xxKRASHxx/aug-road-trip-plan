import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { RouteData } from './route.types';

@Injectable({ providedIn: 'root' })
export class RouteService {
  private http = inject(HttpClient);
  readonly data = signal<RouteData | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const data = await firstValueFrom(this.http.get<RouteData>('assets/route.json'));
      this.data.set(data);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Failed to load route');
    } finally {
      this.loading.set(false);
    }
  }
}
