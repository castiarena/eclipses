// One i18next instance for the whole app, the tests and the build scripts. English is bundled and loaded
// synchronously, so pure helpers can call `t` at import time; other catalogs load on demand (`switchLocale`).
// Messages use ICU syntax: `{n, plural, one {# year} other {# years}}`, `{tense, select, past {…} other {…}}`.

import i18next from 'i18next'
import ICU from 'i18next-icu'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import { DEFAULT_LOCALE, LOCALES, type Locale } from './locales'

export const i18n = i18next.createInstance()

i18n
  .use(ICU)
  .use(initReactI18next)
  .init({
    lng: DEFAULT_LOCALE,
    fallbackLng: DEFAULT_LOCALE,
    resources: { [DEFAULT_LOCALE]: { translation: en } },
    initAsync: false,
    // Keys are flat ("status.upcoming"), not nested objects.
    keySeparator: false,
    nsSeparator: false,
    returnNull: false,
  })

export const t = i18n.t.bind(i18n)

export const currentLocale = (): Locale => i18n.language as Locale

/** The BCP 47 tag `Intl` formats the current locale with, e.g. "en-GB". */
export const intlLocale = (): string => LOCALES[currentLocale()].intl

/** Loads a locale's catalog if needed and makes it current. Works in the browser (a lazy chunk) and in Node scripts. */
export async function switchLocale(locale: Locale): Promise<void> {
  if (!i18n.hasResourceBundle(locale, 'translation')) {
    const catalog: { default: typeof en } = await import(`./locales/${locale}.json`)
    i18n.addResourceBundle(locale, 'translation', catalog.default)
  }
  await i18n.changeLanguage(locale)
}
