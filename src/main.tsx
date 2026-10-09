import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { theme } from './theme'
import { ChakraProvider, type ChakraProviderProps } from '@chakra-ui/react'

// Always dark, even if an older visit stored "light".
const darkOnly: NonNullable<ChakraProviderProps['colorModeManager']> = { type: 'localStorage', get: () => 'dark', set: () => {} }

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <ChakraProvider theme={theme} colorModeManager={darkOnly}>
        <React.StrictMode>
            <App />
        </React.StrictMode>
    </ChakraProvider>,
)
