import { Box, Button } from '@chakra-ui/react'
import type { FC } from 'react'
import type { EclipseFilter } from '../data/types'
import { FILTER_LABEL } from './format'

const FILTERS: EclipseFilter[] = ['solar', 'lunar', 'all']

interface EclipseTypeToggleProps {
  value: EclipseFilter
  onChange: (filter: EclipseFilter) => void
  /** Tapping the option that's already selected; used to go back to the next eclipse. */
  onReselect?: () => void
}

/** Pill-shaped segmented control. */
export const EclipseTypeToggle: FC<EclipseTypeToggleProps> = ({ value, onChange, onReselect }) => (
  <Box
    role="group"
    aria-label="Eclipse type"
    display="flex"
    w={{ base: 'full', lg: '360px' }}
    p={1}
    gap={1}
    bg="space.800"
    border="1px solid"
    borderColor="whiteAlpha.200"
    borderRadius="full"
  >
    {FILTERS.map((filter) => {
      const selected = filter === value
      return (
        <Button
          key={filter}
          flex={1}
          h={{ base: '44px', lg: '46px' }}
          borderRadius="full"
          fontSize="md"
          fontWeight="semibold"
          bg={selected ? 'accent.500' : 'transparent'}
          color={selected ? 'white' : 'whiteAlpha.800'}
          _hover={{ bg: selected ? 'accent.600' : 'whiteAlpha.100' }}
          _active={{ bg: selected ? 'accent.600' : 'whiteAlpha.200' }}
          aria-pressed={selected}
          onClick={() => (selected ? onReselect?.() : onChange(filter))}
        >
          {FILTER_LABEL[filter]}
        </Button>
      )
    })}
  </Box>
)
