import { Box, chakra, HStack, Menu, MenuButton, MenuItem, MenuList, Portal, Text } from '@chakra-ui/react'
import type { FC, MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { currentLocale } from '../i18n'
import { ALL_LOCALES, LOCALES, type Locale } from '../i18n/locales'
import { appBase, pathInLocale } from '../share/url'

const GlobeIcon: FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
  </svg>
)

const Chevron: FC = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
    <path d="M6 9l6 6 6-6" />
  </svg>
)

const Check: FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12l5 5 9-10" />
  </svg>
)

/** "es" -> "ES", the short form the button shows. */
const code = (locale: Locale) => locale.toUpperCase()

/** The page being viewed, eclipse and `?type=` included, in another locale. */
const hrefIn = (locale: Locale) => {
  const { pathname, search, hash } = window.location
  return `${pathInLocale(pathname, locale, appBase())}${search}${hash}`
}

// Same glass as the location and share buttons beside it.
const glass = {
  h: '44px',
  borderRadius: 'full',
  bg: 'rgba(10, 11, 20, 0.6)',
  backdropFilter: 'blur(10px)',
  border: '1px solid',
  borderColor: 'whiteAlpha.300',
  color: 'white',
  fontFamily: 'mono',
  fontWeight: 'medium',
  _hover: { bg: 'rgba(30, 32, 48, 0.75)' },
  _active: { bg: 'rgba(40, 42, 60, 0.85)' },
  _expanded: { bg: 'rgba(30, 32, 48, 0.85)', borderColor: 'accent.300' },
} as const

/**
 * Sits in the header beside "Check my location". Wide screens show a globe, the language code and a chevron;
 * compact ones a round button with the code. The menu lists every locale by its own name, the current one
 * checked. Each item is a real link, so the page reloads with its catalog and prerendered head; the href is
 * read again on click, since the address changes as the viewer browses.
 */
export const LanguageSwitcher: FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { t } = useTranslation()
  const current = currentLocale()
  const go = (locale: Locale) => (e: MouseEvent) => {
    e.preventDefault()
    if (locale !== current) window.location.assign(hrefIn(locale))
  }

  return (
    <Menu placement="bottom-end" isLazy>
      <MenuButton
        as={chakra.button}
        type="button"
        aria-label={`${t('site.language')}: ${LOCALES[current].label}`}
        flexShrink={0}
        {...glass}
        {...(compact ? { w: '44px', fontSize: 'sm' } : { px: 4, fontSize: 'sm' })}
      >
        {compact ? (
          code(current)
        ) : (
          <HStack spacing={2}>
            <GlobeIcon />
            <Text as="span">{code(current)}</Text>
            <Chevron />
          </HStack>
        )}
      </MenuButton>
      <Portal>
        <MenuList bg="rgba(10, 11, 20, 0.95)" borderColor="whiteAlpha.300" backdropFilter="blur(10px)" minW="220px" p={1.5} zIndex="popover">
          {ALL_LOCALES.map((locale) => {
            const selected = locale === current
            return (
              <MenuItem
                key={locale}
                as="a"
                href={hrefIn(locale)}
                hrefLang={locale}
                lang={locale}
                onClick={go(locale)}
                // Chakra fixes the role to "menuitem", so the current one is marked as current, not checked.
                aria-current={selected ? 'true' : undefined}
                h={compact ? '48px' : '44px'}
                px={3}
                borderRadius="md"
                fontWeight={selected ? 'semibold' : 'normal'}
                bg={selected ? 'whiteAlpha.200' : 'transparent'}
                _hover={{ bg: 'whiteAlpha.200' }}
                _focus={{ bg: 'whiteAlpha.200' }}
              >
                <HStack w="full" justify="space-between">
                  <HStack spacing={2.5}>
                    {/* Keeps names aligned whether or not they carry the check. */}
                    <Box w="16px" color="accent.300">
                      {selected && <Check />}
                    </Box>
                    <Text as="span">{LOCALES[locale].label}</Text>
                  </HStack>
                  <Text as="span" fontFamily="mono" fontSize="xs" color="whiteAlpha.700">
                    {code(locale)}
                  </Text>
                </HStack>
              </MenuItem>
            )
          })}
        </MenuList>
      </Portal>
    </Menu>
  )
}
