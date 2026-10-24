import { Box, Stack } from '@chakra-ui/react'
import { useEffect, useRef, useState, type FC, type PointerEvent, type ReactNode } from 'react'
import { t } from '../i18n'

/** Gap between the sheet and the screen's bottom and sides, and under the content it opens up to. */
const GAP = 12
/** A drag faster than this (px/ms) decides the direction, however short it was. */
const FLICK = 0.5
/** Movement under this many px counts as a tap. */
const TAP = 5

interface Snap {
  wasOpen: boolean
  /** How far the finger moved; positive is down. */
  dragPx: number
  /** Speed when let go, px/ms; positive is down. */
  velocity: number
  /** Distance between the peek and expanded heights. */
  travelPx: number
}

/** Whether the sheet ends up open when a drag ends: a flick decides, otherwise the nearer state. */
export function snapOpen({ wasOpen, dragPx, velocity, travelPx }: Snap): boolean {
  if (Math.abs(velocity) > FLICK) return velocity < 0
  const opened = (wasOpen ? travelPx : 0) - dragPx
  return opened > travelPx / 2
}

interface MobileSheetProps {
  /** Always visible under the handle: the peek. */
  header: ReactNode
  /** Shown when the sheet is dragged or tapped open. */
  children: ReactNode
  /** Distance from the top of the screen that the expanded sheet opens up to. */
  expandedTop: number
  /** Reports the peek's height, so the page can keep the globe's subject above it. */
  onPeekHeight?: (height: number) => void
}

/**
 * Glass sheet pinned to the bottom of the screen. It starts as a peek (the handle and `header`) so the globe
 * stays visible; dragging or tapping opens it up to `expandedTop`, where the rest scrolls inside it.
 */
export const MobileSheet: FC<MobileSheetProps> = ({ header, children, expandedTop, onPeekHeight }) => {
  const [open, setOpen] = useState(false)
  const [drag, setDrag] = useState<number | null>(null)
  const [peekHeight, setPeekHeight] = useState(0)
  const [contentHeight, setContentHeight] = useState(0)
  const [viewport, setViewport] = useState(() => window.innerHeight)
  const peekRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const gesture = useRef<{ y: number; t: number; lastY: number; lastT: number } | null>(null)

  useEffect(() => {
    const onResize = () => setViewport(window.innerHeight)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    const peek = peekRef.current
    const content = contentRef.current
    if (!peek || !content) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const h = Math.ceil(entry.borderBoxSize[0].blockSize)
        if (entry.target === peek) setPeekHeight(h)
        else setContentHeight(h)
      }
    })
    observer.observe(peek)
    observer.observe(content)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (peekHeight) onPeekHeight?.(peekHeight)
  }, [peekHeight, onPeekHeight])

  // As tall as its content, but never above `expandedTop`; past that the content scrolls.
  const expandedHeight = Math.max(peekHeight, Math.min(peekHeight + contentHeight + 2, viewport - expandedTop - 2 * GAP))
  const travel = expandedHeight - peekHeight
  const base = open ? expandedHeight : peekHeight
  const height = drag === null ? base : Math.min(expandedHeight, Math.max(peekHeight, base - drag))

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    gesture.current = { y: e.clientY, t: e.timeStamp, lastY: e.clientY, lastT: e.timeStamp }
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current
    if (!g) return
    const moved = e.clientY - g.y
    // Keep the last sample a little behind, so the release speed reflects the end of the drag.
    if (e.timeStamp - g.lastT > 40) {
      g.lastY = e.clientY
      g.lastT = e.timeStamp
    }
    if (drag !== null || Math.abs(moved) > TAP) setDrag(moved)
  }

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current
    gesture.current = null
    if (!g) return
    const moved = e.clientY - g.y
    setDrag(null)
    if (Math.abs(moved) <= TAP) {
      // A tap on the peek opens or closes it; the handle button does the same through its own click.
      if (!(e.target as HTMLElement).closest('button')) setOpen((v) => !v)
      return
    }
    const velocity = (e.clientY - g.lastY) / Math.max(1, e.timeStamp - g.lastT)
    setOpen(snapOpen({ wasOpen: open, dragPx: moved, velocity, travelPx: travel }))
  }

  return (
    <Box
      position="fixed"
      left={`${GAP}px`}
      right={`${GAP}px`}
      bottom={`${GAP}px`}
      zIndex={3}
      h={peekHeight ? `${height}px` : undefined}
      transition={drag === null ? 'height 0.3s ease' : 'none'}
      sx={{ '@media (prefers-reduced-motion: reduce)': { transition: 'none' } }}
      display="flex"
      flexDirection="column"
      overflow="clip"
      bg="rgba(22, 22, 34, 0.82)"
      backdropFilter="blur(18px)"
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="3xl"
      boxShadow="0 -12px 40px rgba(0, 0, 0, 0.35)"
    >
      <Box
        ref={peekRef}
        flexShrink={0}
        px={4}
        pt={2}
        pb={4}
        cursor="grab"
        // The page must not scroll, nor text get selected, while the peek is dragged.
        sx={{ touchAction: 'none', userSelect: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          gesture.current = null
          setDrag(null)
        }}
      >
        <Box
          as="button"
          type="button"
          aria-label={t(open ? 'sheet.hide' : 'sheet.show')}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          display="block"
          w="full"
          py={2}
          mb={1}
        >
          <Box w="36px" h="4px" mx="auto" borderRadius="full" bg="whiteAlpha.400" />
        </Box>
        {header}
      </Box>
      {/* Hidden from keyboard and screen readers while only the peek shows. */}
      <Box flex={1} minH={0} overflowY="auto" visibility={open || drag !== null ? 'visible' : 'hidden'}>
        <Box ref={contentRef} px={4} pb={5}>
          <Stack spacing={4}>{children}</Stack>
        </Box>
      </Box>
    </Box>
  )
}
