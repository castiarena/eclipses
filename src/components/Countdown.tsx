import { Box, SimpleGrid, Skeleton, Text } from '@chakra-ui/react'
import type { FC } from 'react'
import type { Remaining } from '../hooks/countdown'
import type { EclipseType } from '../data/types'

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

interface CountdownProps {
  type: EclipseType
  remaining: Remaining | null
  loading: boolean
  /** Use "hrs", "min" and "sec", for narrow screens. */
  shortLabels?: boolean
}

export const Countdown: FC<CountdownProps> = ({ type, remaining, loading, shortLabels = false }) => {
  if (loading) {
    return (
      <SimpleGrid columns={4} spacing={{ base: 2, sm: 3 }} aria-label="Loading next eclipse">
        {UNITS.map((unit) => (
          <Skeleton key={unit} h={TILE_HEIGHT} borderRadius="xl" startColor="whiteAlpha.50" endColor="whiteAlpha.200" />
        ))}
      </SimpleGrid>
    )
  }

  if (!remaining) {
    return <Text opacity={0.8}>No upcoming {type} eclipse in the catalog.</Text>
  }

  return (
    <SimpleGrid
      columns={4}
      spacing={{ base: 2, sm: 3 }}
      role="timer"
      aria-label={`Time until the next ${type} eclipse`}
    >
      {UNITS.map((unit) => (
        <DigitTile key={unit} label={shortLabels ? SHORT_LABEL[unit] : unit} value={remaining[unit]} />
      ))}
    </SimpleGrid>
  )
}
