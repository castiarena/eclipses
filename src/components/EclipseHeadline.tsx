import { Box, Button, chakra, HStack, IconButton, Skeleton, Stack, Text, VisuallyHidden } from '@chakra-ui/react'
import { useMemo, type FC } from 'react'
import type { EclipseSummary } from '../data/types'
import { GLOBE_COLORS } from '../globe/palette'
import { localYear } from '../hooks/timeline'
import type { EclipseBrowser } from '../hooks/useEclipseBrowser'
import { KIND_LABEL, TYPE_LABEL, formatDateWithoutYear, formatHeadlineDate, formatShortDate, formatWeekday } from './format'
import { StatusChip } from './StatusChip'

type Browse = Pick<EclipseBrowser, 'previous' | 'following' | 'prev' | 'next' | 'years' | 'jumpToYear' | 'isLive' | 'reset' | 'phase'>

interface EclipseHeadlineProps {
  eclipse: EclipseSummary | undefined
  loading: boolean
  browse: Browse
  /** Shown under the date; clamped to two lines on compact headlines. */
  description?: string
  /** "Penumbral lunar eclipse" instead of "Penumbral lunar". */
  longEyebrow?: boolean
  /**
   * Narrow screens: icon arrows either side of a short date ("6 Feb 2027"), and the status chip doubles as the
   * way back to the next eclipse. Wide screens get a nav row with the arrows' target dates instead.
   */
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

type StepProps = { dir: 'left' | 'right'; target: EclipseSummary | undefined; onClick: () => void }

const stepLabel = (dir: 'left' | 'right', target: EclipseSummary | undefined) =>
  `${dir === 'left' ? 'Previous' : 'Next'} eclipse${target ? `, ${formatHeadlineDate(target.peakUtc)}` : ''}`

/** Narrow screens: a round icon button either side of the date. */
const StepButton: FC<StepProps> = ({ dir, target, onClick }) => (
  <IconButton
    {...glass}
    aria-label={stepLabel(dir, target)}
    icon={<Chevron dir={dir} />}
    isRound
    flexShrink={0}
    w="44px"
    minW="44px"
    h="44px"
    isDisabled={!target}
    onClick={onClick}
  />
)

/** Wide screens: a pill that shows where it goes, e.g. "‹ 12 Aug 2026". */
const StepPill: FC<StepProps> = ({ dir, target, onClick }) => (
  <Button
    {...glass}
    aria-label={stepLabel(dir, target)}
    h="40px"
    px={3.5}
    borderRadius="full"
    fontSize="sm"
    fontWeight="medium"
    leftIcon={dir === 'left' ? <Chevron dir="left" /> : undefined}
    rightIcon={dir === 'right' ? <Chevron dir="right" /> : undefined}
    iconSpacing={1.5}
    isDisabled={!target}
    onClick={onClick}
  >
    {target ? formatShortDate(target.peakUtc) : dir === 'left' ? 'No earlier eclipse' : 'No later eclipse'}
  </Button>
)

const YearChevron: FC = () => (
  <svg width="0.38em" height="0.38em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'inline', marginLeft: '0.12em', verticalAlign: 'middle', opacity: 0.6 }}>
    <path d="M6 9l6 6 6-6" />
  </svg>
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
      <YearChevron />
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

/** Shown beside the toggle on wide screens while browsing. Compact headlines use the status chip instead. */
export const BackToNext: FC<{ onClick: () => void }> = ({ onClick }) => (
  <Button {...glass} size="sm" h="32px" px={3.5} borderRadius="full" fontWeight="medium" leftIcon={<BackIcon />} onClick={onClick}>
    Back to next eclipse
  </Button>
)

/** Eyebrow (kind · Saros · status), the weekday over the big local date, the prev/next controls, and the description. */
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
  const weekday = formatWeekday(eclipse.peakUtc)
  const date = (
    <>
      {formatDateWithoutYear(eclipse.peakUtc, { short: compact })}{' '}
      <YearPicker year={localYear(eclipse.peakUtc)} years={browse.years} onChange={browse.jumpToYear} />
    </>
  )

  return (
    <Stack spacing={{ base: 2, lg: 3 }}>
      {/* Announces each step. The visible date holds the year picker, whose 100 options must not be read out. */}
      <VisuallyHidden aria-live="polite">
        {`${KIND_LABEL[eclipse.kind]} ${eclipse.type} eclipse, ${formatHeadlineDate(eclipse.peakUtc)}`}
      </VisuallyHidden>
      <HStack spacing={2.5} justify={compact ? 'space-between' : undefined}>
        <HStack spacing={2.5} minW={0}>
          <Box w="8px" h="8px" borderRadius="full" bg={dot} flexShrink={0} />
          <Text
            fontFamily="mono"
            fontSize={{ base: 'xs', lg: 'sm' }}
            letterSpacing={{ base: '0.1em', lg: '0.16em' }}
            textTransform="uppercase"
            color="whiteAlpha.800"
            noOfLines={1}
          >
            {kind} · Saros {eclipse.saros}
          </Text>
        </HStack>
        {browse.phase && <StatusChip phase={browse.phase} isLive={browse.isLive} onReturn={compact ? browse.reset : undefined} />}
      </HStack>

      {compact ? (
        <HStack spacing={2} align="center">
          <StepButton dir="left" target={browse.previous} onClick={browse.prev} />
          <Text as="h2" flex={1} fontSize="3xl" fontWeight="semibold" lineHeight="1.1" letterSpacing="-0.02em" textAlign="center" whiteSpace="nowrap">
            <Text as="span" display="block" fontSize="sm" fontWeight="medium" letterSpacing="normal" color="whiteAlpha.700" mb={1}>
              {weekday}
            </Text>
            {date}
          </Text>
          <StepButton dir="right" target={browse.following} onClick={browse.next} />
        </HStack>
      ) : (
        <>
          <Text as="h2" fontSize="5xl" fontWeight="semibold" lineHeight="1.05" letterSpacing="-0.025em" whiteSpace="nowrap">
            <Text as="span" display="block" fontSize="lg" fontWeight="medium" letterSpacing="normal" color="whiteAlpha.700" mb={1}>
              {weekday}
            </Text>
            {date}
          </Text>
          <HStack as="nav" aria-label="Browse eclipses" justify="space-between" pt={1}>
            <StepPill dir="left" target={browse.previous} onClick={browse.prev} />
            <StepPill dir="right" target={browse.following} onClick={browse.next} />
          </HStack>
        </>
      )}

      {/* Compact headlines reserve two lines (plus the top padding) while the description loads, so nothing below moves. */}
      {(description || compact) && (
        <Text
          minH={compact ? '3.2em' : undefined}
          fontSize={compact ? 'sm' : 'lg'}
          lineHeight={compact ? '1.45' : '1.55'}
          color="whiteAlpha.800"
          maxW="460px"
          pt={compact ? 1 : 2}
          textAlign={compact ? 'center' : undefined}
          noOfLines={compact ? 2 : undefined}
        >
          {description}
        </Text>
      )}
    </Stack>
  )
}
