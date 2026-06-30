import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MantineProvider } from '@mantine/core'
import { DatesProvider } from '@mantine/dates'
import { Notifications } from '@mantine/notifications'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { DataTableProvider } from '@espresso-lab/mantine-data-table'
import 'dayjs/locale/de'
import '@mantine/core/styles.css'
import '@mantine/dates/styles.css'
import '@mantine/notifications/styles.css'
import 'mantine-datatable/styles.css'
import './index.css'
import { router } from './routes'
import { theme } from './theme'
import { API_BASE, getHeaders } from './config'

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 15_000, retry: 1 } } })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <DatesProvider settings={{ locale: 'de' }}>
        <Notifications />
        <QueryClientProvider client={queryClient}>
          <DataTableProvider baseUrl={API_BASE} queryClient={queryClient} getHeaders={getHeaders}>
            <RouterProvider router={router} />
          </DataTableProvider>
        </QueryClientProvider>
      </DatesProvider>
    </MantineProvider>
  </StrictMode>,
)
