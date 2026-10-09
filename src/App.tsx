import { Box, Divider, Flex, HStack, Stack, Text, useBreakpointValue } from "@chakra-ui/react"
import { lazy, Suspense, useEffect, useMemo, useState, type FC } from "react"
import { Brand } from "./components/Brand"
import { Countdown } from "./components/Countdown"
import { EclipseDetails } from "./components/EclipseDetails"
import { EclipseHeadline } from "./components/EclipseHeadline"
import { EclipseTypeToggle } from "./components/EclipseTypeToggle"
import { LegendInline, LegendPills } from "./components/Legend"
import { MobileSheet } from "./components/MobileSheet"
import { Starfield } from "./components/Starfield"
import { LocationButton, LocationMessage, useMyLocation } from "./components/YourLocation"
import { describeVisibility } from "./globe/describe"
import { useEclipseCountdown } from "./hooks/useEclipseCountdown"
import { useEclipseGeometry } from "./hooks/useEclipseGeometry"
import type { EclipseType } from "./data/types"

// three.js is large, so the globe is split out and loaded on first render.
const EclipseGlobe = lazy(() => import("./components/EclipseGlobe"))

// The selected type lives in the URL (?type=lunar) so a view can be shared.
const readTypeFromUrl = (): EclipseType => {
    try {
        return new URLSearchParams(window.location.search).get("type") === "lunar" ? "lunar" : "solar"
    } catch {
        return "solar"
    }
}

const writeTypeToUrl = (type: EclipseType) => {
    try {
        const url = new URL(window.location.href)
        url.searchParams.set("type", type)
        window.history.replaceState(null, "", url)
    } catch {
        // URL state is a convenience; the page works without it.
    }
}

const Footnote: FC = () => (
    <Text fontSize="sm" lineHeight="1.5" color="whiteAlpha.700" maxW="460px">
        Times are UTC-based. Data: NASA GSFC eclipse catalogs (Espenak &amp; Meeus).
    </Text>
)

const RotateIcon: FC = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M20 12a8 8 0 1 1-2.34-5.66" />
        <path d="M20 4v4h-4" />
    </svg>
)

const App = () => {
    const [type, setType] = useState<EclipseType>(readTypeFromUrl)
    const { eclipse, remaining, loading } = useEclipseCountdown(type)
    const geo = useEclipseGeometry(eclipse?.id)
    const location = useMyLocation(type, geo.geometry)
    const wide = useBreakpointValue({ base: false, lg: true }, { ssr: false }) ?? false

    useEffect(() => writeTypeToUrl(type), [type])

    const description = useMemo(
        () => (eclipse && !geo.loading ? describeVisibility(eclipse, geo.geometry) : undefined),
        [eclipse, geo.loading, geo.geometry],
    )

    const globe = (altitude: number) => (
        <Suspense fallback={null}>
            <EclipseGlobe type={type} geometry={geo.geometry} altitude={altitude} you={location.position} />
        </Suspense>
    )

    if (wide) {
        // Rows let clicks through to the globe; only their contents catch the pointer.
        const passThrough = { pointerEvents: "none", sx: { "& > *": { pointerEvents: "auto" } } } as const
        return (
            <Box position="relative" minH="100dvh" overflowX="clip">
                <Starfield />
                {/* Globe sits right of centre and taller than the screen, so its edges are cropped. */}
                <Box position="fixed" top="-3vh" h="115vh" left="22vw" w="100vw" zIndex={0}>
                    {globe(1.5)}
                </Box>

                <Flex
                    position="relative"
                    zIndex={1}
                    direction="column"
                    minH="100dvh"
                    px={{ lg: 16, xl: 20 }}
                    py={10}
                    {...passThrough}
                >
                    <Flex justify="space-between" align="flex-start" {...passThrough}>
                        <Brand />
                        <Box position="relative">
                            <LocationButton location={location} />
                            <Box position="absolute" top="calc(100% + 12px)" right={0}>
                                <LocationMessage location={location} />
                            </Box>
                        </Box>
                    </Flex>

                    <Flex flex={1} align="center" py={10} {...passThrough}>
                        <Stack spacing={{ lg: 6, "2xl": 7 }} w="560px">
                            <EclipseTypeToggle value={type} onChange={setType} />
                            <EclipseHeadline eclipse={eclipse} loading={loading} description={description} longEyebrow />
                            <Countdown type={type} remaining={remaining} loading={loading} />
                            {eclipse && (
                                <>
                                    <Divider borderColor="whiteAlpha.200" />
                                    <EclipseDetails eclipse={eclipse} />
                                </>
                            )}
                        </Stack>
                    </Flex>

                    <Flex justify="space-between" align="flex-end" gap={6} {...passThrough}>
                        <Footnote />
                        <HStack spacing={3} flexShrink={0}>
                            {eclipse && <LegendPills eclipse={eclipse} />}
                            <HStack spacing={2} pl={2} color="whiteAlpha.600" fontFamily="mono" fontSize="xs">
                                <RotateIcon />
                                <Text>Drag to rotate · Scroll to zoom</Text>
                            </HStack>
                        </HStack>
                    </Flex>
                </Flex>
            </Box>
        )
    }

    return (
        <Box position="relative" minH="100dvh" overflow="hidden">
            <Starfield />
            <Flex position="relative" zIndex={1} direction="column" minH="100dvh" px={5} pt={4} pb={5}>
                <HStack justify="space-between" mb={5}>
                    <Brand />
                    <LocationButton location={location} compact />
                </HStack>
                <Stack spacing={5}>
                    <EclipseTypeToggle value={type} onChange={setType} />
                    <EclipseHeadline eclipse={eclipse} loading={loading} />
                    <Countdown type={type} remaining={remaining} loading={loading} shortLabels />
                    <LocationMessage location={location} />
                </Stack>

                {/* Window onto the globe; the globe runs on behind the sheet below. */}
                <Box position="relative" flex={1} minH="180px" mx={-5}>
                    <Box position="absolute" top={4} left={0} w="100vw" h="160vw" maxH="760px">
                        {globe(1.5)}
                    </Box>
                </Box>

                {eclipse && (
                    <MobileSheet header={<LegendInline eclipse={eclipse} />}>
                        <Stack spacing={5}>
                            <EclipseDetails eclipse={eclipse} compact />
                            <Footnote />
                        </Stack>
                    </MobileSheet>
                )}
            </Flex>
        </Box>
    )
}

export default App
