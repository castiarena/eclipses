import { Box, Button, IconButton, Text } from '@chakra-ui/react'
import { useMemo, useState, type FC } from 'react'
import type { EclipseGeometry, EclipseType } from '../data/types'
import { visibilityAt, type Point, type Visibility } from '../globe/visibility'

type Status =
  | { kind: 'idle' }
  | { kind: 'locating' }
  | { kind: 'error'; message: string }
  | { kind: 'done'; position: Point }

const MESSAGES: Record<EclipseType, Record<Visibility, string>> = {
  solar: {
    central: 'Your location is in the path of totality or annularity.',
    full: '',
    partial: '',
    none: 'Outside the mapped path. A partial view may still be possible; partial zones are not mapped yet.',
    unknown: 'The map cannot tell for this location.',
  },
  lunar: {
    central: '',
    full: 'The Moon is up for the whole eclipse from your location.',
    partial: 'The Moon is up for part of the eclipse from your location.',
    none: 'The Moon is below the horizon from your location.',
    unknown: 'The map cannot tell for this location.',
  },
}

export interface MyLocation {
  locating: boolean
  /** Where the viewer is, once they shared it. */
  position: Point | null
  /** What to tell the viewer, if anything. */
  message: string | null
  check: () => void
}

/**
 * Opt-in geolocation. The position is kept, so the answer follows the
 * selected eclipse when the viewer switches between solar and lunar.
 */
export function useMyLocation(type: EclipseType, geometry: EclipseGeometry | null): MyLocation {
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
  const message = useMemo(() => {
    if (status.kind === 'error') return status.message
    if (!position) return null
    if (!geometry) return 'There is no visibility map for this eclipse yet.'
    return MESSAGES[type][visibilityAt(geometry, position)]
  }, [status, position, geometry, type])

  return { locating: status.kind === 'locating', position, message, check }
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
