import { Box, chakra, SimpleGrid, Text } from '@chakra-ui/react'
import type { FC } from 'react'
import type { EclipseSummary } from '../data/types'
import { TILES_MAX_MS, type CountdownTarget } from '../hooks/countdown'
import { nextInSaros, nextOfKind, type Phase } from '../hooks/timeline'
import { t } from '../i18n'
import { formatDuration, formatShortDate } from './format'

export interface NextStep {
  id: string
  label: string
  value: string
}

/**
 * Where to go from an eclipse that's over or more than a year away: the next one of the same kind that you
 * can still see, and the next in its Saros series. Nothing for an eclipse that's coming up soon.
 */
export function nextSteps(
  list: EclipseSummary[],
  eclipse: EclipseSummary,
  phase: Phase,
  target: CountdownTarget | null,
  nowMs: number,
): NextStep[] {
  const farOff = phase === 'upcoming' && target !== null && target.atMs - nowMs > TILES_MAX_MS
  if (phase !== 'past' && !farOff) return []

  const steps: NextStep[] = []
  const kind = nextOfKind(list, eclipse, nowMs)
  // For a far-off eclipse, only worth it when the same kind comes sooner.
  if (kind && (phase === 'past' || Date.parse(kind.peakUtc) < Date.parse(eclipse.peakUtc))) {
    const duration = formatDuration(kind.durationSec)
    steps.push({
      id: kind.id,
      label: t('nextSteps.nextOfKind', { kind: kind.kind, type: kind.type }),
      value: duration ? `${formatShortDate(kind.peakUtc)} · ${duration}` : formatShortDate(kind.peakUtc),
    })
  }
  const saros = nextInSaros(list, eclipse)
  if (saros && saros.id !== kind?.id) {
    steps.push({ id: saros.id, label: t('nextSteps.sarosReturns', { saros: eclipse.saros }), value: formatShortDate(saros.peakUtc) })
  }
  return steps
}

const Arrow: FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)

interface NextStepsProps {
  steps: NextStep[]
  onShow: (id: string) => void
  /** Phones: plain rows for the sheet. Wide screens: side by side, a card for the first step and a lighter one for the second. */
  compact?: boolean
}

/** The next steps as buttons that show that eclipse. */
export const NextSteps: FC<NextStepsProps> = ({ steps, onShow, compact = false }) => {
  if (!steps.length) return null
  return (
    <SimpleGrid columns={compact ? 1 : steps.length} spacing={compact ? 1 : 3}>
      {steps.map((step, i) => (
        <chakra.button
          key={step.id}
          type="button"
          onClick={() => onShow(step.id)}
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          gap={3}
          w="full"
          minH="44px"
          px={compact ? 0 : 4}
          py={compact ? 1 : 2}
          textAlign="left"
          color={compact ? 'accent.300' : 'white'}
          bg={compact ? 'transparent' : i === 0 ? 'rgba(14, 15, 26, 0.82)' : 'transparent'}
          border={compact ? 'none' : i === 0 ? '1px solid' : '1px dashed'}
          borderColor="whiteAlpha.200"
          borderRadius="xl"
          _hover={{ bg: compact ? undefined : 'whiteAlpha.100', color: compact ? 'white' : undefined }}
        >
          <Box minW={0}>
            <Text fontFamily="mono" fontSize="2xs" letterSpacing="0.14em" textTransform="uppercase" color="whiteAlpha.700">
              {step.label}
            </Text>
            <Text fontSize={compact ? 'sm' : 'md'} fontWeight="medium" noOfLines={1}>
              {step.value}
            </Text>
          </Box>
          <Arrow />
        </chakra.button>
      ))}
    </SimpleGrid>
  )
}
