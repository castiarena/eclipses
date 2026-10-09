import { Button, Stack, Text } from '@chakra-ui/react'
import { useState, type FC } from 'react'
import type { EclipseGeometry, EclipseType } from '../data/types'
import { visibilityAt, type Visibility } from '../globe/visibility'

type Status =
  | { kind: 'idle' }
  | { kind: 'locating' }
  | { kind: 'error'; message: string }
  | { kind: 'done'; visibility: Visibility }

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

export const YourLocation: FC<{ type: EclipseType; geometry: EclipseGeometry }> = ({ type, geometry }) => {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  const check = () => {
    if (!navigator.geolocation) {
      setStatus({ kind: 'error', message: 'This browser cannot share its location.' })
      return
    }
    setStatus({ kind: 'locating' })
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setStatus({
          kind: 'done',
          visibility: visibilityAt(geometry, { lat: pos.coords.latitude, lng: pos.coords.longitude }),
        }),
      () => setStatus({ kind: 'error', message: 'Location was not shared, so this check was skipped.' }),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    )
  }

  return (
    <Stack spacing={2} align="flex-start">
      <Button size="sm" variant="outline" onClick={check} isLoading={status.kind === 'locating'}>
        Check my location
      </Button>
      {status.kind === 'error' && <Text fontSize="sm">{status.message}</Text>}
      {status.kind === 'done' && <Text fontSize="sm">{MESSAGES[type][status.visibility]}</Text>}
    </Stack>
  )
}
