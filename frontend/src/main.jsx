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
  defaultRadius: 'md',
  colors: {
    // Vert « herbe » — identité fraîcheur de l'appli nutrition
    green: [
      '#EBF3ED',
      '#CBE3D4',
      '#A6D0B6',
      '#7CBC97',
      '#56A87C',
      '#3C9266',
      '#2C7350',
      '#1F573D',
      '#143A29',
      '#0A2117',
    ],
    // Miel — accent chaud, utilisé avec parcimonie (chiffres, mises en avant)
    honey: [
      '#FCF3E2',
      '#F6E2BF',
      '#EFCD93',
      '#E8B866',
      '#E2A744',
      '#D89B33',
      '#B97F26',
      '#92621D',
      '#6B4715',
      '#452D0C',
    ],
  },
  fontFamily: "'DM Sans', system-ui, 'Segoe UI', Roboto, sans-serif",
  fontFamilyMonospace: "'Space Mono', ui-monospace, 'SFMono-Regular', monospace",
  headings: {
    fontFamily: "'Fraunces', Georgia, 'Times New Roman', serif",
    fontWeight: '600',
  },
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
