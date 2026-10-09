import { Box, HStack, Text } from '@chakra-ui/react'
import type { FC } from 'react'
import type { EclipseSummary } from '../data/types'
import { GLOBE_COLORS } from '../globe/palette'
import { CENTRAL_PATH_LABEL } from './format'

interface LegendItem {
  label: string
  shortLabel: string
  color: string
  /** Bar for a path, dot for an area. */
  mark: 'dot' | 'bar'
}

/** What the globe is drawing for this eclipse, or nothing when it draws no zones. */
export function legendFor(eclipse: EclipseSummary): LegendItem[] {
  if (!eclipse.hasGeometry) return []
  if (eclipse.type === 'lunar') {
    return [
      { label: 'Moon up for whole eclipse', shortLabel: 'Whole eclipse', color: GLOBE_COLORS.lunarWhole, mark: 'dot' },
      { label: 'Moon up for part', shortLabel: 'Part of it', color: GLOBE_COLORS.lunarPart, mark: 'dot' },
    ]
  }
  const label = CENTRAL_PATH_LABEL[eclipse.kind]
  return label ? [{ label, shortLabel: label, color: GLOBE_COLORS.solarLimits, mark: 'bar' }] : []
}

const Mark: FC<{ item: LegendItem }> = ({ item }) =>
  item.mark === 'bar' ? (
    <Box w="20px" h="5px" borderRadius="full" bg={item.color} flexShrink={0} />
  ) : (
    <Box w="9px" h="9px" borderRadius="full" bg={item.color} flexShrink={0} />
  )

/** Desktop: one glass pill per item. */
export const LegendPills: FC<{ eclipse: EclipseSummary }> = ({ eclipse }) => (
  <>
    {legendFor(eclipse).map((item) => (
      <HStack
        key={item.label}
        spacing={2.5}
        px={4}
        h="36px"
        bg="rgba(10, 11, 20, 0.6)"
        backdropFilter="blur(10px)"
        border="1px solid"
        borderColor="whiteAlpha.200"
        borderRadius="full"
      >
        <Mark item={item} />
        <Text fontSize="sm">{item.label}</Text>
      </HStack>
    ))}
  </>
)

/** Mobile sheet: a single line of short labels. */
export const LegendInline: FC<{ eclipse: EclipseSummary }> = ({ eclipse }) => {
  const items = legendFor(eclipse)
  if (!items.length) return null
  return (
    <HStack spacing={4} flexWrap="wrap">
      {items.map((item) => (
        <HStack key={item.label} spacing={2}>
          <Mark item={item} />
          <Text fontSize="md">{item.shortLabel}</Text>
        </HStack>
      ))}
    </HStack>
  )
}
