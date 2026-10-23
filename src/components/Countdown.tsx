import { Box, HStack, SimpleGrid, Skeleton, Stack, Text } from '@chakra-ui/react'
import { keyframes } from '@emotion/react'
import type { FC, ReactNode } from 'react'
import { eventProgress, type CountdownTarget, type Remaining } from '../hooks/countdown'
import type { Phase } from '../hooks/timeline'
import type { EclipseFilter, EclipseSummary } from '../data/types'
import { formatEndsIn, formatEventTime, formatLongSpan, formatSpan, utcOffsetLabel } from './format'

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

const reducedMotion = { '@media (prefers-reduced-motion: reduce)': { animation: 'none' } }

const TARGET_LABEL: Record<CountdownTarget['target'], string> = {
  start: 'Begins in',
  peak: 'Peak in',
  end: 'Ends in',
}

/** The line above the tiles: always says what they count to. */
const Label: FC<{ children: string; live?: boolean }> = ({ children, live = false }) => (
  <HStack spacing={2} h="18px">
    {live && <Box w="8px" h="8px" borderRadius="full" bg="accent.400" animation={`${pulse} 1.6s ease-in-out infinite`} sx={reducedMotion} />}
    <Text fontFamily="mono" fontSize={{ base: '2xs', lg: 'xs' }} textTransform="uppercase" letterSpacing="0.16em" color={live ? 'accent.300' : 'whiteAlpha.700'}>
      {children}
    </Text>
  </HStack>
)

/** A sentence in place of the tiles, the same height so the layout doesn't jump. */
const Statement: FC<{ title: string; muted?: boolean; children?: ReactNode }> = ({ title, muted = false, children }) => (
  <Box
    {...tileStyle}
    bg={muted ? 'rgba(14, 15, 26, 0.5)' : tileStyle.bg}
    borderColor={muted ? 'whiteAlpha.100' : tileStyle.borderColor}
    h={TILE_HEIGHT}
    px={{ base: 5, lg: 7 }}
    display="flex"
    flexDir="column"
    justifyContent="center"
    gap={3}
  >
    <Text fontSize={{ base: '2xl', lg: '4xl' }} fontWeight="semibold" lineHeight="1.1" letterSpacing="-0.02em">
      {title}
    </Text>
    {children}
  </Box>
)

/** Start → end, filled up to now, with the peak marked. */
const ProgressBar: FC<{ now: number; peak: number }> = ({ now, peak }) => (
  <Box position="relative" h="4px" borderRadius="full" bg="whiteAlpha.200" aria-hidden="true">
    <Box position="absolute" left={0} top={0} bottom={0} w={`${now * 100}%`} borderRadius="full" bg="accent.400" />
    <Box position="absolute" left={`${peak * 100}%`} top="-3px" w="2px" h="10px" bg="white" />
  </Box>
)

