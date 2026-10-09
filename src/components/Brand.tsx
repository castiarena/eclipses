import { HStack, Text } from '@chakra-ui/react'
import type { FC } from 'react'

/** A thin gold ring with a gap, like a crescent catching the light. */
const EclipseMark: FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
    <circle
      cx="16"
      cy="16"
      r="12"
      fill="none"
      stroke="#f5c84c"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeDasharray="56 20"
      transform="rotate(-30 16 16)"
    />
  </svg>
)

export const Brand: FC = () => (
  <HStack spacing={3}>
    <EclipseMark size={28} />
    <Text as="h1" fontSize="lg" fontWeight="semibold" letterSpacing="-0.01em">
      Next eclipse
    </Text>
  </HStack>
)
