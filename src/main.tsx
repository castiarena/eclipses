import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { theme } from './theme'
import { ChakraProvider, type ChakraProviderProps } from '@chakra-ui/react'
import { switchLocale } from './i18n'
import { appBase, localeFromPath } from './share/url'

// Always dark, even if an older visit stored "light".
const darkOnly: NonNullable<ChakraProviderProps['colorModeManager']> = { type: 'localStorage', get: () => 'dark', set: () => {} }

// The path names the language (/es/…); its catalog loads before the first render, so no text flashes in English.
const locale = localeFromPath(window.location.pathname, appBase())
document.documentElement.lang = locale

switchLocale(locale).then(() =>
    ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
        <ChakraProvider theme={theme} colorModeManager={darkOnly}>
            <React.StrictMode>
                <App />
            </React.StrictMode>
        </ChakraProvider>,
    ),
)
