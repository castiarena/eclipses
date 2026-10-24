import { Box, HStack, Text } from '@chakra-ui/react'
import type { FC } from 'react'
import type { EclipseSummary } from '../data/types'
import { GLOBE_COLORS } from '../globe/palette'
import { t } from '../i18n'
import { CENTRAL_PATH_KEY } from './format'

interface LegendItem {
  label: string
  shortLabel: string
  color: string
  /** Bar for a path; a swatch for an area, solid or hatched like its pattern on the globe. */
  mark: 'bar' | 'area' | 'hatched'
}

/** What the globe is drawing for this eclipse, or nothing when it draws no zones. */
export function legendFor(eclipse: EclipseSummary): LegendItem[] {
  if (!eclipse.hasGeometry) return []
  if (eclipse.type === 'lunar') {
    return [
      { label: t('legend.lunarWhole'), shortLabel: t('legend.lunarWholeShort'), color: GLOBE_COLORS.lunarWhole, mark: 'area' },
      { label: t('legend.lunarPart'), shortLabel: t('legend.lunarPartShort'), color: GLOBE_COLORS.lunarHatch, mark: 'hatched' },
    ]
  }
  const key = CENTRAL_PATH_KEY[eclipse.kind as keyof typeof CENTRAL_PATH_KEY]
  if (!key) return []
  const label = t(key)
  return [{ label, shortLabel: label, color: GLOBE_COLORS.solarLimits, mark: 'bar' }]
}

const Mark: FC<{ item: LegendItem }> = ({ item }) => {
  if (item.mark === 'bar') return <Box w="20px" h="5px" borderRadius="full" bg={item.color} flexShrink={0} />
  const swatch = { w: '16px', h: '12px', borderRadius: '3px', flexShrink: 0, border: '1px solid' } as const
  return item.mark === 'area' ? (
    <Box {...swatch} bg={GLOBE_COLORS.lunarWholeFill} borderColor={item.color} />
  ) : (
    <Box
      {...swatch}
      borderColor="rgba(160, 140, 255, 0.5)"
      bg={GLOBE_COLORS.lunarPartFill}
      backgroundImage={`repeating-linear-gradient(-45deg, ${item.color} 0 1.5px, transparent 1.5px 4px)`}
    />
  )
}

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
