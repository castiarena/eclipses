import { Box, Button, HStack, IconButton, Stack, Text } from '@chakra-ui/react'
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

type Tone = 'gold' | 'goldSoft' | 'violet' | 'violetSoft' | 'neutral' | 'muted' | 'warn'

const TONE: Record<Tone, { bg: string; color: string }> = {
  gold: { bg: 'solar.path', color: 'space.900' },
  goldSoft: { bg: 'rgba(245, 200, 76, 0.16)', color: 'solar.path' },
  violet: { bg: 'lunar.whole', color: 'space.900' },
  violetSoft: { bg: 'rgba(184, 166, 255, 0.16)', color: 'accent.300' },
  neutral: { bg: 'whiteAlpha.200', color: 'white' },
  muted: { bg: 'whiteAlpha.100', color: 'whiteAlpha.800' },
  warn: { bg: 'rgba(255, 140, 120, 0.14)', color: '#ffb3a6' },
}

export interface AnswerCard {
  badge: string
  tone: Tone
  /** The one line that answers "can I see it": a distance, or what you'll see. */
  title: string
  /** The full sentence (`verdictMessage`). */
  body: string
}

/** The location answer as a card: a verdict badge, one headline line, and the full sentence. */
export function answerCard(eclipse: Pick<EclipseSummary, 'type' | 'kind'>, verdict: LocationVerdict, tense: Tense): AnswerCard {
  const body = verdictMessage(eclipse, verdict, tense)
  const past = tense === 'past'
  const sight = PATH_NAME[eclipse.kind] ?? 'totality or annularity'
  switch (verdict.kind) {
    case 'in-path':
      return { badge: 'In the path', tone: 'gold', title: past ? `You were in ${sight}` : `You'll see ${sight}`, body }
    case 'near-path':
      return { badge: 'Near the path', tone: 'goldSoft', title: `${formatKm(verdict.toPath.km)} ${verdict.toPath.direction}`, body }
    case 'far-from-path':
      return { badge: 'Far from the path', tone: 'neutral', title: `${formatKm(verdict.toPath.km)} ${verdict.toPath.direction}`, body }
    case 'whole':
      return { badge: 'The whole eclipse', tone: 'violet', title: 'Moon up start to end', body }
    case 'part':
      return { badge: 'Part of it', tone: 'violetSoft', title: 'Moon up for part of it', body }
    case 'not-visible':
      return { badge: 'Not visible', tone: 'muted', title: 'Moon below your horizon', body }
    case 'unknown':
      return { badge: 'Unknown', tone: 'muted', title: 'The map can’t tell', body }
    case 'no-map':
      return { badge: 'No map', tone: 'muted', title: 'No visibility map', body }
  }
}

/** "34.6°S 58.4°W": the app has no place names, so the button shows where it thinks you are. */
export function formatCoords({ lat, lng }: Point): string {
  return `${Math.abs(lat).toFixed(1)}°${lat < 0 ? 'S' : 'N'} ${Math.abs(lng).toFixed(1)}°${lng < 0 ? 'W' : 'E'}`
}

export interface MyLocation {
  locating: boolean
  /** Where the viewer is, once they shared it. */
  position: Point | null
  /** What they get from the shown eclipse, once its map has loaded. */
  verdict: LocationVerdict | null
  /** Why there's no position, when the check failed. */
  error: string | null
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
      () => setStatus({ kind: 'error', message: 'Allow location for this site in your browser, then try again.' }),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    )
  }

  const position = status.kind === 'done' ? status.position : null
  const verdict = useMemo(() => {
    if (!position || !eclipse) return null
    if (eclipse.hasGeometry && !geometry) return null
    return locationVerdict(eclipse, geometry, position)
  }, [position, eclipse, geometry])

  const error = status.kind === 'error' ? status.message : null
  const message = error ?? (eclipse && verdict ? verdictMessage(eclipse, verdict, tense) : null)

  return { locating: status.kind === 'locating', position, verdict, error, message, check }
}

