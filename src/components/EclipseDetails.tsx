import { Box, SimpleGrid, Text } from '@chakra-ui/react'
import type { FC, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { EclipseSummary } from '../data/types'
import { formatDuration, formatMagnitude, formatUtcTime } from './format'

const Field: FC<{ label: string; children: ReactNode }> = ({ label, children }) => (
  <Box>
    <Text fontFamily="mono" fontSize="xs" textTransform="uppercase" letterSpacing="0.16em" color="whiteAlpha.700">
      {label}
    </Text>
    <Text fontSize={{ base: 'lg', lg: 'md' }} fontWeight="medium" mt={1}>
      {children}
    </Text>
  </Box>
)

interface EclipseDetailsProps {
  eclipse: EclipseSummary
  /** Shorter labels and values for the mobile sheet. */
  compact?: boolean
}

/**
 * One row of facts. The date is in the headline and the viewer's local time in the event line above, so
 * universal time is just the time. The duration, when there is one,
 * takes the Saros series' place, since the eyebrow already names the series.
 */
export const EclipseDetails: FC<EclipseDetailsProps> = ({ eclipse, compact = false }) => {
  const { t } = useTranslation()
  const duration = formatDuration(eclipse.durationSec)
  const { peakUtc } = eclipse

  return (
    <SimpleGrid columns={3} spacingX={{ base: 4, lg: 6 }}>
      <Field label={t(compact ? 'details.universal' : 'details.universalTime')}>
        {formatUtcTime(peakUtc)}
      </Field>
      <Field label={t('details.magnitude')}>{formatMagnitude(eclipse.magnitude)}</Field>
      {duration ? (
        <Field label={t(compact ? 'details.duration' : 'details.greatestDuration')}>{duration}</Field>
      ) : (
        <Field label={t(compact ? 'details.saros' : 'details.sarosSeries')}>{eclipse.saros}</Field>
      )}
    </SimpleGrid>
  )
}
