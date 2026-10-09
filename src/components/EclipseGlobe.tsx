import { Box, Text } from '@chakra-ui/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import Globe, { type GlobeMethods } from 'react-globe.gl'
import type { EclipseGeometry, EclipseType } from '../data/types'
import { buildLayers, centerOf } from '../globe/layers'
import { GLOBE_COLORS } from '../globe/palette'
import type { Point } from '../globe/visibility'

const hasWebGL = (): boolean => {
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
  } catch {
    return false
  }
}

interface EclipseGlobeProps {
  type: EclipseType
  geometry: EclipseGeometry | null
  /** Camera distance in globe radii; smaller is closer. */
  altitude: number
  /** Viewer's position, marked with a pulsing ring. */
  you?: Point | null
}

/** Fills its parent. The parent decides where the globe sits and how much of it shows. */
export default function EclipseGlobe({ type, geometry, altitude, you = null }: EclipseGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const globeRef = useRef<GlobeMethods>()
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [ready, setReady] = useState(false)
  const webgl = useMemo(hasWebGL, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) =>
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height }),
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const layers = useMemo(() => (geometry ? buildLayers(geometry) : null), [geometry])
  const center = useMemo(() => (geometry ? centerOf(geometry) : null), [geometry])
  const rings = useMemo(() => (you ? [you] : []), [you])

  // Slow spin while idle; turn off once an eclipse is shown and the camera is aimed at it.
  useEffect(() => {
    if (!ready || !globeRef.current) return
    const controls = globeRef.current.controls()
    controls.autoRotate = !center
    controls.autoRotateSpeed = 0.4
  }, [ready, center])

  useEffect(() => {
    if (!ready || !globeRef.current || !center) return
    globeRef.current.pointOfView({ lat: center.lat, lng: center.lng, altitude }, 1200)
  }, [ready, center, altitude])

  useEffect(() => {
    if (!ready || !globeRef.current || !you) return
    globeRef.current.pointOfView({ lat: you.lat, lng: you.lng, altitude }, 1200)
  }, [ready, you, altitude])

  if (!webgl) {
    return (
      <Box h="full" display="flex" alignItems="center" justifyContent="center" p={8}>
        <Text opacity={0.7}>This view needs WebGL, which this browser does not provide.</Text>
      </Box>
    )
  }

  return (
    <Box
      ref={containerRef}
      w="full"
      h="full"
      overflow="hidden"
      opacity={ready ? 1 : 0}
      transition="opacity 0.8s ease"
      aria-label={`Globe showing ${type} eclipse visibility`}
      role="img"
    >
      {size.width > 0 && size.height > 0 && (
        <Globe
          ref={globeRef}
          width={size.width}
          height={size.height}
          backgroundColor="rgba(0,0,0,0)"
          globeImageUrl={`${import.meta.env.BASE_URL}textures/earth-blue-marble.jpg`}
          showAtmosphere
          atmosphereColor={GLOBE_COLORS.atmosphere}
          atmosphereAltitude={0.12}
          onGlobeReady={() => setReady(true)}
          // Lunar: grid points colored by zone.
          pointsData={layers?.points ?? []}
          pointLat="lat"
          pointLng="lng"
          pointAltitude={0.003}
          pointRadius={0.62}
          pointResolution={8}
          pointColor={(p: object) =>
            (p as { zone: string }).zone === 'full' ? GLOBE_COLORS.lunarWhole : GLOBE_COLORS.lunarPart
          }
          // Solar: central path fill, outline and centre line.
          polygonsData={layers?.polygons ?? []}
          polygonGeoJsonGeometry={(d: object) => (d as { geometry: { type: string; coordinates: number[] } }).geometry}
          polygonCapColor={() => GLOBE_COLORS.solarFill}
          polygonSideColor={() => 'rgba(0,0,0,0)'}
          polygonAltitude={0.005}
          pathsData={layers?.paths ?? []}
          pathPoints="points"
          pathPointLat={(p: object) => (p as { lat: number }).lat}
          pathPointLng={(p: object) => (p as { lng: number }).lng}
          pathColor={(p: object) =>
            (p as { zone: string }).zone === 'centerline' ? GLOBE_COLORS.solarCentre : GLOBE_COLORS.solarLimits
          }
          pathStroke={(p: object) => ((p as { zone: string }).zone === 'centerline' ? 0.6 : 1.6)}
          pathPointAlt={0.006}
          // The viewer's position after "Check my location".
          ringsData={rings}
          ringLat="lat"
          ringLng="lng"
          ringColor={() => (t: number) => `rgba(255, 255, 255, ${1 - t})`}
          ringMaxRadius={4}
          ringPropagationSpeed={2}
          ringRepeatPeriod={1200}
        />
      )}
    </Box>
  )
}
