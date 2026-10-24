import { t } from '../i18n'

export type ShareTargetId = 'link' | 'whatsapp' | 'instagram' | 'facebook' | 'x'

// Brand names stay as they are in every language.
export const shareTargets = (): { id: ShareTargetId; label: string }[] => [
  { id: 'link', label: t('share.copyLink') },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'x', label: 'X' },
]

/** Web share intents. Link and Instagram have none: see `ShareMenu`. */
export function shareIntentUrl(target: 'whatsapp' | 'facebook' | 'x', text: string, url: string): string {
  const e = encodeURIComponent
  switch (target) {
    case 'whatsapp':
      return `https://wa.me/?text=${e(`${text} ${url}`)}`
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${e(url)}`
    case 'x':
      return `https://twitter.com/intent/tweet?text=${e(text)}&url=${e(url)}`
  }
}
