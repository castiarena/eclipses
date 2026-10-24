import 'i18next'
import type en from './locales/en.json'

// Keys are checked against the English catalog, so `t('a.typo')` fails to compile.
declare module 'i18next' {
  interface CustomTypeOptions {
    resources: { translation: typeof en }
    keySeparator: false
    nsSeparator: false
    returnNull: false
  }
}
