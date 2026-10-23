import { Box, Button, chakra, HStack, IconButton, Skeleton, Stack, Text, VisuallyHidden } from '@chakra-ui/react'
import { useMemo, type FC } from 'react'
import type { EclipseSummary } from '../data/types'
import { GLOBE_COLORS } from '../globe/palette'
import { localYear } from '../hooks/timeline'
import type { EclipseBrowser } from '../hooks/useEclipseBrowser'
import { KIND_LABEL, TYPE_LABEL, formatDateWithoutYear, formatHeadlineDate } from './format'

type Browse = Pick<EclipseBrowser, 'previous' | 'following' | 'prev' | 'next' | 'years' | 'jumpToYear' | 'isLive' | 'reset'>

interface EclipseHeadlineProps {
  eclipse: EclipseSummary | undefined
  loading: boolean
  browse: Browse
  /** Shown under the date on wide screens. */
  description?: string
  /** "Penumbral lunar eclipse" instead of "Penumbral lunar". */
  longEyebrow?: boolean
  /** Narrow screens: short date ("Sat 6 Feb") so the arrows fit on one line, and the "Back to next" pill above the eyebrow. */
  compact?: boolean
}

const Chevron: FC<{ dir: 'left' | 'right' }> = ({ dir }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={dir === 'left' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'} />
  </svg>
)

const BackIcon: FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 14L4 9l5-5" />
    <path d="M4 9h11a5 5 0 0 1 0 10h-3" />
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
  _disabled: { opacity: 0.3, cursor: 'not-allowed' },
} as const

const StepButton: FC<{ dir: 'left' | 'right'; target: EclipseSummary | undefined; onClick: () => void }> = ({
  dir,
  target,
  onClick,
}) => (
  <IconButton
    {...glass}
    aria-label={dir === 'left' ? 'Previous eclipse' : 'Next eclipse'}
    title={target ? `${dir === 'left' ? 'Previous' : 'Next'}: ${formatHeadlineDate(target.peakUtc)}` : undefined}
    icon={<Chevron dir={dir} />}
    isRound
    flexShrink={0}
    w={{ base: '36px', lg: '44px' }}
    minW={{ base: '36px', lg: '44px' }}
    h={{ base: '36px', lg: '44px' }}
    isDisabled={!target}
    onClick={onClick}
  />
)

/** The year in the date, as a native select over the text: a wheel on phones, a list on desktop. */
const YearPicker: FC<{ year: number; years: Set<number>; onChange: (year: number) => void }> = ({ year, years, onChange }) => {
  const range = useMemo(() => {
    const sorted = [...years].sort((a, b) => a - b)
    const out: number[] = []
    for (let y = sorted[0]; y <= sorted[sorted.length - 1]; y++) out.push(y)
    return out
  }, [years])

  return (
    <Box
      as="span"
      position="relative"
      display="inline-block"
      borderBottom="2px dotted"
      borderColor="whiteAlpha.400"
      _hover={{ borderColor: 'whiteAlpha.800' }}
      _focusWithin={{ borderColor: 'accent.300', borderBottomStyle: 'solid' }}
    >
      {year}
      <chakra.select
        aria-label="Jump to year"
        value={year}
        onChange={(e) => onChange(Number(e.target.value))}
        position="absolute"
        inset={0}
        w="full"
        h="full"
        opacity={0}
        cursor="pointer"
        // 16px stops iOS zooming in when the select opens.
        fontSize="16px"
        style={{ colorScheme: 'dark' }}
      >
        {range.map((y) => (
          <option key={y} value={y} disabled={!years.has(y)}>
            {y}
          </option>
        ))}
      </chakra.select>
    </Box>
  )
}

/** Shown while browsing. On wide screens the page puts it beside the toggle; compact headlines show it themselves. */
export const BackToNext: FC<{ onClick: () => void }> = ({ onClick }) => (
  <Button {...glass} size="sm" h="32px" px={3.5} borderRadius="full" fontWeight="medium" leftIcon={<BackIcon />} onClick={onClick}>
    Back to next eclipse
  </Button>
)

/** Eyebrow line (kind · Saros), the big local date between prev/next arrows, and the description. */
export const EclipseHeadline: FC<EclipseHeadlineProps> = ({
  eclipse,
  loading,
  browse,
  description,
  longEyebrow = false,
  compact = false,
}) => {
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
    <Stack spacing={{ base: 2, lg: 3 }}>
      {compact && !browse.isLive && (
        <Box>
          <BackToNext onClick={browse.reset} />
        </Box>
      )}
      {/* Announces each step. The visible date holds the year picker, whose 100 options must not be read out. */}
      <VisuallyHidden aria-live="polite">
        {`${KIND_LABEL[eclipse.kind]} ${eclipse.type} eclipse, ${formatHeadlineDate(eclipse.peakUtc)}`}
      </VisuallyHidden>
      <HStack spacing={2.5}>
        <Box w="8px" h="8px" borderRadius="full" bg={dot} flexShrink={0} />
        <Text fontFamily="mono" fontSize={{ base: 'xs', lg: 'sm' }} letterSpacing="0.16em" textTransform="uppercase" color="whiteAlpha.800">
          {kind} · Saros {eclipse.saros}
        </Text>
      </HStack>
      <HStack spacing={{ base: 2, lg: 4 }} align="center">
        <StepButton dir="left" target={browse.previous} onClick={browse.prev} />
        <Text
          as="h2"
          flex={1}
          fontSize={{ base: '3xl', lg: '5xl' }}
          fontWeight="semibold"
          lineHeight="1.1"
          letterSpacing="-0.02em"
          textAlign={compact ? 'center' : undefined}
        >
          {formatDateWithoutYear(eclipse.peakUtc, { short: compact })}{' '}
          <YearPicker year={localYear(eclipse.peakUtc)} years={browse.years} onChange={browse.jumpToYear} />
        </Text>
        <StepButton dir="right" target={browse.following} onClick={browse.next} />
      </HStack>
      {description && (
        <Text fontSize="lg" lineHeight="1.55" color="whiteAlpha.800" maxW="460px" pt={2}>
          {description}
        </Text>
      )}
    </Stack>
  )
}