const PinIcon: FC<{ size: number; color?: string }> = ({ size, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </svg>
)

const ON = '#7be0a5'

const glass = {
  bg: 'rgba(10, 11, 20, 0.6)',
  backdropFilter: 'blur(10px)',
  border: '1px solid',
  borderColor: 'whiteAlpha.300',
  color: 'white',
  _hover: { bg: 'rgba(30, 32, 48, 0.75)' },
  _active: { bg: 'rgba(40, 42, 60, 0.85)' },
} as const

/** "Check my location", or once shared, the coordinates it's answering for (clicking checks again). */
export const LocationButton: FC<{ location: MyLocation; compact?: boolean }> = ({ location, compact = false }) => {
  const coords = location.position ? formatCoords(location.position) : null
  return compact ? (
    <IconButton
      {...glass}
      borderColor={coords ? 'rgba(123, 224, 165, 0.5)' : glass.borderColor}
      aria-label={coords ? `Location on, ${coords}. Check again` : 'Check my location'}
      icon={<PinIcon size={20} color={coords ? ON : undefined} />}
      isRound
      w="44px"
      h="44px"
      isLoading={location.locating}
      onClick={location.check}
    />
  ) : (
    <Button
      {...glass}
      leftIcon={<PinIcon size={16} color={coords ? ON : undefined} />}
      borderRadius="full"
      h="44px"
      px={5}
      fontWeight="semibold"
      isLoading={location.locating}
      loadingText="Locating"
      onClick={location.check}
      aria-label={coords ? `Location on, ${coords}. Check again` : undefined}
    >
      {coords ? (
        <>
          {coords}
          <Text as="span" fontWeight="normal" color="whiteAlpha.600" ml={1.5}>
            · Change
          </Text>
        </>
      ) : (
        'Check my location'
      )}
    </Button>
  )
}

const Badge: FC<{ tone: Tone; children: string }> = ({ tone, children }) => (
  <Box as="span" display="inline-block" px={2.5} py={0.5} borderRadius="full" fontSize="xs" fontWeight="semibold" bg={TONE[tone].bg} color={TONE[tone].color} whiteSpace="nowrap">
    {children}
  </Box>
)

/** Whether there's anything for the answer card to show. */
export const hasAnswer = (location: MyLocation) => !!(location.error || location.verdict)

/**
 * The answer to "can I see it from here?". Desktop: a glass card beside the headline. Compact: the content of
 * the mobile sheet's peek, so it takes no extra room. Shows the blocked state, with a retry, when the check failed.
 */
export const LocationCard: FC<{ location: MyLocation; eclipse: EclipseSummary | undefined; tense: Tense; compact?: boolean }> = ({
  location,
  eclipse,
  tense,
  compact = false,
}) => {
  const card: AnswerCard | null = location.error
    ? { badge: 'Location blocked', tone: 'warn', title: 'We can’t see where you are', body: location.error }
    : eclipse && location.verdict
      ? answerCard(eclipse, location.verdict, tense)
      : null
  if (!card) return null

  const content = (
    <Stack spacing={compact ? 1.5 : 2.5}>
      <HStack justify="space-between" spacing={3}>
        <Badge tone={card.tone}>{card.badge}</Badge>
        {!location.error && (
          <Text fontFamily="mono" fontSize="2xs" letterSpacing="0.14em" textTransform="uppercase" color="whiteAlpha.700">
            From your location
          </Text>
        )}
      </HStack>
      <Text fontSize={compact ? 'xl' : '2xl'} fontWeight="semibold" letterSpacing="-0.02em" lineHeight="1.2">
        {card.title}
      </Text>
      <Text fontSize="sm" lineHeight="1.5" color="whiteAlpha.800" noOfLines={compact ? 2 : undefined}>
        {card.body}
      </Text>
      {location.error && (
        <Box>
          <Button {...glass} size="sm" h="36px" borderRadius="full" onClick={location.check} isLoading={location.locating}>
            Try again
          </Button>
        </Box>
      )}
    </Stack>
  )

  return compact ? (
    <Box role="status">{content}</Box>
  ) : (
    <Box
      role="status"
      w="320px"
      px={5}
      py={4}
      bg="rgba(10, 11, 20, 0.78)"
      backdropFilter="blur(10px)"
      border="1px solid"
      borderColor={card.tone === 'gold' ? 'rgba(245, 200, 76, 0.5)' : card.tone === 'violet' ? 'rgba(184, 166, 255, 0.5)' : 'whiteAlpha.300'}
      borderRadius="2xl"
    >
      {content}
    </Box>
  )
}
