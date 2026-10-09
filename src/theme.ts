import { extendTheme, ThemeOverride } from "@chakra-ui/react";

// The design is a night-sky view, so the app is dark only.
const overrideTheme: ThemeOverride = {
    config: {
        initialColorMode: 'dark',
        useSystemColorMode: false
    },
    fonts: {
        heading: "'Sora', system-ui, sans-serif",
        body: "'Sora', system-ui, sans-serif",
        mono: "'JetBrains Mono', ui-monospace, monospace",
    },
    colors: {
        space: {
            900: '#05060b',
            800: '#0b0d16',
        },
        accent: {
            300: '#a08cff',
            400: '#8a73ff',
            500: '#6b4eff',
            600: '#5a3df0',
        },
        lunar: {
            whole: '#b8a6ff',
            part: '#7c5cff',
        },
        solar: {
            path: '#f5c84c',
        },
    },
    styles: {
        global: {
            'html, body': {
                bg: 'space.900',
                color: 'whiteAlpha.900',
            },
        },
    },
}

export const theme = extendTheme(overrideTheme)
