// Builds the local eclipse dataset from NASA GSFC catalogs (Espenak & Meeus).
// Run with: pnpm data:build
//
// Output:
//   src/data/eclipses.json      index of upcoming eclipses (no geometry)
//   src/data/geo/<id>.json      visibility geometry, loaded per eclipse
//
// Sources:
//   Solar catalog  https://eclipse.gsfc.nasa.gov/SEcat5/SE2001-2100.html
//   Lunar catalog  https://eclipse.gsfc.nasa.gov/LEcat5/LE2001-2100.html
//   Solar paths    https://eclipse.gsfc.nasa.gov/SEpath/SEpath2001/SE<date><T|A|H>path.html

import { mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA_DIR = join(ROOT, 'src', 'data')
const GEO_DIR = join(DATA_DIR, 'geo')

const SCHEMA_VERSION = 1
const WINDOW_YEARS = 10
const BASE = 'https://eclipse.gsfc.nasa.gov'
const SOLAR_CATALOG = `${BASE}/SEcat5/SE2001-2100.html`
const LUNAR_CATALOG = `${BASE}/LEcat5/LE2001-2100.html`

// Sub-lunar point drifts westward ~14.5 deg/hour (Earth rotation minus the Moon's own motion).
// Used to move the lunar "Moon is up" cap across the penumbral event.
const MOON_DEG_PER_HOUR = 14.49
const GRID_STEP = 3 // degrees between lunar visibility grid points

type EclipseType = 'solar' | 'lunar'
type Kind = 'total' | 'annular' | 'hybrid' | 'partial' | 'penumbral'

interface Eclipse {
  id: string
  type: EclipseType
  kind: Kind
  peakUtc: string
  magnitude: number
  gamma: number
  saros: number
  durationSec: number | null
  hasGeometry: boolean
}

interface LatLon {
  lat: number
  lon: number
}

interface Candidate {
  eclipse: Eclipse
  zenith: LatLon | null // lunar: sub-lunar point at greatest eclipse
  halfPenumbralHours: number // lunar: half of penumbral duration
  pathUrl: string | null // solar: path table page
}

const MONTHS: Record<string, number> = {
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
  Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
}

// Trailing columns (central lat/lon, sun altitude, path width, duration) vary by
// eclipse type: partial eclipses have no path, so they are split and checked separately.
const SOLAR_ROW =
  /^\s*\d{5}\s+(?<year>\d{4}) (?<mon>[A-Z][a-z]{2}) (?<day>\d{2})\s+(?<time>\d{2}:\d{2}:\d{2})\s+(?<dT>\d+)\s+\d+\s+(?<saros>\d+)\s+(?<type>\S+)\s+\S+\s+(?<gamma>-?[\d.]+)\s+(?<mag>[\d.]+)(?<rest>(?:\s+\S+)+)\s*$/

// Columns: date, time, ΔT, Luna#, Saros, type, flags, gamma, penumbral mag, umbral mag,
// penumbral dur (min), partial dur (min), total dur (min), Moon zenith lat, Moon zenith lon
const LUNAR_ROW =
  /^\s*\d{5}\s+(?<year>\d{4}) (?<mon>[A-Z][a-z]{2}) (?<day>\d{2})\s+(?<time>\d{2}:\d{2}:\d{2})\s+(?<dT>\d+)\s+\d+\s+(?<saros>\d+)\s+(?<type>\S+)\s+\S+\s+(?<gamma>-?[\d.]+)\s+(?<penMag>[\d.]+)\s+(?<umbMag>-?[\d.]+)\s+(?<penDur>\S+)\s+\S+\s+(?<totDur>\S+)\s+(?<zenLat>\S+)\s+(?<zenLon>\S+)\s*$/

// Matches a "75 56.2N 108 45.5E" coordinate pair from the path tables.
const PATH_COORD = /(\d{1,2}) (\d{2}\.\d)([NS]) (\d{1,3}) (\d{2}\.\d)([EW])/g

async function fetchText(url: string): Promise<string | null> {
  const res = await fetch(url)
  if (!res.ok) return null
  return res.text()
}

// Catalog rows wrap dates and numbers in <a> links; keep only the text.
function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '')
}

function peakUtcIso(year: string, mon: string, day: string, time: string, deltaT: number): string {
  const [hh, mm, ss] = time.split(':').map(Number)
  const terrestrial = Date.UTC(Number(year), MONTHS[mon] - 1, Number(day), hh, mm, ss)
  return new Date(terrestrial - deltaT * 1000).toISOString().replace('.000Z', 'Z')
}

