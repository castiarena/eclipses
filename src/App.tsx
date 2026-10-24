import { Box, Divider, Flex, HStack, Stack, Text, useBreakpointValue } from "@chakra-ui/react"
import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, type FC } from "react"
import { Brand } from "./components/Brand"
import { Countdown, EventLine, EventTimes } from "./components/Countdown"
import { EclipseDetails } from "./components/EclipseDetails"
import { BackToNext, EclipseHeadline } from "./components/EclipseHeadline"
import { EclipseTypeToggle } from "./components/EclipseTypeToggle"
import { LegendInline, LegendPills } from "./components/Legend"
import { ShareMenu } from "./components/ShareMenu"
import { MobileSheet } from "./components/MobileSheet"
import { NextSteps, nextSteps } from "./components/NextSteps"
import { formatDuration } from "./components/format"
import { Starfield } from "./components/Starfield"
import { hasAnswer, LocationButton, LocationCard, useMyLocation } from "./components/YourLocation"
import { describeVisibility, type Tense } from "./globe/describe"
import type { Phase } from "./hooks/timeline"
import { useEclipseBrowser } from "./hooks/useEclipseBrowser"
import { useEclipseGeometry } from "./hooks/useEclipseGeometry"
import { useArrowKeys, useSwipe } from "./hooks/useStepInput"
import type { EclipseFilter } from "./data/types"
import { appBase, eclipsePath, parseEclipseId, typeOfId } from "./share/url"

// three.js is large, so the globe is split out and loaded on first render.
const EclipseGlobe = lazy(() => import("./components/EclipseGlobe"))

// The URL carries the view so it can be shared: ?type=lunar for the filter, and /e/<id>/ for a browsed eclipse.
// With no eclipse in the path, a reload returns to the next one.
const readEclipseIdFromUrl = (): string | null => {
    try {
        return parseEclipseId(window.location.pathname, appBase())
    } catch {
        return null
    }
}

const readFilterFromUrl = (): EclipseFilter => {
    try {
        // A shared eclipse shows under its own type, whatever ?type= says.
        const id = readEclipseIdFromUrl()
        if (id) return typeOfId(id)
        const type = new URLSearchParams(window.location.search).get("type")
        return type === "lunar" || type === "all" ? type : "solar"
    } catch {
        return "solar"
    }
}

