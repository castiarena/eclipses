import { Container, Heading, Spinner, Stack, Text } from "@chakra-ui/react"
import { lazy, Suspense, useEffect, useState } from "react"
import { Countdown } from "./components/Countdown"
import { EclipseInfo } from "./components/EclipseInfo"
import { YourLocation } from "./components/YourLocation"
import { EclipseTypeToggle } from "./components/EclipseTypeToggle"
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

const App = () => {
    const [type, setType] = useState<EclipseType>(readTypeFromUrl)
    const { eclipse, remaining, loading } = useEclipseCountdown(type)
    const geo = useEclipseGeometry(eclipse?.id)

    useEffect(() => writeTypeToUrl(type), [type])

    return (
        <Container maxW="container.md" w="full" px={4} py={{ base: 6, md: 12 }}>
            <Stack spacing={6} minW={0}>
                <Heading size="lg">Next eclipse</Heading>
                <EclipseTypeToggle value={type} onChange={setType} />
                <Countdown type={type} remaining={remaining} loading={loading} />
                <Suspense fallback={<Spinner aria-label="Loading globe" />}>
                    {geo.loading ? (
                        <Spinner aria-label="Loading visibility map" />
                    ) : (
                        <EclipseGlobe type={type} geometry={geo.geometry} />
                    )}
                </Suspense>
                <EclipseInfo eclipse={eclipse} loading={loading} />
                {geo.geometry && <YourLocation type={type} geometry={geo.geometry} />}
                <Text fontSize="xs" opacity={0.6}>
                    Times are UTC-based. Data: NASA GSFC eclipse catalogs (Espenak &amp; Meeus).
                </Text>
            </Stack>
        </Container>
    )
}

export default App