function parseDeg(token: string): LatLon | null {
  // e.g. "6N" -> lat 6, "171W" -> lon -171
  const m = token.match(/^(\d+(?:\.\d+)?)([NSEW])$/)
  if (!m) return null
  const value = Number(m[1]) * (m[2] === 'S' || m[2] === 'W' ? -1 : 1)
  return m[2] === 'N' || m[2] === 'S' ? { lat: value, lon: 0 } : { lat: 0, lon: value }
}

function normLon(lon: number): number {
  return ((((lon + 180) % 360) + 360) % 360) - 180
}

function parseSolarRows(text: string, warnings: string[]): Candidate[] {
  const out: Candidate[] = []
  for (const line of stripTags(text).split('\n')) {
    if (!/^\s*\d{5}\s+\d{4} /.test(line)) continue
    const m = line.match(SOLAR_ROW)
    if (!m) {
      warnings.push(`solar row not parsed: ${line.trim()}`)
      continue
    }
    const g = m.groups as Record<string, string>
    const { year, mon, day, time, dT, saros, type: typeCode, gamma, mag } = g
    const kindMap: Record<string, Kind> = { T: 'total', A: 'annular', H: 'hybrid', P: 'partial' }
    const kind = kindMap[typeCode.charAt(0)]
    if (!kind) continue
    const peakUtc = peakUtcIso(year, mon, day, time, Number(dT))
    const durationToken = g.rest.trim().split(/\s+/).find((t) => /^\d+m\d+s$/.test(t))
    const dur = durationToken?.match(/^(\d+)m(\d+)s$/) ?? null
    const block = 1901 + Math.floor((Number(year) - 1901) / 50) * 50
    const pathUrl =
      kind === 'partial'
        ? null
        : `${BASE}/SEpath/SEpath${block}/SE${year}${mon}${day}${typeCode.charAt(0)}path.html`
    out.push({
      eclipse: {
        id: `${year}-${String(MONTHS[mon]).padStart(2, '0')}-${day}-solar`,
        type: 'solar',
        kind,
        peakUtc,
        magnitude: Number(mag),
        gamma: Number(gamma),
        saros: Number(saros),
        durationSec: dur ? Number(dur[1]) * 60 + Number(dur[2]) : null,
        hasGeometry: false,
      },
      zenith: null,
      halfPenumbralHours: 0,
      pathUrl,
    })
  }
  return out
}

function parseLunarRows(text: string, warnings: string[]): Candidate[] {
  const out: Candidate[] = []
  for (const line of stripTags(text).split('\n')) {
    if (!/^\s*\d{5}\s+\d{4} /.test(line)) continue
    const m = line.match(LUNAR_ROW)
    if (!m) {
      warnings.push(`lunar row not parsed: ${line.trim()}`)
      continue
    }
    const g = m.groups as Record<string, string>
    const { year, mon, day, time, dT, saros, gamma, penMag, umbMag, penDur, totDur, zenLat, zenLon } = g
    const letter = g.type.charAt(0)
    const kind: Kind | undefined =
      letter === 'T' ? 'total' : letter === 'P' ? 'partial' : letter === 'N' ? 'penumbral' : undefined
    if (!kind) continue
    const lat = parseDeg(zenLat)
    const lon = parseDeg(zenLon)
    if (!lat || !lon) {
      warnings.push(`lunar zenith not parsed: ${line.trim()}`)
      continue
    }
    const umbral = kind === 'total' || kind === 'partial'
    out.push({
      eclipse: {
        id: `${year}-${String(MONTHS[mon]).padStart(2, '0')}-${day}-lunar`,
        type: 'lunar',
        kind,
        peakUtc: peakUtcIso(year, mon, day, time, Number(dT)),
        magnitude: Number(umbral ? umbMag : penMag),
        gamma: Number(gamma),
        saros: Number(saros),
        durationSec: kind === 'total' && totDur !== '-' ? Math.round(Number(totDur) * 60) : null,
        hasGeometry: true,
      },
      zenith: { lat: lat.lat, lon: lon.lon },
      halfPenumbralHours: Number(penDur) / 120, // full duration in minutes -> half in hours
      pathUrl: null,
    })
  }
  return out
}