interface CountdownProps {
  eclipse: EclipseSummary | undefined
  phase: Phase | undefined
  target: CountdownTarget | null
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

/**
 * A label naming what it counts to, over tiles while the target is under a year away, or a sentence when
 * it's far off, happening, or over.
 */
export const Countdown: FC<CountdownProps> = ({ eclipse, phase, target, remaining, now, loading, filter, pinned = false, shortLabels = false }) => {
  if (loading) {
    return (
      <Stack spacing={2.5}>
        <Box h="18px" />
        <SimpleGrid columns={4} spacing={{ base: 2, sm: 3 }} aria-label="Loading next eclipse">
          {UNITS.map((unit) => (
            <Skeleton key={unit} h={TILE_HEIGHT} borderRadius="xl" startColor="whiteAlpha.50" endColor="whiteAlpha.200" />
          ))}
        </SimpleGrid>
      </Stack>
    )
  }

  if (!eclipse || !phase) {
    return <Text opacity={0.8}>No upcoming {filter === 'all' ? '' : `${filter} `}eclipse in the catalog.</Text>
  }

  if (phase === 'past' || !target) {
    return (
      <Stack spacing={2.5}>
        <Label>Ended</Label>
        <Statement muted title={`Happened ${formatSpan(now - Date.parse(eclipse.endUtc))} ago`} />
      </Stack>
    )
  }

  if (phase === 'now') {
    const progress = eventProgress(eclipse, now)
    return (
      <Stack spacing={2.5} role="timer">
        <Label live>Happening now</Label>
        <Statement title={remaining ? `${TARGET_LABEL[target.target]} ${formatEndsIn(remaining)}` : 'Happening now'}>
          <ProgressBar now={progress.now} peak={progress.peak} />
        </Statement>
      </Stack>
    )
  }

  const untilTarget = target.atMs - now
  if (untilTarget > TILES_MAX_MS || !remaining) {
    return (
      <Stack spacing={2.5}>
        <Label>{TARGET_LABEL[target.target]}</Label>
        <Statement muted title={formatLongSpan(untilTarget)} />
      </Stack>
    )
  }

  const what = target.target === 'peak' ? 'peak' : 'start'
  return (
    <Stack spacing={2.5}>
      <Label>{TARGET_LABEL[target.target]}</Label>
      <SimpleGrid
        columns={4}
        spacing={{ base: 2, sm: 3 }}
        role="timer"
        aria-label={`Time until the ${what} of ${pinned ? 'this' : 'the next'} ${eclipse.type} eclipse`}
      >
        {UNITS.map((unit) => (
          <DigitTile key={unit} label={shortLabels ? SHORT_LABEL[unit] : unit} value={remaining[unit]} />
        ))}
      </SimpleGrid>
    </Stack>
  )
}

/**
 * Start · peak · end in the viewer's time. Solar start and end are estimates (±2.5 h around the peak), so
 * they get a "~". The moment the countdown targets is drawn filled.
 */
export const EventLine: FC<{ eclipse: EclipseSummary }> = ({ eclipse }) => {
  const approx = eclipse.type === 'solar' ? '~' : ''
  const filled = eclipse.type === 'solar' ? 'peak' : 'start'
  const points = [
    { key: 'start', label: `Starts ${approx}${formatEventTime(eclipse.startUtc, eclipse.peakUtc)}`, align: 'left' },
    { key: 'peak', label: `Peak ${formatEventTime(eclipse.peakUtc, eclipse.peakUtc)}`, align: 'center' },
    { key: 'end', label: `Ends ${approx}${formatEventTime(eclipse.endUtc, eclipse.peakUtc)}`, align: 'right' },
  ] as const
  const color = eclipse.type === 'solar' ? 'solar.path' : 'lunar.whole'

  return (
    <Stack spacing={2}>
      <Text fontFamily="mono" fontSize="2xs" textTransform="uppercase" letterSpacing="0.16em" color="whiteAlpha.700">
        Your time · {utcOffsetLabel(eclipse.peakUtc)}
      </Text>
      <Box position="relative" h="14px" aria-hidden="true">
        <Box position="absolute" left="6px" right="6px" top="6px" h="2px" bg={color} opacity={0.5} />
        {points.map((p) => (
          <Box
            key={p.key}
            position="absolute"
            top={p.key === filled ? 0 : '1px'}
            left={p.align === 'left' ? 0 : p.align === 'center' ? '50%' : undefined}
            right={p.align === 'right' ? 0 : undefined}
            transform={p.align === 'center' ? 'translateX(-50%)' : undefined}
            w={p.key === filled ? '14px' : '12px'}
            h={p.key === filled ? '14px' : '12px'}
            borderRadius="full"
            border="2px solid"
            borderColor={color}
            bg={p.key === filled ? color : 'space.900'}
          />
        ))}
      </Box>
      <HStack justify="space-between" fontFamily="mono" fontSize="xs" color="whiteAlpha.800" sx={{ fontVariantNumeric: 'tabular-nums' }}>
        {points.map((p) => (
          <Text key={p.key} color={p.key === filled ? 'white' : undefined} fontWeight={p.key === filled ? 'medium' : undefined}>
            {p.label}
          </Text>
        ))}
      </HStack>
    </Stack>
  )
}
