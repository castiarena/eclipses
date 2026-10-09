import { Box } from '@chakra-ui/react'
import { memo } from 'react'

const WIDTH = 1600
const HEIGHT = 1000
const COUNT = 160

/** Small seeded generator so the sky looks the same on every render and visit. */
function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

const STARS = (() => {
  const rand = seeded(7)
  return Array.from({ length: COUNT }, () => ({
    x: rand() * WIDTH,
    y: rand() * HEIGHT,
    r: rand() < 0.9 ? 0.7 : 1.3,
    o: 0.15 + rand() * 0.45,
  }))
})()

/** Faint fixed stars behind everything. */
export const Starfield = memo(() => (
  <Box position="fixed" inset={0} zIndex={0} pointerEvents="none" aria-hidden="true">
    <svg width="100%" height="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="xMidYMid slice">
      {STARS.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={s.o} />
      ))}
    </svg>
  </Box>
))
