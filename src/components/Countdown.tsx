import { Box, SimpleGrid, Spinner, Text } from '@chakra-ui/react'
import type { FC } from 'react'
import type { Remaining } from '../hooks/countdown'
import type { EclipseType } from '../data/types'

const UNITS: (keyof Remaining)[] = ['days', 'hours', 'minutes', 'seconds']

const pad = (n: number) => String(n).padStart(2, '0')

export const DigitTile: FC<{ label: string; value: number }> = ({ label, value }) => (
  <Box
    bg="blackAlpha.100"
    _dark={{ bg: 'whiteAlpha.100' }}
    borderRadius="lg"
    px={{ base: 1, md: 5 }}
    py={{ base: 3, md: 5 }}
    textAlign="center"
  >
    <Text
      fontSize={{ base: '3xl', md: '5xl' }}
      fontWeight="bold"
      lineHeight="1"
      sx={{ fontVariantNumeric: 'tabular-nums' }}
    >
      {pad(value)}
    </Text>
    <Text fontSize="xs" textTransform="uppercase" letterSpacing={{ base: 'normal', md: 'wide' }} mt={2} opacity={0.7}>
      {label}
    </Text>
  </Box>
)

interface CountdownProps {
  type: EclipseType
  remaining: Remaining | null
  loading: boolean
}

export const Countdown: FC<CountdownProps> = ({ type, remaining, loading }) => {
  if (loading) return <Spinner aria-label="Loading next eclipse" />

  if (!remaining) {
    return <Text>No upcoming {type} eclipse in the catalog.</Text>
  }

  return (
    <SimpleGrid
      columns={4}
      spacing={{ base: 2, md: 4 }}
      role="timer"
      aria-label={`Time until the next ${type} eclipse`}
    >
      {UNITS.map((unit) => (
        <DigitTile key={unit} label={unit} value={remaining[unit]} />
      ))}
    </SimpleGrid>
  )
}
