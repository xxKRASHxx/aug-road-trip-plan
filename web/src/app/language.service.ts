import { Injectable, signal } from '@angular/core';

export type Lang = 'en' | 'ru';
export const SUPPORTED_LANGS: Lang[] = ['en', 'ru'];

const LS_KEY = 'alps-trip.lang';

/**
 * Current UI language. Single source of truth for the app.
 *
 * - Persisted to localStorage across reloads.
 * - Defaults to English when nothing is stored or the stored value is unknown.
 * - A plain signal so any component/service can `effect` on it.
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  readonly lang = signal<Lang>(this.load());

  private load(): Lang {
    try {
      const v = localStorage.getItem(LS_KEY);
      return v === 'ru' ? 'ru' : 'en';
    } catch {
      return 'en';
    }
  }

  set(l: Lang): void {
    this.lang.set(l);
    try {
      localStorage.setItem(LS_KEY, l);
    } catch {
      // localStorage can be disabled (private mode, embedded iframes); the
      // signal still updates in-memory so the session works.
    }
  }

  /** Pick one side of a bilingual object (used for UI chrome dictionaries). */
  pick<T>(pair: { en: T; ru: T }): T {
    return pair[this.lang()];
  }
}