const writeViewToUrl = (filter: EclipseFilter, eclipseId: string | null) => {
    try {
        const url = new URL(window.location.href)
        url.pathname = eclipseId ? eclipsePath(eclipseId, appBase()) : appBase()
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
    const [sharedId] = useState(readEclipseIdFromUrl)
    const browser = useEclipseBrowser(filter, undefined, sharedId)
    const { eclipse, phase, loading } = browser
    const tense = TENSE[phase ?? "upcoming"]
    const geo = useEclipseGeometry(eclipse?.id, [browser.previous?.id, browser.following?.id])
    const location = useMyLocation(eclipse, geo.geometry, tense)
    const wide = useBreakpointValue({ base: false, lg: true }, { ssr: false }) ?? false
    const swipe = useSwipe(browser.prev, browser.next)
    useArrowKeys(browser.prev, browser.next)

    // Once the data is in, the address names the pinned eclipse; live views and unknown ids go back to the plain page.
    const pinnedId = !loading && eclipse && !browser.isLive ? eclipse.id : null
    useEffect(() => {
        if (!loading) writeViewToUrl(filter, pinnedId)
    }, [loading, filter, pinnedId])

    // Mobile: the sheet opens up to just under the date row, and the globe keeps its subject above the peek.
    const dateRowRef = useRef<HTMLDivElement>(null)
    const [expandedTop, setExpandedTop] = useState(0)
    const [peekHeight, setPeekHeight] = useState(0)
    useLayoutEffect(() => {
        const measure = () => setExpandedTop(dateRowRef.current ? dateRowRef.current.getBoundingClientRect().bottom + window.scrollY : 0)
        measure()
        window.addEventListener("resize", measure)
        return () => window.removeEventListener("resize", measure)
    }, [wide, loading, eclipse?.id])

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
                toPath={location.verdict?.kind === "near-path" ? location.verdict.toPath.to : null}
            />
        </Suspense>
    )

    // Past or far-off eclipses point to where to go next, in the space the tiles would take.
    const steps = useMemo(
        () => (eclipse && phase ? nextSteps(browser.list, eclipse, phase, browser.target, browser.now) : []),
        // The steps only change by the minute, not with every tick of the countdown.
        [browser.list, eclipse, phase, browser.target?.target, Math.floor(browser.now / 60_000)],
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
                        <LocationButton location={location} />
                    </Flex>

                    <Flex flex={1} align="center" py={6} {...passThrough}>
                        <Stack spacing={{ lg: 6, "2xl": 7 }} w="560px" position="relative">
                            {/* The answer to "can I see it from here?", beside the question, over the globe's edge. */}
                            <Box position="absolute" left="calc(100% + 48px)" top="96px">
                                <LocationCard location={location} eclipse={eclipse} tense={tense} />
                            </Box>
                            <HStack spacing={4}>
                                {toggle}
                                {!browser.isLive && <BackToNext onClick={browser.reset} />}
                                {eclipse && <ShareMenu eclipse={eclipse} />}
                            </HStack>
                            <EclipseHeadline eclipse={eclipse} loading={loading} browse={browser} description={description} longEyebrow />
                            {/* The event line belongs to the countdown, so it sits closer to it than the rhythm between sections. */}
                            <Stack spacing={4}>
                                {countdown(false)}
                                <NextSteps steps={steps} onShow={browser.show} />
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

    // The peek's one key fact: the central duration, when there is one. Lunar legends have two items and need the room.
    const keyFact = eclipse ? formatDuration(eclipse.durationSec) : null
    const answered = hasAnswer(location)
    const summary = eclipse && (
        <Stack spacing={2}>
            <HStack justify="space-between" spacing={3}>
                <LegendInline eclipse={eclipse} />
                {keyFact && (
                    <Text fontFamily="mono" fontSize="xs" color="whiteAlpha.700" flexShrink={0} ml="auto">
                        {keyFact}
                    </Text>
                )}
            </HStack>
            <EventTimes eclipse={eclipse} />
            {/* The first next step fits the peak; the rest wait in the open sheet. */}
            <NextSteps steps={steps.slice(0, 1)} onShow={browser.show} compact />
        </Stack>
    )

    return (
        // `clip`, not `hidden`: a hidden box is still a scroll container, so focusing a control could scroll it
        // with no way back. Clipped, it can't scroll; when content is taller than the screen, the page scrolls.
        <Box position="relative" minH="100dvh" overflow="clip">
            <Starfield />
            <Flex position="relative" zIndex={1} direction="column" minH="100dvh" px={5} pt={4}>
                {/* Above the globe, which reaches up behind the countdown (see below). */}
                <Stack spacing={5} position="relative" zIndex={2}>
                    <HStack justify="space-between">
                        <Brand onClick={browser.reset} />
                        <HStack spacing={2}>
                            {eclipse && <ShareMenu eclipse={eclipse} size={36} />}
                            <LocationButton location={location} compact />
                        </HStack>
                    </HStack>
                    {toggle}
                    {/* Swipe left or right here to step; the globe and sheet keep their own drags. */}
                    <Stack spacing={5} {...swipe}>
                        <EclipseHeadline
                            eclipse={eclipse}
                            loading={loading}
                            browse={browser}
                            description={description}
                            compact
                            dateRowRef={dateRowRef}
                        />
                        {countdown(true)}
                    </Stack>
                </Stack>

                {/*
                  Window onto the globe, down to the bottom of the screen. The sheet's peek covers the bottom of it,
                  so the globe's box reaches up by the peek's height: its centre, where the camera aims, then sits in
                  the middle of the part that shows. At least 140 px always shows; on short phones the page scrolls.
                */}
                <Box position="relative" flex={1} minH={`${140 + peekHeight + 12}px`} mx={-5}>
                    <Box position="absolute" left={0} w="100vw" top={`${-(peekHeight + 12)}px`} bottom={0}>
                        {globe(2.2)}
                    </Box>
                </Box>
            </Flex>

            {eclipse && (
                <MobileSheet
                    expandedTop={expandedTop}
                    onPeekHeight={setPeekHeight}
                    header={answered ? <LocationCard location={location} eclipse={eclipse} tense={tense} compact /> : summary}
                >
                    {/* Once the peek holds the location answer, the summary moves into the sheet. */}
                    {answered && summary}
                    <NextSteps steps={steps.slice(1)} onShow={browser.show} compact />
                    <EclipseDetails eclipse={eclipse} compact />
                    <Footnote />
                </MobileSheet>
            )}
        </Box>
    )
}

export default App
