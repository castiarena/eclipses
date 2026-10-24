// The languages the site is published in. Adding one is a line here plus `locales/<code>.json`
// (copy en.json and translate it); `pnpm test` checks the new catalog against English.

export const LOCALES = {
  // Dates are written the British way ("Saturday, 20 February 2027") to match the design.
  en: { label: 'English', intl: 'en-GB' },
} as const

export type Locale = keyof typeof LOCALES

/** Served at the site root; every other locale lives under `/<code>/`. */
export const DEFAULT_LOCALE: Locale = 'en'

export const isLocale = (code: string): code is Locale => Object.hasOwn(LOCALES, code)
