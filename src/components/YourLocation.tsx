import { Box, Button, IconButton, Text } from '@chakra-ui/react'
import { useMemo, useState, type FC } from 'react'
import type { EclipseGeometry, EclipseKind, EclipseSummary } from '../data/types'
import type { Tense } from '../globe/describe'
import { locationVerdict, type LocationVerdict } from '../globe/distance'
import type { Point } from '../globe/visibility'
import { formatKm } from './format'

type Status =
  | { kind: 'idle' }
  | { kind: 'locating' }
  | { kind: 'error'; message: string }
  | { kind: 'done'; position: Point }

const UNKNOWN = 'The map cannot tell for this location.'
const NO_MAP = 'There is no visibility map for this eclipse.'

/** Within this distance of the centre line, a distance would be noise. */
const ON_CENTRE_KM = 10

const PATH_NAME: Partial<Record<EclipseKind, string>> = {
  total: 'totality',
  annular: 'annularity',
  hybrid: 'totality or annularity',
}

const LUNAR: Record<Tense, Record<'whole' | 'part' | 'not-visible', string>> = {
  future: {
    whole: 'The Moon is up for the whole eclipse from your location.',
    part: 'The Moon is up for part of the eclipse from your location.',
    'not-visible': 'The Moon is below the horizon from your location.',
  },
  present: {
    whole: 'The Moon is up for the whole eclipse from your location. Look up now.',
    part: 'The Moon is up for part of the eclipse from your location.',
    'not-visible': 'The Moon is below the horizon from your location.',
  },
  past: {
    whole: 'The Moon was up for the whole eclipse from your location.',
    part: 'The Moon was up for part of the eclipse from your location.',
    'not-visible': 'The Moon was below the horizon from your location.',
  },
}

/** What to tell the viewer about the shown eclipse from where they are. */
export function verdictMessage(eclipse: Pick<EclipseSummary, 'type' | 'kind'>, verdict: LocationVerdict, tense: Tense): string {
  const path = `path of ${PATH_NAME[eclipse.kind] ?? 'totality or annularity'}`
  const is = tense === 'past' ? 'was' : 'is'
  switch (verdict.kind) {
    case 'in-path': {
      const centre = verdict.toCentre
      const where = !centre
        ? ''
        : centre.km < ON_CENTRE_KM
          ? ', right by the centre line'
          : `, ${formatKm(centre.km)} from the centre line`
      const now = tense === 'present' ? ', and it is happening now' : ''
      return `Your location ${is} in the ${path}${where}${now}.`
    }
    case 'near-path': {
      const partial =
        tense === 'past' ? 'A partial eclipse was likely visible from here.' : 'A partial eclipse is likely visible from here.'
      return `The ${path} ${is} ${formatKm(verdict.toPath.km)} ${verdict.toPath.direction} of you. ${partial}`
    }
    case 'far-from-path': {
      const partial = tense === 'past' ? 'A partial eclipse may have been visible' : 'A partial eclipse may still be visible'
      return `The ${path} ${is} ${formatKm(verdict.toPath.km)} ${verdict.toPath.direction} of you. ${partial}; partial zones are not mapped.`
    }
    case 'whole':
    case 'part':
    case 'not-visible':
      return LUNAR[tense][verdict.kind]
    case 'unknown':
      return UNKNOWN
    case 'no-map':
      return NO_MAP
  }
}

export interface MyLocation {
  locating: boolean
  /** Where the viewer is, once they shared it. */
  position: Point | null
  /** What they get from the shown eclipse, once its map has loaded. */
  verdict: LocationVerdict | null
  /** What to tell the viewer, if anything. */
  message: string | null
  check: () => void
}

/**
 * Opt-in geolocation. The position is kept, so the answer follows the
 * shown eclipse as the viewer switches type or steps through time.
 * `geometry` must belong to `eclipse`; while it loads there is no answer yet.
 */
export function useMyLocation(
  eclipse: EclipseSummary | undefined,
  geometry: EclipseGeometry | null,
  tense: Tense,
): MyLocation {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  const check = () => {
    if (!navigator.geolocation) {
      setStatus({ kind: 'error', message: 'This browser cannot share its location.' })
      return
    }
    setStatus({ kind: 'locating' })
    navigator.geolocation.getCurrentPosition(
      (pos) => setStatus({ kind: 'done', position: { lat: pos.coords.latitude, lng: pos.coords.longitude } }),
      () => setStatus({ kind: 'error', message: 'Location was not shared, so this check was skipped.' }),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    )
  }

  const position = status.kind === 'done' ? status.position : null
  const verdict = useMemo(() => {
    if (!position || !eclipse) return null
    if (eclipse.hasGeometry && !geometry) return null
    return locationVerdict(eclipse, geometry, position)
  }, [position, eclipse, geometry])

  const message = status.kind === 'error' ? status.message : eclipse && verdict ? verdictMessage(eclipse, verdict, tense) : null

  return { locating: status.kind === 'locating', position, verdict, message, check }
}

const PinIcon: FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </svg>
)

const glass = {
  bg: 'rgba(10, 11, 20, 0.6)',
  backdropFilter: 'blur(10px)',
  border: '1px solid',
  borderColor: 'whiteAlpha.300',
  color: 'white',
  _hover: { bg: 'rgba(30, 32, 48, 0.75)' },
  _active: { bg: 'rgba(40, 42, 60, 0.85)' },
} as const

export const LocationButton: FC<{ location: MyLocation; compact?: boolean }> = ({ location, compact = false }) =>
  compact ? (
    <IconButton
      {...glass}
      aria-label="Check my location"
      icon={<PinIcon size={20} />}
      isRound
      w="44px"
      h="44px"
      isLoading={location.locating}
      onClick={location.check}
    />
  ) : (
    <Button
      {...glass}
      leftIcon={<PinIcon size={16} />}
      borderRadius="full"
      h="44px"
      px={5}
      fontWeight="semibold"
      isLoading={location.locating}
      loadingText="Locating"
      onClick={location.check}
    >
      Check my location
    </Button>
  )

/** The answer to the location check, in a small glass bubble. */
export const LocationMessage: FC<{ location: MyLocation }> = ({ location }) =>
  location.message ? (
    <Box
      role="status"
      maxW="300px"
      px={4}
      py={3}
      bg="rgba(10, 11, 20, 0.75)"
      backdropFilter="blur(10px)"
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="xl"
    >
      <Text fontSize="sm" lineHeight="1.5">
        {location.message}
      </Text>
    </Box>
  ) : null
