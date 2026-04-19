import { Lang } from './language.service';

/**
 * UI-chrome strings (template headings, tab labels, button text, etc.).
 * Data strings (day titles, activity descriptions, etc.) live in
 * `route.<lang>.json` — those are pre-localized at build time.
 *
 * Keep keys in namespaced dot-notation for readability.
 */
export type UIKey =
  // Header
  | 'header.title' | 'header.subtitle'
  // Language toggle
  | 'lang.en' | 'lang.ru' | 'lang.aria'
  // Tabs
  | 'tab.overview' | 'tab.day' | 'tab.overnights'
  // Loading / error states
  | 'state.loading' | 'state.errorTitle'
  // Overview content
  | 'overview.trip' | 'overview.allDays'
  | 'overview.stat.driving' | 'overview.stat.activities' | 'overview.stat.total'
  | 'overview.stat.auxActivities' | 'overview.stat.auxAcross5'
  | 'overview.day.home'
  // Day view
  | 'day.sectionRoute' | 'day.sectionActivities' | 'day.sectionStops' | 'day.sectionOvernight'
  | 'day.stat.driving' | 'day.stat.activities' | 'day.stat.total'
  | 'day.stat.auxDayLength' | 'day.stat.auxActivities'
  | 'day.empty.activities' | 'day.empty.stops'
  | 'day.timeline.detailed'
  | 'day.overnight.home' | 'day.overnight.bookTbd'
  | 'day.leg.manual'
  // Overnights tab
  | 'overnights.heading' | 'overnights.hint' | 'overnights.day5home' | 'overnights.day5note'
  | 'overnights.bookingLink'
  // Map popup
  | 'map.popup.day' | 'map.popup.google' | 'map.popup.apple'
  // Footer
  | 'footer.map' | 'footer.routing'
  // Units
  | 'unit.min' | 'unit.hour' | 'unit.km' | 'unit.notRoutable';

type Phrase = { en: string; ru: string };

export const UI: Record<UIKey, Phrase> = {
  'header.title':    { en: 'Alps trip',
                       ru: 'Поездка по Альпам' },
  'header.subtitle': { en: '5 days · Klagenfurt → Dolomites → Klagenfurt',
                       ru: '5 дней · Клагенфурт → Доломиты → Клагенфурт' },

  'lang.en':   { en: 'EN', ru: 'EN' },
  'lang.ru':   { en: 'RU', ru: 'RU' },
  'lang.aria': { en: 'Interface language', ru: 'Язык интерфейса' },

  'tab.overview':   { en: 'Overview',      ru: 'Обзор' },
  'tab.day':        { en: 'Day',           ru: 'День' },
  'tab.overnights': { en: '🛏 Overnights', ru: '🛏 Ночёвки' },

  'state.loading':    { en: 'Loading route…',        ru: 'Загрузка маршрута…' },
  'state.errorTitle': { en: 'Failed to load route',  ru: 'Не удалось загрузить маршрут' },

  'overview.trip':    { en: 'The trip',  ru: 'О поездке' },
  'overview.allDays': { en: 'All days',  ru: 'Все дни' },
  'overview.stat.driving':       { en: 'Driving',       ru: 'За рулём' },
  'overview.stat.activities':    { en: 'Activities',    ru: 'Активности' },
  'overview.stat.total':         { en: 'Total time',    ru: 'Общее время' },
  'overview.stat.auxActivities': { en: 'on foot / lifts / stops',
                                   ru: 'пешком, подъёмники, остановки' },
  'overview.stat.auxAcross5':    { en: 'across 5 days', ru: 'за 5 дней' },
  'overview.day.home':           { en: '🏠 Home',       ru: '🏠 Домой' },

  'day.sectionRoute':      { en: 'Route',       ru: 'Маршрут' },
  'day.sectionActivities': { en: 'Activities',  ru: 'Активности' },
  'day.sectionStops':      { en: 'Significant stops / locations',
                             ru: 'Значимые остановки' },
  'day.sectionOvernight':  { en: 'Overnight',   ru: 'Ночёвка' },
  'day.stat.driving':      { en: 'Driving',     ru: 'За рулём' },
  'day.stat.activities':   { en: 'Activities',  ru: 'Активности' },
  'day.stat.total':        { en: 'Total',       ru: 'Итого' },
  'day.stat.auxDayLength': { en: 'day length',  ru: 'длина дня' },
  'day.stat.auxActivities':{ en: 'on foot / lifts / stops',
                             ru: 'пешком, подъёмники, остановки' },
  'day.empty.activities':  { en: 'No planned activities today.',
                             ru: 'На сегодня активностей не запланировано.' },
  'day.empty.stops':       { en: 'No extra significant stops — route is direct.',
                             ru: 'Дополнительных остановок нет — маршрут прямой.' },
  'day.timeline.detailed': { en: 'Detailed timeline', ru: 'Подробное расписание' },
  'day.overnight.home':    { en: 'Home — no overnight',
                             ru: 'Дом — без ночёвки' },
  'day.overnight.bookTbd': { en: '[ BOOK: TBD ]',
                             ru: '[ БРОНЬ: уточнить ]' },
  'day.leg.manual':        { en: 'toll road / cable car',
                             ru: 'платная дорога / канатная дорога' },

  'overnights.heading':     { en: 'Overnight placeholders',
                              ru: 'Ночёвки (заглушки)' },
  'overnights.hint':        { en: 'Fill in [ BOOK: TBD ] once accommodation is confirmed.',
                              ru: 'Замените [ БРОНЬ: уточнить ], когда бронирование подтверждено.' },
  'overnights.day5home':    { en: 'Day 5 — Home', ru: 'День 5 — Дом' },
  'overnights.day5note':    { en: 'No overnight; return to Klagenfurt.',
                              ru: 'Без ночёвки; возвращение в Клагенфурт.' },
  'overnights.bookingLink': { en: 'Search on Booking.com ↗',
                              ru: 'Искать на Booking.com ↗' },

  'map.popup.day':    { en: 'Day',         ru: 'День' },
  'map.popup.google': { en: 'Google Maps ↗', ru: 'Google Maps ↗' },
  'map.popup.apple':  { en: 'Apple Maps ↗',  ru: 'Apple Maps ↗' },

  'footer.map':     { en: 'Map',     ru: 'Карта' },
  'footer.routing': { en: 'Routing', ru: 'Маршрут' },

  'unit.min':          { en: 'min',  ru: 'мин' },
  'unit.hour':         { en: 'h',    ru: 'ч' },
  'unit.km':           { en: 'km',   ru: 'км' },
  'unit.notRoutable':  { en: 'not routable', ru: 'нет маршрута' },
};

export function tr(key: UIKey, lang: Lang): string {
  return UI[key][lang];
}
