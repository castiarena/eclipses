import { extendTheme, ThemeOverride } from "@chakra-ui/react";

const overrideTheme: ThemeOverride = {
    config: {
        initialColorMode: 'system',
        useSystemColorMode: false
    }
}

export const theme = extendTheme(overrideTheme)