import { Box, Text } from '@chakra-ui/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import Globe, { type GlobeMethods } from 'react-globe.gl'
import type { EclipseGeometry, EclipseType } from '../data/types'
import { buildLayers, centerOf } from '../globe/layers'

const MAX_HEIGHT = 560

const COLORS = {
  full: 'rgba(124, 58, 237, 0.85)',
  partial: 'rgba(192, 132, 252, 0.45)',
  central: 'rgba(250, 204, 21, 0.35)',
  limits: 'rgba(250, 204, 21, 0.9)',
  centerline: '#fde047',
}

const hasWebGL = (): boolean => {
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
  } catch {
    return false
  }
}

const LEGEND: Record<EclipseType, { label: string; color: string }[]> = {
  solar: [
    { label: 'Path of totality / annularity', color: COLORS.central },
    { label: 'Centre line', color: COLORS.centerline },
  ],
  lunar: [
    { label: 'Moon up for the whole eclipse', color: COLORS.full },
    { label: 'Moon up for part of it', color: COLORS.partial },
  ],
}

interface EclipseGlobeProps {
  type: EclipseType
  geometry: EclipseGeometry | null
}

export default function EclipseGlobe({ type, geometry }: EclipseGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const globeRef = useRef<GlobeMethods>()
  const [width, setWidth] = useState(0)
  const [ready, setReady] = useState(false)
  const webgl = useMemo(hasWebGL, [])

  // Track the container width so the globe fills the column on phones.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const layers = useMemo(() => (geometry ? buildLayers(geometry) : null), [geometry])
  const center = useMemo(() => (geometry ? centerOf(geometry) : null), [geometry])

  // Slow spin while idle; turn off once an eclipse is shown and the camera is aimed at it.
  useEffect(() => {
    if (!ready || !globeRef.current) return
    const controls = globeRef.current.controls()
    controls.autoRotate = !center
    controls.autoRotateSpeed = 0.4
  }, [ready, center])

  useEffect(() => {
    if (!ready || !globeRef.current || !center) return
    globeRef.current.pointOfView({ lat: center.lat, lng: center.lng, altitude: 2 }, 1200)
  }, [ready, center])

  if (!webgl) {
    return <Text>This view needs WebGL, which this browser does not provide.</Text>
  }

  const height = Math.min(Math.max(width, 0), MAX_HEIGHT)

  return (
    // minW=0 and overflow hidden stop the canvas from widening its own container.
    <Box
      ref={containerRef}
      w="full"
      minW={0}
      overflow="hidden"
      aria-label={`Globe showing ${type} eclipse visibility`}
      role="img"
    >
      {width > 0 && (
        <Globe
          ref={globeRef}
          width={width}
          height={height}
          backgroundColor="rgba(0,0,0,0)"
          globeImageUrl="/textures/earth-blue-marble.jpg"
          showAtmosphere
          atmosphereColor="#a78bfa"
          atmosphereAltitude={0.15}
          onGlobeReady={() => setReady(true)}
          // Lunar: grid points colored by zone.
          pointsData={layers?.points ?? []}
          pointLat="lat"
          pointLng="lng"
          pointAltitude={0.01}
          pointRadius={0.35}
          pointColor={(p: object) => (p as { zone: string }).zone === 'full' ? COLORS.full : COLORS.partial}
          // Solar: central path fill, outline and centre line.
          polygonsData={layers?.polygons ?? []}
          polygonGeoJsonGeometry={(d: object) => (d as { geometry: { type: string; coordinates: number[] } }).geometry}
          polygonCapColor={() => COLORS.central}
          polygonSideColor={() => 'rgba(0,0,0,0)'}
          polygonAltitude={0.005}
          pathsData={layers?.paths.map((p) => p.points) ?? []}
          pathPointLat={(p: object) => (p as { lat: number }).lat}
          pathPointLng={(p: object) => (p as { lng: number }).lng}
          pathColor={() => COLORS.limits}
          pathStroke={1.2}
          pathPointAlt={0.006}
        />
      )}
      {geometry && (
        <Box mt={3} display="flex" gap={4} flexWrap="wrap" fontSize="sm">
          {LEGEND[type].map((item) => (
            <Box key={item.label} display="flex" alignItems="center" gap={2}>
              <Box w={3} h={3} borderRadius="sm" bg={item.color} />
              <Text>{item.label}</Text>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  )
}
