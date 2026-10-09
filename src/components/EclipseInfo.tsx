import { Badge, Box, Heading, SimpleGrid, Spinner, Stack, Text } from '@chakra-ui/react'
import type { FC, ReactNode } from 'react'
import type { EclipseSummary } from '../data/types'
import { KIND_LABEL, TYPE_LABEL, formatDuration, formatLocal, formatMagnitude, formatUtc } from './format'

interface EclipseInfoProps {
  eclipse: EclipseSummary | undefined
  loading: boolean
}

const Field: FC<{ label: string; children: ReactNode }> =({ label, children }) => (
  <Box>
    <Text fontSize="xs" textTransform="uppercase" letterSpacing="wide" opacity={0.7}>
      {label}
    </Text>
    <Text fontWeight="medium">{children}</Text>
  </Box>
)

export const EclipseInfo: FC<EclipseInfoProps> = ({ eclipse, loading }) => {
  if (loading) return <Spinner aria-label="Loading details" />
  if (!eclipse) return null

  const duration = formatDuration(eclipse.durationSec)

  return (
    <Stack spacing={4} aria-live="polite">
      <Stack direction="row" align="center" flexWrap="wrap">
        <Heading size="md">
          {TYPE_LABEL[eclipse.type]} eclipse
        </Heading>
        <Badge colorScheme="purple">{KIND_LABEL[eclipse.kind]}</Badge>
      </Stack>

      <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4}>
        <Field label="Local time">{formatLocal(eclipse.peakUtc)}</Field>
        <Field label="Universal time">{formatUtc(eclipse.peakUtc)}</Field>
        <Field label="Magnitude">{formatMagnitude(eclipse.magnitude)}</Field>
        <Field label="Saros series">{eclipse.saros}</Field>
        {duration && <Field label="Greatest duration">{duration}</Field>}
      </SimpleGrid>
    </Stack>
  )
}