// Parses the central-line table on a solar path page. Each row carries three
// coordinate pairs: northern limit, southern limit, central line.
function parsePathTable(html: string): { north: LatLon[]; south: LatLon[]; central: LatLon[] } {
  const north: LatLon[] = []
  const south: LatLon[] = []
  const central: LatLon[] = []
  for (const line of stripTags(html).split('\n')) {
    if (!/^\s*(\d{2}:\d{2}|Limits)\b/.test(line)) continue
    const pairs = [...line.matchAll(PATH_COORD)]
    if (pairs.length < 3) continue
    const toLatLon = (m: RegExpMatchArray): LatLon => ({
      lat: (Number(m[1]) + Number(m[2]) / 60) * (m[3] === 'S' ? -1 : 1),
      lon: (Number(m[4]) + Number(m[5]) / 60) * (m[6] === 'W' ? -1 : 1),
    })
    north.push(toLatLon(pairs[0]))
    south.push(toLatLon(pairs[1]))
    central.push(toLatLon(pairs[2]))
  }
  return { north, south, central }
}

// Keeps a path continuous across the antimeridian by unwrapping longitudes.
function unwrapLons(points: LatLon[]): LatLon[] {
  const out: LatLon[] = []
  let offset = 0
  points.forEach((p, i) => {
    if (i > 0) {
      const jump = p.lon - points[i - 1].lon
      if (jump > 180) offset -= 360
      else if (jump < -180) offset += 360
    }
    out.push({ lat: p.lat, lon: p.lon + offset })
  })
  return out
}

function solarGeometry(id: string, path: { north: LatLon[]; south: LatLon[]; central: LatLon[] }) {
  const north = unwrapLons(path.north)
  let south = unwrapLons(path.south)
  const central = unwrapLons(path.central)
  // Put the southern limit on the same longitude sheet as the northern one.
  const shift = Math.round((north[0].lon - south[0].lon) / 360) * 360
  south = south.map((p) => ({ lat: p.lat, lon: p.lon + shift }))

  const ring = [...north, ...south.slice().reverse()]
  const polygon = [...ring, ring[0]].map((p) => [Number(normLon(p.lon).toFixed(3)), Number(p.lat.toFixed(3))])
  const line = central.map((p) => [Number(normLon(p.lon).toFixed(3)), Number(p.lat.toFixed(3))])

  return {
    id,
    schemaVersion: SCHEMA_VERSION,
    features: {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', properties: { zone: 'central' }, geometry: { type: 'Polygon', coordinates: [polygon] } },
        { type: 'Feature', properties: { zone: 'centerline' }, geometry: { type: 'LineString', coordinates: line } },
      ],
    },
  }
}

// Angular test: is the Moon above the horizon at this point?
function moonUp(lat: number, lon: number, zenith: LatLon): boolean {
  const toRad = Math.PI / 180
  const cosDist =
    Math.sin(lat * toRad) * Math.sin(zenith.lat * toRad) +
    Math.cos(lat * toRad) * Math.cos(zenith.lat * toRad) * Math.cos((lon - zenith.lon) * toRad)
  return cosDist > 0
}

// Grid of lunar visibility. Zone 2 = Moon up for the whole penumbral event
// (sampled at start and end), zone 1 = Moon up for part of it.
function lunarGeometry(c: Candidate) {
  const zenith = c.zenith as LatLon
  const h = c.halfPenumbralHours
  const start: LatLon = { lat: zenith.lat, lon: normLon(zenith.lon + MOON_DEG_PER_HOUR * h) }
  const end: LatLon = { lat: zenith.lat, lon: normLon(zenith.lon - MOON_DEG_PER_HOUR * h) }

  const points: [number, number, number][] = []
  for (let lat = -90; lat <= 90; lat += GRID_STEP) {
    for (let lon = -180; lon < 180; lon += GRID_STEP) {
      const a = moonUp(lat, lon, start)
      const b = moonUp(lat, lon, end)
      const m = moonUp(lat, lon, zenith)
      if (a && b) points.push([lat, lon, 2])
      else if (a || b || m) points.push([lat, lon, 1])
    }
  }
  return {
    id: c.eclipse.id,
    schemaVersion: SCHEMA_VERSION,
    grid: { step: GRID_STEP, zones: { 1: 'partial', 2: 'full' }, points },
  }
}

