import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { RouteData } from './route.types';
import { Lang } from './language.service';

/**
 * Loads a pre-localized `route.<lang>.json` on demand.
 *
 * The build step (scripts/build-route.mjs) emits one file per language so the
 * runtime never has to walk a bilingual tree — components just render plain
 * strings. Calling `load('ru')` a second time after `load('en')` simply
 * swaps the signal value and the UI reacts via its existing bindings.
 */
@Injectable({ providedIn: 'root' })
export class RouteService {
  private http = inject(HttpClient);
  readonly data = signal<RouteData | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  private currentLang: Lang | null = null;

  async load(lang: Lang): Promise<void> {
    if (this.currentLang === lang && this.data()) return;
    this.currentLang = lang;
    this.loading.set(true);
    this.error.set(null);
    try {
      const data = await firstValueFrom(
        this.http.get<RouteData>(`assets/route.${lang}.json`),
      );
      this.data.set(data);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Failed to load route');
    } finally {
      this.loading.set(false);
    }
  }
}
