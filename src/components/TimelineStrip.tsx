import { Box, Text } from '@chakra-ui/react'
import { useMemo, type FC } from 'react'
import type { EclipseSummary } from '../data/types'
import { GLOBE_COLORS } from '../globe/palette'
import { localYear, timelineStrip } from '../hooks/timeline'
import { t } from '../i18n'
import { formatSpan } from './format'

const COLOR = { solar: GLOBE_COLORS.solarLimits, lunar: GLOBE_COLORS.lunarWhole }

const pct = (x: number) => `${x * 100}%`

const Mono: FC<{ children: string; color?: string }> = ({ children, color = 'whiteAlpha.600' }) => (
  <Text as="span" fontFamily="mono" fontSize="2xs" letterSpacing="0.12em" textTransform="uppercase" color={color} whiteSpace="nowrap">
    {children}
  </Text>
)

interface TimelineStripProps {
  list: EclipseSummary[]
  index: number
  now: number
  /** Narrow screens: thinner, without the year and "Now" labels inside the window. */
  compact?: boolean
}

/**
 * About 18 months either side of the shown eclipse: a dot per eclipse in the filter, the shown one large,
 * a line at now and the stretch between them highlighted. The arrows and status chip carry the same
 * information for screen readers, so the strip is hidden from them.
 */
export const TimelineStrip: FC<TimelineStripProps> = ({ list, index, now, compact = false }) => {
  // The strip only moves visibly by the minute, not on every one-second tick.
  const minute = Math.floor(now / 60_000) * 60_000
  const strip = useMemo(() => timelineStrip(list, index, minute), [list, index, minute])
  if (!strip) return null

  const height = compact ? 22 : 40
  const mid = height / 2
  const selectedSize = compact ? 14 : 16

  return (
    <Box position="relative" h={`${height}px`} mx={compact ? 2 : 3} aria-hidden="true">
      {/* The track stops where the catalog does. */}
      <Box
        position="absolute"
        left={strip.catalogStart === null ? 0 : `calc(${pct(strip.catalogStart)} - 8px)`}
        right={strip.catalogEnd === null ? 0 : `calc(${pct(1 - strip.catalogEnd)} - 8px)`}
        top={`${mid - 1}px`}
        h="2px"
        borderRadius="full"
        bg="whiteAlpha.200"
      />
      <Box position="absolute" left={pct(strip.span.from)} w={pct(strip.span.to - strip.span.from)} top={`${mid - 1}px`} h="2px" bg="whiteAlpha.400" />

      {[strip.catalogStart, strip.catalogEnd].map(
        (x, i) =>
          x !== null && (
            <Box key={i} position="absolute" left={pct(x)} top={`${mid - 10}px`} h="20px" w="2px" ml={i === 0 ? '-8px' : '6px'} bg="whiteAlpha.400" />
          ),
      )}

      {strip.dots.map((d) => (
        <Box
          key={d.id}
          position="absolute"
          left={pct(d.x)}
          top={`${mid}px`}
          transform="translate(-50%, -50%)"
          w={d.selected ? `${selectedSize}px` : '8px'}
          h={d.selected ? `${selectedSize}px` : '8px'}
          borderRadius="full"
          bg={COLOR[d.type]}
          opacity={d.selected ? 1 : 0.5}
          boxShadow={d.selected ? `0 0 0 ${compact ? 3 : 4}px ${COLOR[d.type]}40` : undefined}
        />
      ))}

      {'x' in strip.now ? (
        <>
          <Box position="absolute" left={pct(strip.now.x)} top={`${mid - (compact ? 9 : 12)}px`} h={compact ? '18px' : '24px'} w="2px" ml="-1px" bg="white" />
          {!compact && (
            <Box position="absolute" left={pct(strip.now.x)} top="-12px" transform="translateX(-50%)">
              <Mono color="whiteAlpha.800">{t('timeline.now')}</Mono>
            </Box>
          )}
        </>
      ) : (
        <Box
          position="absolute"
          {...(strip.now.edge === 'start' ? { left: 0 } : { right: 0 })}
          top={compact ? `${height}px` : `${height - 4}px`}
        >
          <Mono color="whiteAlpha.800">
            {strip.now.edge === 'start'
              ? t('timeline.nowBack', { span: formatSpan(strip.now.distanceMs) })
              : t('timeline.nowAhead', { span: formatSpan(strip.now.distanceMs) })}
          </Mono>
        </Box>
      )}

      {!compact && 'x' in strip.now && (
        <>
          <Box position="absolute" left={0} top={`${height - 4}px`}>
            <Mono>{String(localYear(new Date(strip.fromMs).toISOString()))}</Mono>
          </Box>
          <Box position="absolute" right={0} top={`${height - 4}px`}>
            <Mono>{String(localYear(new Date(strip.toMs).toISOString()))}</Mono>
          </Box>
        </>
      )}
    </Box>
  )
}