function validate(eclipses: Eclipse[], geo: Map<string, unknown>) {
  const errors: string[] = []
  const ids = new Set<string>()
  let prev = ''
  for (const e of eclipses) {
    if (ids.has(e.id)) errors.push(`duplicate id ${e.id}`)
    ids.add(e.id)
    if (prev && e.peakUtc <= prev) errors.push(`peakUtc not ascending at ${e.id}`)
    prev = e.peakUtc
    if (!Number.isFinite(Date.parse(e.peakUtc))) errors.push(`bad peakUtc ${e.id}`)
    if (!Number.isFinite(e.magnitude)) errors.push(`bad magnitude ${e.id}`)
    if (e.hasGeometry && !geo.has(e.id)) errors.push(`missing geometry ${e.id}`)
  }
  for (const [id, g] of geo) {
    const gg = g as { features?: { features: { geometry: { coordinates: unknown } }[] }; grid?: { points: [number, number, number][] } }
    if (gg.grid) {
      for (const [lat, lon, zone] of gg.grid.points) {
        if (lat < -90 || lat > 90 || lon < -180 || lon > 180) errors.push(`grid out of range ${id}`)
        if (zone !== 1 && zone !== 2) errors.push(`grid bad zone ${id}`)
      }
    }
    if (gg.features) {
      const json = JSON.stringify(gg.features)
      const bad = json.match(/-?\d+\.\d+,-?\d+\.\d+/g)?.some((pair) => {
        const [lon, lat] = pair.split(',').map(Number)
        return Math.abs(lon) > 180 || Math.abs(lat) > 90
      })
      if (bad) errors.push(`feature coords out of range ${id}`)
    }
  }
  if (errors.length) throw new Error(`validation failed:\n${errors.join('\n')}`)
}

async function main() {
  const warnings: string[] = []
  const now = Date.now()
  const until = new Date(now)
  until.setUTCFullYear(until.getUTCFullYear() + WINDOW_YEARS)

  console.log('Fetching NASA GSFC catalogs...')
  const [solarHtml, lunarHtml] = await Promise.all([fetchText(SOLAR_CATALOG), fetchText(LUNAR_CATALOG)])
  if (!solarHtml || !lunarHtml) throw new Error('could not fetch NASA catalogs')

  const candidates = [...parseSolarRows(solarHtml, warnings), ...parseLunarRows(lunarHtml, warnings)]
    .filter((c) => {
      const t = Date.parse(c.eclipse.peakUtc)
      return t > now && t <= until.getTime()
    })
    .sort((a, b) => Date.parse(a.eclipse.peakUtc) - Date.parse(b.eclipse.peakUtc))

  await rm(GEO_DIR, { recursive: true, force: true })
  await mkdir(GEO_DIR, { recursive: true })

  const geo = new Map<string, unknown>()
  for (const c of candidates) {
    const e = c.eclipse
    if (e.type === 'lunar') {
      geo.set(e.id, lunarGeometry(c))
      continue
    }
    if (!c.pathUrl) {
      e.hasGeometry = false
      continue
    }
    const html = await fetchText(c.pathUrl)
    const path = html ? parsePathTable(html) : null
    if (!path || path.central.length === 0) {
      warnings.push(`no path table for ${e.id} (${c.pathUrl})`)
      e.hasGeometry = false
      continue
    }
    geo.set(e.id, solarGeometry(e.id, path))
    e.hasGeometry = true
  }

  const eclipses = candidates.map((c) => c.eclipse)
  for (const e of eclipses) {
    if (e.type === 'solar' && e.kind === 'partial') e.hasGeometry = false
  }
  validate(eclipses, geo)

  for (const [id, g] of geo) {
    await writeFile(join(GEO_DIR, `${id}.json`), JSON.stringify(g))
  }

  const index = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date(now).toISOString(),
    window: { from: new Date(now).toISOString(), to: until.toISOString() },
    source: {
      catalog: 'Five Millennium Canon of Solar and Lunar Eclipses (Espenak & Meeus), NASA GSFC',
      solar: SOLAR_CATALOG,
      lunar: LUNAR_CATALOG,
    },
    eclipses,
  }
  await writeFile(join(DATA_DIR, 'eclipses.json'), JSON.stringify(index, null, 2) + '\n')

  const files = (await readdir(GEO_DIR)).length
  const counts = eclipses.reduce<Record<string, number>>((acc, e) => {
    const k = `${e.type}/${e.kind}`
    acc[k] = (acc[k] ?? 0) + 1
    return acc
  }, {})
  console.log(`Wrote ${eclipses.length} eclipses, ${files} geometry files.`)
  console.log('By type:', counts)
  if (warnings.length) console.log('Warnings:\n  ' + warnings.join('\n  '))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
