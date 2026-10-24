import { IconButton, Menu, MenuButton, MenuItem, MenuList, Portal, useToast } from '@chakra-ui/react'
import type { FC, ReactNode } from 'react'
import type { EclipseSummary } from '../data/types'
import { buildMeta } from '../share/meta'
import { SHARE_TARGETS, shareIntentUrl, type ShareTargetId } from '../share/targets'
import { appBase } from '../share/url'

const Icon: FC<{ children: ReactNode }> = ({ children }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)

const ICONS: Record<ShareTargetId, ReactNode> = {
  link: (
    <Icon>
      <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1" />
      <path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" />
    </Icon>
  ),
  whatsapp: (
    <Icon>
      <path d="M3.5 20.5l1.3-4.4A8.5 8.5 0 1 1 8 19.3z" />
      <path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.5-2-1-1 .8c-1-.4-1.9-1.3-2.3-2.3l.8-1-1-2z" />
    </Icon>
  ),
  instagram: (
    <Icon>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" />
    </Icon>
  ),
  facebook: (
    <Icon>
      <path d="M14 8h3V4.5h-3A4 4 0 0 0 10 8.5V11H7.5v3.5H10V21h3.5v-6.5H16.5L17 11h-3.5V8.8c0-.5.2-.8.5-.8z" />
    </Icon>
  ),
  x: (
    <Icon>
      <path d="M4 4l16 16" />
      <path d="M20 4L4 20" />
    </Icon>
  ),
}

const ShareIcon: FC = () => (
  <Icon>
    <circle cx="18" cy="5.5" r="2.5" />
    <circle cx="6" cy="12" r="2.5" />
    <circle cx="18" cy="18.5" r="2.5" />
    <path d="M8.2 10.8l7.6-4.1M8.2 13.2l7.6 4.1" />
  </Icon>
)

/** Writes to the clipboard, with the old textarea route for pages where the async API is blocked. */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const field = document.createElement('textarea')
      field.value = text
      field.setAttribute('readonly', '')
      field.style.position = 'fixed'
      field.style.opacity = '0'
      document.body.appendChild(field)
      field.select()
      const ok = document.execCommand('copy')
      field.remove()
      return ok
    } catch {
      return false
    }
  }
}

const glass = {
  bg: 'rgba(10, 11, 20, 0.6)',
  backdropFilter: 'blur(10px)',
  border: '1px solid',
  borderColor: 'whiteAlpha.300',
  color: 'white',
  _hover: { bg: 'rgba(30, 32, 48, 0.75)' },
  _active: { bg: 'rgba(40, 42, 60, 0.85)' },
} as const

/** Share button with the five ways out: copy the link, WhatsApp, Instagram, Facebook and X. */
export const ShareMenu: FC<{ eclipse: EclipseSummary; size?: number }> = ({ eclipse, size = 40 }) => {
  const toast = useToast()
  const meta = buildMeta(eclipse, window.location.origin, appBase())

  const note = (title: string) => toast({ title, status: 'success', duration: 2500, position: 'bottom' })
  const copy = async (title: string) => {
    const ok = await copyText(meta.url)
    if (ok) note(title)
    else toast({ title: "Couldn't copy the link", description: meta.url, status: 'error', duration: 6000, position: 'bottom' })
  }

  const share = async (id: ShareTargetId) => {
    if (id === 'link') return copy('Link copied')
    if (id === 'instagram') {
      // Instagram takes no links from the web: hand the link to the phone's share sheet, where it can be picked.
      if (typeof navigator.share === 'function') {
        try {
          await navigator.share({ title: meta.title, text: meta.description, url: meta.url })
        } catch {
          // Closing the sheet rejects; nothing to do.
        }
        return
      }
      return copy('Link copied. Paste it in your Instagram bio or story')
    }
    window.open(shareIntentUrl(id, meta.title, meta.url), '_blank', 'noopener,noreferrer')
  }

  return (
    <Menu placement="bottom-start" isLazy>
      <MenuButton
        as={IconButton}
        {...glass}
        aria-label="Share this eclipse"
        icon={<ShareIcon />}
        isRound
        w={`${size}px`}
        minW={`${size}px`}
        h={`${size}px`}
      />
      <Portal>
        <MenuList bg="rgba(10, 11, 20, 0.92)" borderColor="whiteAlpha.300" backdropFilter="blur(10px)" minW="180px" zIndex="popover">
          {SHARE_TARGETS.map(({ id, label }) => (
            <MenuItem key={id} icon={<span>{ICONS[id]}</span>} bg="transparent" _hover={{ bg: 'whiteAlpha.200' }} _focus={{ bg: 'whiteAlpha.200' }} onClick={() => share(id)}>
              {label}
            </MenuItem>
          ))}
        </MenuList>
      </Portal>
    </Menu>
  )
}
