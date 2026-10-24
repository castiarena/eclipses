import { HStack, Text } from '@chakra-ui/react'
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
    <Text as="h1" fontSize="lg" fontWeight="semibold" letterSpacing="-0.01em">
      <HStack
        as="button"
        type="button"
        spacing={3}
        onClick={onClick}
        title={t('site.backToNext')}
        borderRadius="md"
        _focusVisible={{ outline: '2px solid', outlineColor: 'accent.300', outlineOffset: '4px' }}
      >
        <EclipseMark size={28} />
        <span>{t('site.name')}</span>
      </HStack>
    </Text>
  )
}
