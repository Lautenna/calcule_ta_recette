import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MantineProvider, createTheme } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import './index.css'
import App from './App.jsx'

const theme = createTheme({
  primaryColor: 'green',
  colors: {
    green: [
      '#EAF2EC',
      '#C5DDD0',
      '#9ECAB5',
      '#6ABFA0',
      '#4DB882',
      '#3D8B65',
      '#2E6B4D',
      '#1F4D37',
      '#133323',
      '#081A11',
    ],
  },
  fontFamily: "system-ui, 'Segoe UI', Roboto, sans-serif",
})

const queryClient = new QueryClient()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MantineProvider theme={theme}>
      <Notifications />
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </MantineProvider>
  </StrictMode>,
)
