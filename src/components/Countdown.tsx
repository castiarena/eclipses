import { Box, HStack, SimpleGrid, Skeleton, Text } from '@chakra-ui/react'
import { keyframes } from '@emotion/react'
import type { FC } from 'react'
import type { Remaining } from '../hooks/countdown'
import type { Phase } from '../hooks/timeline'
import type { EclipseFilter, EclipseSummary } from '../data/types'
import { formatEndsIn, formatSpan } from './format'

const UNITS: (keyof Remaining)[] = ['days', 'hours', 'minutes', 'seconds']

const SHORT_LABEL: Record<keyof Remaining, string> = {
  days: 'days',
  hours: 'hrs',
  minutes: 'min',
  seconds: 'sec',
}

const pad = (n: number) => String(n).padStart(2, '0')

const TILE_HEIGHT = { base: '76px', lg: '104px' }

const tileStyle = {
  bg: 'rgba(14, 15, 26, 0.82)',
  border: '1px solid',
  borderColor: 'whiteAlpha.200',
  borderRadius: 'xl',
} as const

export const DigitTile: FC<{ label: string; value: number }> = ({ label, value }) => (
  <Box {...tileStyle} h={TILE_HEIGHT} display="flex" flexDir="column" alignItems="center" justifyContent="center">
    <Text
      fontSize={{ base: '3xl', lg: '5xl' }}
      fontWeight="semibold"
      lineHeight="1"
      letterSpacing="-0.02em"
      sx={{ fontVariantNumeric: 'tabular-nums' }}
    >
      {pad(value)}
    </Text>
    <Text fontFamily="mono" fontSize={{ base: '2xs', lg: 'xs' }} textTransform="uppercase" letterSpacing="0.14em" mt={{ base: 2, lg: 3 }} opacity={0.7}>
      {label}
    </Text>
  </Box>
)

/** Beyond this, a ticking day count is noise (and won't fit), so the countdown becomes a sentence. */
const TILES_MAX_MS = 365 * 86_400_000

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
`

/** A sentence in place of the tiles, the same height so the layout doesn't jump. */
const Statement: FC<{ title: string; detail?: string; live?: boolean }> = ({ title, detail, live = false }) => (
  <Box
    {...tileStyle}
    h={TILE_HEIGHT}
    px={{ base: 5, lg: 7 }}
    display="flex"
    flexDir="column"
    justifyContent="center"
    role={live ? 'timer' : undefined}
  >
    <HStack spacing={3}>
      {live && <Box w="10px" h="10px" borderRadius="full" bg="accent.400" flexShrink={0} animation={`${pulse} 1.6s ease-in-out infinite`} sx={{ '@media (prefers-reduced-motion: reduce)': { animation: 'none' } }} />}
      <Text fontSize={{ base: '2xl', lg: '4xl' }} fontWeight="semibold" lineHeight="1.1" letterSpacing="-0.02em">
        {title}
      </Text>
    </HStack>
    {detail && (
      <Text fontFamily="mono" fontSize={{ base: '2xs', lg: 'xs' }} textTransform="uppercase" letterSpacing="0.14em" mt={2} opacity={0.7}>
        {detail}
      </Text>
    )}
  </Box>
)

interface CountdownProps {
  eclipse: EclipseSummary | undefined
  phase: Phase | undefined
  remaining: Remaining | null
  now: number
  loading: boolean
  /** The filter, for the empty message. */
  filter: EclipseFilter
  /** The user picked this eclipse, so it may not be the next one. */
  pinned?: boolean
  /** Use "hrs", "min" and "sec", for narrow screens. */
  shortLabels?: boolean
}

/** Tiles while the eclipse is under a year away; a sentence when it's far off, happening, or over. */
export const Countdown: FC<CountdownProps> = ({ eclipse, phase, remaining, now, loading, filter, pinned = false, shortLabels = false }) => {
  if (loading) {
    return (
      <SimpleGrid columns={4} spacing={{ base: 2, sm: 3 }} aria-label="Loading next eclipse">
        {UNITS.map((unit) => (
          <Skeleton key={unit} h={TILE_HEIGHT} borderRadius="xl" startColor="whiteAlpha.50" endColor="whiteAlpha.200" />
        ))}
      </SimpleGrid>
    )
  }

  if (!eclipse || !phase) {
    return <Text opacity={0.8}>No upcoming {filter === 'all' ? '' : `${filter} `}eclipse in the catalog.</Text>
  }

  if (phase === 'past') {
    return <Statement title={`Happened ${formatSpan(now - Date.parse(eclipse.endUtc))} ago`} />
  }

  if (phase === 'now') {
    return <Statement live title="Happening now" detail={remaining ? `Ends in ${formatEndsIn(remaining)}` : undefined} />
  }

  const untilStart = Date.parse(eclipse.startUtc) - now
  if (untilStart > TILES_MAX_MS || !remaining) {
    return <Statement title={`In ${formatSpan(untilStart)} from now`} />
  }

  return (
    <SimpleGrid
      columns={4}
      spacing={{ base: 2, sm: 3 }}
      role="timer"
      aria-label={pinned ? `Time until this ${eclipse.type} eclipse starts` : `Time until the next ${eclipse.type} eclipse starts`}
    >
      {UNITS.map((unit) => (
        <DigitTile key={unit} label={shortLabels ? SHORT_LABEL[unit] : unit} value={remaining[unit]} />
      ))}
    </SimpleGrid>
  )
}
