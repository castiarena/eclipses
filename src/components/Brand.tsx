import { Box, HStack, Text } from '@chakra-ui/react'
import type { FC } from 'react'
import { useTranslation } from 'react-i18next'

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

/** The site name. Clicking it goes back to the next eclipse. */
export const Brand: FC<{ onClick?: () => void }> = ({ onClick }) => {
  const { t } = useTranslation()
  return (
    // 16 px on phones, where it shares the top bar with three 44 px buttons. minW 0 lets a longer name (other
    // languages) truncate beside them instead of pushing them out.
    <Text as="h1" fontSize={{ base: 'md', lg: 'lg' }} fontWeight="semibold" letterSpacing="-0.01em" minW={0}>
      <HStack
        as="button"
        type="button"
        spacing={3}
        maxW="full"
        onClick={onClick}
        title={t('site.backToNext')}
        borderRadius="md"
        _focusVisible={{ outline: '2px solid', outlineColor: 'accent.300', outlineOffset: '4px' }}
      >
        <Box flexShrink={0} display="flex">
          <EclipseMark size={28} />
        </Box>
        <Text as="span" noOfLines={1} textAlign="left">
          {t('site.name')}
        </Text>
      </HStack>
    </Text>
  )
}
