import { Box, Button } from '@chakra-ui/react'
import type { FC } from 'react'
import type { EclipseType } from '../data/types'
import { TYPE_LABEL } from './format'

const TYPES: EclipseType[] = ['solar', 'lunar']

interface EclipseTypeToggleProps {
  value: EclipseType
  onChange: (type: EclipseType) => void
}

/** Pill-shaped segmented control. */
export const EclipseTypeToggle: FC<EclipseTypeToggleProps> = ({ value, onChange }) => (
  <Box
    role="group"
    aria-label="Eclipse type"
    display="flex"
    w={{ base: 'full', lg: '330px' }}
    p={1}
    gap={1}
    bg="space.800"
    border="1px solid"
    borderColor="whiteAlpha.200"
    borderRadius="full"
  >
    {TYPES.map((type) => {
      const selected = type === value
      return (
        <Button
          key={type}
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
          onClick={() => onChange(type)}
        >
          {TYPE_LABEL[type]}
        </Button>
      )
    })}
  </Box>
)
