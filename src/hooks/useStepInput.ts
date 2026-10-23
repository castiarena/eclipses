import { useEffect, useRef, type PointerEvent } from 'react'

const SWIPE_MIN_PX = 50
/** How much more horizontal than vertical a drag must be, so page scrolls aren't read as swipes. */
const SWIPE_RATIO = 1.5

/** True when a key press belongs to a form field rather than the page. */
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)
}

/** ←/→ anywhere on the page step back and forward, except inside form fields or with modifiers. */
export function useArrowKeys(onPrev: () => void, onNext: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || isTyping(e.target)) return
      if (e.key === 'ArrowLeft') onPrev()
      else if (e.key === 'ArrowRight') onNext()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onPrev, onNext])
}

/** Swipe direction for a drag, or null when it is too short or too vertical. Swiping left goes later. */
export function swipeDirection(dx: number, dy: number): 'prev' | 'next' | null {
  if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) <= SWIPE_RATIO * Math.abs(dy)) return null
  return dx < 0 ? 'next' : 'prev'
}

/**
 * Touch swipe handlers for one element. Spread the result onto it; it also
 * sets `touch-action: pan-y` so vertical scrolling still belongs to the page.
 */
export function useSwipe(onPrev: () => void, onNext: () => void) {
  const start = useRef<{ x: number; y: number } | null>(null)
  return {
    style: { touchAction: 'pan-y' },
    onPointerDown: (e: PointerEvent) => {
      // Mouse drags select text; only touch and pen swipe.
      start.current = e.pointerType === 'mouse' ? null : { x: e.clientX, y: e.clientY }
    },
    onPointerUp: (e: PointerEvent) => {
      if (!start.current) return
      const direction = swipeDirection(e.clientX - start.current.x, e.clientY - start.current.y)
      start.current = null
      if (direction === 'prev') onPrev()
      else if (direction === 'next') onNext()
    },
    onPointerCancel: () => {
      start.current = null
    },
  }
}
