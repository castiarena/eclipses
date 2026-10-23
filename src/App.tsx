import { Box, Divider, Flex, HStack, Stack, Text, useBreakpointValue } from "@chakra-ui/react"
import { lazy, Suspense, useEffect, useMemo, useState, type FC } from "react"
import { Brand } from "./components/Brand"
import { Countdown, EventLine } from "./components/Countdown"
import { EclipseDetails } from "./components/EclipseDetails"
import { BackToNext, EclipseHeadline } from "./components/EclipseHeadline"
import { EclipseTypeToggle } from "./components/EclipseTypeToggle"
import { LegendInline, LegendPills } from "./components/Legend"
import { MobileSheet } from "./components/MobileSheet"
import { Starfield } from "./components/Starfield"
import { LocationButton, LocationMessage, useMyLocation } from "./components/YourLocation"
import { describeVisibility, type Tense } from "./globe/describe"
import type { Phase } from "./hooks/timeline"
import { useEclipseBrowser } from "./hooks/useEclipseBrowser"
import { useEclipseGeometry } from "./hooks/useEclipseGeometry"
import { useArrowKeys, useSwipe } from "./hooks/useStepInput"
import type { EclipseFilter } from "./data/types"

// three.js is large, so the globe is split out and loaded on first render.
const EclipseGlobe = lazy(() => import("./components/EclipseGlobe"))

// The selected filter lives in the URL (?type=lunar) so a view can be shared.
// The browsed eclipse doesn't: a reload returns to the next one.
const readFilterFromUrl = (): EclipseFilter => {
    try {
        const type = new URLSearchParams(window.location.search).get("type")
        return type === "lunar" || type === "all" ? type : "solar"
    } catch {
        return "solar"
    }
}

const writeFilterToUrl = (filter: EclipseFilter) => {
    try {
        const url = new URL(window.location.href)
        url.searchParams.set("type", filter)
        window.history.replaceState(null, "", url)
    } catch {
        // URL state is a convenience; the page works without it.
    }
}

const Footnote: FC = () => (
    <Text fontSize="sm" lineHeight="1.5" color="whiteAlpha.700" maxW="460px">
        Times are UTC-based; those after 2030 are predictions and may shift by a minute or so. Data: NASA GSFC eclipse catalogs (Espenak &amp; Meeus).
    </Text>
)

const RotateIcon: FC = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M20 12a8 8 0 1 1-2.34-5.66" />
        <path d="M20 4v4h-4" />
    </svg>
)

const TENSE: Record<Phase, Tense> = { upcoming: "future", now: "present", past: "past" }

const App = () => {
    const [filter, setFilter] = useState<EclipseFilter>(readFilterFromUrl)
    const browser = useEclipseBrowser(filter)
    const { eclipse, phase, loading } = browser
    const tense = TENSE[phase ?? "upcoming"]
    const geo = useEclipseGeometry(eclipse?.id, [browser.previous?.id, browser.following?.id])
    const location = useMyLocation(eclipse, geo.geometry, tense)
    const wide = useBreakpointValue({ base: false, lg: true }, { ssr: false }) ?? false
    const swipe = useSwipe(browser.prev, browser.next)
    useArrowKeys(browser.prev, browser.next)

    useEffect(() => writeFilterToUrl(filter), [filter])

    const description = useMemo(
        () => (eclipse && !geo.loading ? describeVisibility(eclipse, geo.geometry, tense) : undefined),
        [eclipse, geo.loading, geo.geometry, tense],
    )

    // The globe keeps the last loaded overlay while the next one loads, so its type comes from that overlay.
    const shown = geo.displayGeometry
    const globe = (altitude: number) => (
        <Suspense fallback={null}>
            <EclipseGlobe
                type={shown ? (shown.grid ? "lunar" : "solar") : eclipse?.type ?? "solar"}
                geometry={shown}
                altitude={altitude}
                you={location.position}
            />
        </Suspense>
    )

    const toggle = <EclipseTypeToggle value={filter} onChange={setFilter} onReselect={browser.reset} />
    const countdown = (shortLabels: boolean) => (
        <Countdown
            eclipse={eclipse}
            phase={phase}
            target={browser.target}
            remaining={browser.remaining}
            now={browser.now}
            loading={loading}
            filter={filter}
            pinned={!browser.isLive}
            shortLabels={shortLabels}
        />
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
                        <Brand onClick={browser.reset} />
                        <Box position="relative">
                            <LocationButton location={location} />
                            <Box position="absolute" top="calc(100% + 12px)" right={0}>
                                <LocationMessage location={location} />
                            </Box>
                        </Box>
                    </Flex>

                    <Flex flex={1} align="center" py={6} {...passThrough}>
                        <Stack spacing={{ lg: 6, "2xl": 7 }} w="560px">
                            <HStack spacing={4}>
                                {toggle}
                                {!browser.isLive && <BackToNext onClick={browser.reset} />}
                            </HStack>
                            <EclipseHeadline eclipse={eclipse} loading={loading} browse={browser} description={description} longEyebrow />
                            {/* The event line belongs to the countdown, so it sits closer to it than the rhythm between sections. */}
                            <Stack spacing={4}>
                                {countdown(false)}
                                {eclipse && <EventLine eclipse={eclipse} />}
                            </Stack>
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
                            {/* Same glass as the legend, so it stays readable over the globe's overlays. */}
                            <HStack
                                spacing={2}
                                px={4}
                                h="36px"
                                bg="rgba(10, 11, 20, 0.6)"
                                backdropFilter="blur(10px)"
                                border="1px solid"
                                borderColor="whiteAlpha.200"
                                borderRadius="full"
                                color="whiteAlpha.800"
                                fontFamily="mono"
                                fontSize="xs"
                            >
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
        // `clip`, not `hidden`: a hidden box is still a scroll container, so focusing a control could scroll it
        // with no way back. Clipped, it can't scroll; when content is taller than the screen, the page scrolls.
        <Box position="relative" minH="100dvh" overflow="clip">
            <Starfield />
            <Flex position="relative" zIndex={1} direction="column" minH="100dvh" px={5} pt={4} pb={5}>
                <HStack justify="space-between" mb={5}>
                    <Brand onClick={browser.reset} />
                    <LocationButton location={location} compact />
                </HStack>
                <Stack spacing={5}>
                    {toggle}
                    {/* Swipe left or right here to step; the globe and sheet keep their own drags. */}
                    <Stack spacing={5} {...swipe}>
                        <EclipseHeadline eclipse={eclipse} loading={loading} browse={browser} description={description} compact />
                        {countdown(true)}
                    </Stack>
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
                            <EventLine eclipse={eclipse} />
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
