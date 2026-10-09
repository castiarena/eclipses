import { Button, ButtonGroup } from '@chakra-ui/react'
import type { FC } from 'react'
import type { EclipseType } from '../data/types'
import { TYPE_LABEL } from './format'

const TYPES: EclipseType[] = ['solar', 'lunar']

interface EclipseTypeToggleProps {
  value: EclipseType
  onChange: (type: EclipseType) => void
}

export const EclipseTypeToggle: FC<EclipseTypeToggleProps> = ({ value, onChange }) => (
  <ButtonGroup isAttached w="full" aria-label="Eclipse type">
    {TYPES.map((type) => {
      const selected = type === value
      return (
        <Button
          key={type}
          flex={1}
          variant={selected ? 'solid' : 'outline'}
          colorScheme="purple"
          aria-pressed={selected}
          onClick={() => onChange(type)}
        >
          {TYPE_LABEL[type]}
        </Button>
      )
    })}
  </ButtonGroup>
)
