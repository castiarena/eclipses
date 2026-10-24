// The languages the site is published in. Adding one is a line here plus `locales/<code>.json`
// (copy en.json and translate it); `pnpm test` checks the new catalog against English.
// `intl` is the tag dates and numbers are formatted with; `og` is the Open Graph locale for link previews.

export const LOCALES = {
  // Dates are written the British way ("Saturday, 20 February 2027") to match the design.
  en: { label: 'English', intl: 'en-GB', og: 'en_GB' },
  // Neutral Latin American Spanish, informal "tú".
  es: { label: 'Español', intl: 'es-419', og: 'es_LA' },
} as const

export type Locale = keyof typeof LOCALES

/** Served at the site root; every other locale lives under `/<code>/`. */
export const DEFAULT_LOCALE: Locale = 'en'

export const isLocale = (code: string): code is Locale => Object.hasOwn(LOCALES, code)

export const ALL_LOCALES = Object.keys(LOCALES) as Locale[]
