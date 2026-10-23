import { Box, Text } from '@chakra-ui/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import Globe, { type GlobeMethods } from 'react-globe.gl'
import type { EclipseGeometry, EclipseType } from '../data/types'
import { CanvasTexture, MeshBasicMaterial, SRGBColorSpace } from 'three'
import { buildLayers, centerOf, type Region } from '../globe/layers'
import { paintZones } from '../globe/zoneTexture'
import { GLOBE_COLORS } from '../globe/palette'
import type { Point } from '../globe/visibility'

// Camera moves are instant for people who asked for less motion.
const flightMs = (): number =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : 1200

const hasWebGL = (): boolean => {
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
  } catch {
    return false
  }
}

interface EclipseGlobeProps {
  /** Type of the eclipse `geometry` belongs to (it can lag one step behind the headline). */
  type: EclipseType
  /** Drawn as is; the camera flies to it each time a new one arrives. */
  geometry: EclipseGeometry | null
  /** Camera distance in globe radii; smaller is closer. */
  altitude: number
  /** Viewer's position, marked with a "You" pin. */
  you?: Point | null
  /** Nearest point of the path, when the viewer is near it: a dashed line runs there from the pin. */
  toPath?: Point | null
}

/** Lunar zones are painted onto one equirectangular texture this size, draped over the globe as a single tile. */
const ZONE_TEXTURE = { width: 2048, height: 1024 }
const WHOLE_GLOBE_TILE = [{ lat: 0, lng: 0, width: 360, height: 180 }]

function zoneMaterial(zones: Region[]) {
  const canvas = document.createElement('canvas')
  canvas.width = ZONE_TEXTURE.width
  canvas.height = ZONE_TEXTURE.height
  const ctx = canvas.getContext('2d')
  if (ctx) {
    paintZones(ctx, zones, {
      wholeFill: GLOBE_COLORS.lunarWholeFill,
      partFill: GLOBE_COLORS.lunarPartFill,
      hatch: GLOBE_COLORS.lunarHatch,
    })
  }
  const map = new CanvasTexture(canvas)
  map.colorSpace = SRGBColorSpace
  return new MeshBasicMaterial({ map, transparent: true, depthWrite: false })
}

/** The "You" pin: a solid white marker with a label, drawn as HTML over the globe so it stays crisp. */
function youMarker(): HTMLElement {
  const el = document.createElement('div')
  el.setAttribute('aria-hidden', 'true')
  el.style.cssText = 'display:flex;align-items:flex-end;gap:4px;transform:translate(-11px,-100%);pointer-events:none;'
  el.innerHTML =
    '<svg width="22" height="28" viewBox="0 0 22 28"><path d="M11 27s-10-9-10-16a10 10 0 0 1 20 0c0 7-10 16-10 16z" fill="#fff"/><circle cx="11" cy="11" r="4" fill="#05060b"/></svg>' +
    '<span style="margin-bottom:12px;padding:2px 8px;border-radius:999px;background:#fff;color:#05060b;font:600 12px Sora,system-ui,sans-serif">You</span>'
  return el
}

/** Fills its parent. The parent decides where the globe sits and how much of it shows. */
export default function EclipseGlobe({ type, geometry, altitude, you = null, toPath = null }: EclipseGlobeProps) {
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
  const markers = useMemo(() => (you ? [you] : []), [you])
  const zones = useMemo(() => (layers?.zones.length ? zoneMaterial(layers.zones) : null), [layers])
  useEffect(
    () => () => {
      zones?.map?.dispose()
      zones?.dispose()
    },
    [zones],
  )
  const paths = useMemo(() => {
    const base: { zone: string; points: Point[] }[] = layers?.paths ?? []
    return you && toPath ? [...base, { zone: 'toPath', points: [you, toPath] }] : base
  }, [layers, you, toPath])

  // Slow spin while idle; turn off once an eclipse is shown and the camera is aimed at it.
  useEffect(() => {
    if (!ready || !globeRef.current) return
    const controls = globeRef.current.controls()
    controls.autoRotate = !center
    controls.autoRotateSpeed = 0.4
  }, [ready, center])

  useEffect(() => {
    if (!ready || !globeRef.current || !center) return
    globeRef.current.pointOfView({ lat: center.lat, lng: center.lng, altitude }, flightMs())
  }, [ready, center, altitude])

  useEffect(() => {
    if (!ready || !globeRef.current || !you) return
    globeRef.current.pointOfView({ lat: you.lat, lng: you.lng, altitude }, flightMs())
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
          // Lunar: the zones, painted onto one texture over the whole globe.
          tilesData={zones ? WHOLE_GLOBE_TILE : []}
          tileLat="lat"
          tileLng="lng"
          tileWidth="width"
          tileHeight="height"
          tileAltitude={0.004}
          tileMaterial={() => zones!}
          tileCurvatureResolution={2}
          // Solar: central path fill, outline and centre line.
          polygonsData={layers?.polygons ?? []}
          polygonGeoJsonGeometry={(d: object) => (d as { geometry: { type: string; coordinates: number[] } }).geometry}
          polygonCapColor={() => GLOBE_COLORS.solarFill}
          polygonSideColor={() => 'rgba(0,0,0,0)'}
          polygonAltitude={0.005}
          pathsData={paths}
          pathPoints="points"
          pathPointLat={(p: object) => (p as { lat: number }).lat}
          pathPointLng={(p: object) => (p as { lng: number }).lng}
          pathColor={(p: object) => {
            const zone = (p as { zone: string }).zone
            return zone === 'toPath' ? GLOBE_COLORS.you : zone === 'centerline' ? GLOBE_COLORS.solarCentre : GLOBE_COLORS.solarLimits
          }}
          pathStroke={(p: object) => {
            const zone = (p as { zone: string }).zone
            return zone === 'toPath' ? 0.8 : zone === 'centerline' ? 0.6 : 1.6
          }}
          // Only the line from the pin to the path is dashed.
          pathDashLength={(p: object) => ((p as { zone: string }).zone === 'toPath' ? 0.06 : 1)}
          pathDashGap={(p: object) => ((p as { zone: string }).zone === 'toPath' ? 0.04 : 0)}
          pathPointAlt={0.006}
          // The viewer's position after "Check my location".
          htmlElementsData={markers}
          htmlLat="lat"
          htmlLng="lng"
          htmlAltitude={0.01}
          htmlElement={youMarker}
        />
      )}
    </Box>
  )
}
