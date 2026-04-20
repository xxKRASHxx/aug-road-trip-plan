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
  // Day view
  | 'day.sectionRoute' | 'day.sectionActivities' | 'day.sectionMeals' | 'day.sectionStops' | 'day.sectionOvernight'
  | 'day.stat.driving' | 'day.stat.activities' | 'day.stat.meals' | 'day.stat.total' | 'day.stat.extras'
  | 'day.stat.auxDayLength' | 'day.stat.auxActivities' | 'day.stat.auxMeals' | 'day.stat.auxExtras'
  | 'day.empty.activities' | 'day.empty.meals' | 'day.empty.stops'
  | 'day.timeline.detailed'
  | 'day.overnight.home' | 'day.overnight.bookTbd'
  | 'day.leg.manual'
  | 'day.badge.optional' | 'day.badge.required'
  // Stress level labels
  | 'stress.label' | 'stress.aria'
  | 'stress.1' | 'stress.2' | 'stress.3' | 'stress.4' | 'stress.5'
  // Meal kinds
  | 'meal.breakfast' | 'meal.lunch' | 'meal.dinner' | 'meal.snack' | 'meal.picnic'
  // Meal travel-to-venue chip
  | 'meal.travel.walk' | 'meal.travel.drive' | 'meal.travel.included'
  | 'meal.travel.label' | 'meal.travel.atVenue'
  // Overnights tab
  | 'overnights.heading' | 'overnights.hint' | 'overnights.day5home' | 'overnights.day5note'
  | 'overnights.bookingLink'
  // Map popup
  | 'map.popup.day' | 'map.popup.google' | 'map.popup.apple'
  // Footer
  | 'footer.map' | 'footer.routing'
  // Photo lightbox
  | 'lightbox.close' | 'lightbox.source'
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

  'day.sectionRoute':      { en: 'Route',       ru: 'Маршрут' },
  'day.sectionActivities': { en: 'Activities',  ru: 'Активности' },
  'day.sectionMeals':      { en: 'Meals',       ru: 'Питание' },
  'day.sectionStops':      { en: 'Significant stops / locations',
                             ru: 'Значимые остановки' },
  'day.sectionOvernight':  { en: 'Overnight',   ru: 'Ночёвка' },
  'day.stat.driving':      { en: 'Driving',     ru: 'За рулём' },
  'day.stat.activities':   { en: 'Activities',  ru: 'Активности' },
  'day.stat.meals':        { en: 'Meals',       ru: 'Питание' },
  'day.stat.total':        { en: 'Total',       ru: 'Итого' },
  'day.stat.extras':       { en: 'Optional extras', ru: 'Доп. варианты' },
  'day.stat.auxDayLength': { en: 'day length',  ru: 'длина дня' },
  'day.stat.auxActivities':{ en: 'on foot / lifts / stops',
                             ru: 'пешком, подъёмники, остановки' },
  'day.stat.auxMeals':     { en: 'scheduled breaks',
                             ru: 'плановые приёмы пищи' },
  'day.stat.auxExtras':    { en: 'not included in total',
                             ru: 'не входит в общее время' },
  'day.empty.activities':  { en: 'No planned activities today.',
                             ru: 'На сегодня активностей не запланировано.' },
  'day.empty.meals':       { en: 'No scheduled meal breaks today.',
                             ru: 'Плановых остановок на еду сегодня нет.' },
  'day.empty.stops':       { en: 'No extra significant stops. The route is direct.',
                             ru: 'Дополнительных остановок нет, маршрут прямой.' },
  'day.timeline.detailed': { en: 'Detailed timeline', ru: 'Подробное расписание' },
  'day.overnight.home':    { en: 'Home, no overnight',
                             ru: 'Дом, без ночёвки' },
  'day.overnight.bookTbd': { en: '[ BOOK: TBD ]',
                             ru: '[ БРОНЬ: уточнить ]' },
  'day.leg.manual':        { en: 'toll road / cable car',
                             ru: 'платная дорога / канатная дорога' },
  'day.badge.optional':    { en: 'OPTIONAL',    ru: 'ОПЦИЯ' },
  'day.badge.required':    { en: 'REQUIRED',    ru: 'БАЗОВЫЙ' },

  'stress.label': { en: 'Day intensity',      ru: 'Интенсивность дня' },
  'stress.aria':  { en: 'Day intensity rating', ru: 'Рейтинг интенсивности дня' },
  'stress.1':     { en: 'Relaxed',   ru: 'Расслабленный' },
  'stress.2':     { en: 'Easy',      ru: 'Лёгкий' },
  'stress.3':     { en: 'Moderate',  ru: 'Умеренный' },
  'stress.4':     { en: 'Busy',      ru: 'Насыщенный' },
  'stress.5':     { en: 'Intense',   ru: 'Интенсивный' },

  'meal.breakfast': { en: 'breakfast', ru: 'завтрак' },
  'meal.lunch':     { en: 'lunch',     ru: 'обед' },
  'meal.dinner':    { en: 'dinner',    ru: 'ужин' },
  'meal.snack':     { en: 'snack',     ru: 'перекус' },
  'meal.picnic':    { en: 'picnic',    ru: 'пикник' },

  'meal.travel.walk':     { en: 'walk',      ru: 'пешком' },
  'meal.travel.drive':    { en: 'drive',     ru: 'на авто' },
  'meal.travel.included': { en: 'at venue',  ru: 'на месте' },
  'meal.travel.label':    { en: 'to venue',  ru: 'до места' },
  'meal.travel.atVenue':  { en: 'at venue, no transfer',
                            ru: 'на месте, без переезда' },

  'overnights.heading':     { en: 'Overnight placeholders',
                              ru: 'Ночёвки (заглушки)' },
  'overnights.hint':        { en: 'Fill in [ BOOK: TBD ] once accommodation is confirmed.',
                              ru: 'Замените [ БРОНЬ: уточнить ], когда бронирование подтверждено.' },
  'overnights.day5home':    { en: 'Day 5: Home', ru: 'День 5: Дом' },
  'overnights.day5note':    { en: 'No overnight; return to Klagenfurt.',
                              ru: 'Без ночёвки; возвращение в Клагенфурт.' },
  'overnights.bookingLink': { en: 'Search on Booking.com ↗',
                              ru: 'Искать на Booking.com ↗' },

  'map.popup.day':    { en: 'Day',         ru: 'День' },
  'map.popup.google': { en: 'Google Maps ↗', ru: 'Google Maps ↗' },
  'map.popup.apple':  { en: 'Apple Maps ↗',  ru: 'Apple Maps ↗' },

  'footer.map':     { en: 'Map',     ru: 'Карта' },
  'footer.routing': { en: 'Routing', ru: 'Маршрут' },

  'lightbox.close':  { en: 'Close',           ru: 'Закрыть' },
  'lightbox.source': { en: 'View on Commons', ru: 'Открыть на Commons' },

  'unit.min':          { en: 'min',  ru: 'мин' },
  'unit.hour':         { en: 'h',    ru: 'ч' },
  'unit.km':           { en: 'km',   ru: 'км' },
  'unit.notRoutable':  { en: 'not routable', ru: 'нет маршрута' },
};

export function tr(key: UIKey, lang: Lang): string {
  return UI[key][lang];
}
