import { Box, HStack, Skeleton, Stack, Text } from '@chakra-ui/react'
import type { FC } from 'react'
import type { EclipseSummary } from '../data/types'
import { GLOBE_COLORS } from '../globe/palette'
import { KIND_LABEL, TYPE_LABEL, formatHeadlineDate } from './format'

interface EclipseHeadlineProps {
  eclipse: EclipseSummary | undefined
  loading: boolean
  /** Shown under the date on wide screens. */
  description?: string
  /** "Penumbral lunar eclipse" instead of "Penumbral lunar". */
  longEyebrow?: boolean
}

/** Eyebrow line (kind · Saros) and the big local date. */
export const EclipseHeadline: FC<EclipseHeadlineProps> = ({ eclipse, loading, description, longEyebrow = false }) => {
  if (loading) {
    return (
      <Stack spacing={4}>
        <Skeleton h="14px" w="240px" startColor="whiteAlpha.50" endColor="whiteAlpha.200" />
        <Skeleton h={{ base: '72px', lg: '112px' }} w="90%" startColor="whiteAlpha.50" endColor="whiteAlpha.200" />
      </Stack>
    )
  }
  if (!eclipse) return null

  const kind = `${KIND_LABEL[eclipse.kind]} ${TYPE_LABEL[eclipse.type].toLowerCase()}${longEyebrow ? ' eclipse' : ''}`
  const dot = eclipse.type === 'solar' ? GLOBE_COLORS.solarLimits : GLOBE_COLORS.lunarWhole

  return (
    <Stack spacing={{ base: 2, lg: 3 }} aria-live="polite">
      <HStack spacing={2.5}>
        <Box w="8px" h="8px" borderRadius="full" bg={dot} flexShrink={0} />
        <Text fontFamily="mono" fontSize={{ base: 'xs', lg: 'sm' }} letterSpacing="0.16em" textTransform="uppercase" color="whiteAlpha.800">
          {kind} · Saros {eclipse.saros}
        </Text>
      </HStack>
      <Text
        as="h2"
        fontSize={{ base: '3xl', lg: '5xl' }}
        fontWeight="semibold"
        lineHeight="1.1"
        letterSpacing="-0.02em"
        maxW={{ lg: '600px' }}
      >
        {formatHeadlineDate(eclipse.peakUtc)}
      </Text>
      {description && (
        <Text fontSize="lg" lineHeight="1.55" color="whiteAlpha.800" maxW="460px" pt={2}>
          {description}
        </Text>
      )}
    </Stack>
  )
}
