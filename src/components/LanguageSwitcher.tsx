import { Button, Menu, MenuButton, MenuItem, MenuList, Portal } from '@chakra-ui/react'
import type { FC, MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { currentLocale } from '../i18n'
import { ALL_LOCALES, LOCALES, type Locale } from '../i18n/locales'
import { appBase, pathInLocale } from '../share/url'

const GlobeIcon: FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
  </svg>
)

/** The page being viewed, eclipse and `?type=` included, in another locale. */
const hrefIn = (locale: Locale) => {
  const { pathname, search, hash } = window.location
  return `${pathInLocale(pathname, locale, appBase())}${search}${hash}`
}

/**
 * Lists every locale by its own name. Each is a real link, so the page reloads with its catalog and
 * prerendered head; the href is read again on click, since the address changes as the viewer browses.
 */
export const LanguageSwitcher: FC = () => {
  const { t } = useTranslation()
  const current = currentLocale()
  const go = (locale: Locale) => (e: MouseEvent) => {
    e.preventDefault()
    window.location.assign(hrefIn(locale))
  }

  return (
    <Menu placement="top-start" isLazy>
      <MenuButton
        as={Button}
        aria-label={`${t('site.language')}: ${LOCALES[current].label}`}
        leftIcon={<GlobeIcon />}
        size="sm"
        h="36px"
        px={4}
        flexShrink={0}
        borderRadius="full"
        bg="rgba(10, 11, 20, 0.6)"
        backdropFilter="blur(10px)"
        border="1px solid"
        borderColor="whiteAlpha.200"
        color="whiteAlpha.800"
        fontFamily="mono"
        fontSize="xs"
        fontWeight="normal"
        _hover={{ bg: 'rgba(30, 32, 48, 0.75)' }}
        _active={{ bg: 'rgba(40, 42, 60, 0.85)' }}
      >
        {LOCALES[current].label}
      </MenuButton>
      <Portal>
        <MenuList bg="rgba(10, 11, 20, 0.92)" borderColor="whiteAlpha.300" backdropFilter="blur(10px)" minW="160px" zIndex="popover">
          {ALL_LOCALES.map((locale) => (
            <MenuItem
              key={locale}
              as="a"
              href={hrefIn(locale)}
              hrefLang={locale}
              lang={locale}
              onClick={go(locale)}
              aria-current={locale === current ? 'true' : undefined}
              fontWeight={locale === current ? 'semibold' : 'normal'}
              bg="transparent"
              _hover={{ bg: 'whiteAlpha.200' }}
              _focus={{ bg: 'whiteAlpha.200' }}
            >
              {LOCALES[locale].label}
            </MenuItem>
          ))}
        </MenuList>
      </Portal>
    </Menu>
  )
}
