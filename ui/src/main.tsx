import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MantineProvider, createTheme } from '@mantine/core'
import { DatesProvider } from '@mantine/dates'
import { Notifications } from '@mantine/notifications'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DataTableProvider } from '@espresso-lab/mantine-data-table'
import 'dayjs/locale/de'
import '@mantine/core/styles.css'
import '@mantine/dates/styles.css'
import '@mantine/notifications/styles.css'
import 'mantine-datatable/styles.css'
import './index.css'
import { App } from './App'
import { API_BASE, getHeaders } from './config'

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 15_000, retry: 1 } } })

const theme = createTheme({
  primaryColor: 'indigo',
  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  defaultRadius: 'md',
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <DatesProvider settings={{ locale: 'de' }}>
        <Notifications />
        <QueryClientProvider client={queryClient}>
          <DataTableProvider baseUrl={API_BASE} queryClient={queryClient} getHeaders={getHeaders}>
            <App />
          </DataTableProvider>
        </QueryClientProvider>
      </DatesProvider>
    </MantineProvider>
  </StrictMode>,
)
