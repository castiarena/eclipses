// Guards every catalog against English, so a missing, stale or broken translation fails CI instead of
// shipping. To add a language, see `locales.ts`.

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse, TYPE, type MessageFormatElement } from '@formatjs/icu-messageformat-parser'
import { describe, expect, it } from 'vitest'
import en from './locales/en.json'
import { LOCALES } from './locales'

type Catalog = Record<string, string>

const dir = join(__dirname, 'locales')
const catalogs: Record<string, Catalog> = Object.fromEntries(
  readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => [f.replace(/\.json$/, ''), JSON.parse(readFileSync(join(dir, f), 'utf8'))]),
)

/** The argument names a message uses, e.g. "{n, plural, one {# year} other {# years}}" -> ["n"]. */
function argumentsOf(elements: MessageFormatElement[], out = new Set<string>()): Set<string> {
  for (const el of elements) {
    if ('value' in el && typeof el.value === 'string' && el.type !== TYPE.literal && el.type !== TYPE.pound) out.add(el.value)
    if ('options' in el) for (const option of Object.values(el.options)) argumentsOf(option.value, out)
    if (el.type === TYPE.tag) argumentsOf(el.children, out)
  }
  return out
}

const sorted = (s: Set<string>) => [...s].sort()

// i18next reads these options itself (`lng` switches the language, `count` its own plurals), so a message
// argument with one of these names silently breaks.
const RESERVED = ['lng', 'lngs', 'count', 'context', 'ns', 'defaultValue', 'ordinal', 'replace', 'returnObjects']

describe('catalogs', () => {
  it('has one catalog per locale, and a locale for every catalog', () => {
    expect(Object.keys(catalogs).sort()).toEqual(Object.keys(LOCALES).sort())
  })

  for (const [locale, catalog] of Object.entries(catalogs)) {
    describe(locale, () => {
      it('has exactly the English keys', () => {
        const missing = Object.keys(en).filter((k) => !(k in catalog))
        const stale = Object.keys(catalog).filter((k) => !(k in en))
        expect({ missing, stale }).toEqual({ missing: [], stale: [] })
      })

      it('has valid ICU messages using the same arguments as English', () => {
        for (const [key, message] of Object.entries(catalog)) {
          expect(message.trim(), key).not.toBe('')
          const args = argumentsOf(parse(message))
          expect(sorted(args).filter((a) => RESERVED.includes(a)), key).toEqual([])
          const english = (en as Catalog)[key]
          if (english !== undefined) expect(sorted(args), key).toEqual(sorted(argumentsOf(parse(english))))
        }
      })
    })
  }
})
