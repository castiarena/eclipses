import { Box, chakra, Text } from '@chakra-ui/react'
import type { FC } from 'react'
import type { Phase } from '../hooks/timeline'
import { t } from '../i18n'

const LABEL_KEY = {
  upcoming: 'status.upcoming',
  now: 'status.now',
  past: 'status.past',
} as const satisfies Record<Phase, string>

const TONE: Record<Phase, { bg: string; color: string }> = {
  upcoming: { bg: 'rgba(123, 224, 165, 0.14)', color: '#7be0a5' },
  now: { bg: 'rgba(138, 115, 255, 0.2)', color: 'accent.300' },
  past: { bg: 'whiteAlpha.100', color: 'whiteAlpha.800' },
}

export interface StatusChipState {
  label: string
  /** Off the live view the chip can take you back to the next eclipse. */
  returnsToLive: boolean
  /** What a screen reader hears for the chip as a button, or null when it isn't one. */
  actionLabel: string | null
}

/** Where the shown eclipse sits relative to now, and whether the chip offers the way back. */
export function statusChip(phase: Phase, isLive: boolean): StatusChipState {
  return {
    label: t(LABEL_KEY[phase]),
    returnsToLive: !isLive,
    actionLabel: isLive ? null : t('status.back', { phase }),
  }
}

const BackIcon: FC = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 14L4 9l5-5" />
    <path d="M4 9h11a5 5 0 0 1 0 10h-3" />
  </svg>
)

const chipStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 1.5,
  h: '24px',
  px: 2.5,
  borderRadius: 'full',
  fontFamily: 'mono',
  fontSize: '2xs',
  fontWeight: 'medium',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
  flexShrink: 0,
} as const

interface StatusChipProps {
  phase: Phase
  isLive: boolean
  /** Compact headlines turn the chip into the "↩ Now" button off the live view; wide screens have their own. */
  onReturn?: () => void
}

/** Upcoming / Happening now / Past, in the eyebrow. Same slot whether or not it's a button, so nothing moves. */
export const StatusChip: FC<StatusChipProps> = ({ phase, isLive, onReturn }) => {
  const chip = statusChip(phase, isLive)
  const tone = TONE[phase]

  if (chip.returnsToLive && onReturn) {
    return (
      <chakra.button
        type="button"
        {...chipStyle}
        position="relative"
        bg={tone.bg}
        color="white"
        border="1px solid"
        borderColor="whiteAlpha.300"
        aria-label={chip.actionLabel ?? undefined}
        onClick={onReturn}
        _hover={{ bg: 'whiteAlpha.200' }}
        // Drawn 24 px tall; the tap area reaches 44 px.
        _before={{ content: '""', position: 'absolute', insetX: 0, insetY: '-10px' }}
      >
        {chip.label}
        <BackIcon />
        {t('status.nowButton')}
      </chakra.button>
    )
  }

  return (
    <Box {...chipStyle} bg={tone.bg} color={tone.color}>
      <Text as="span">{chip.label}</Text>
    </Box>
  )
}
