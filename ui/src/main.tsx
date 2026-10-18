import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { DatesProvider } from "@mantine/dates";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { DataTableProvider } from "@espresso-lab/mantine-data-table";
import "dayjs/locale/de";
import "@mantine/core/styles.layer.css";
import "@mantine/dates/styles.layer.css";
import "@mantine/notifications/styles.css";
import "mantine-datatable/styles.layer.css";
import "./global.css";
import { bankTheme } from "./bankTheme.ts";
import { API_BASE, getHeaders } from "./config.ts";
import { router } from "./Router.tsx";
import { cssVariablesResolver } from "./Theme.tsx";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 15_000, retry: 1 } },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MantineProvider
      theme={bankTheme}
      cssVariablesResolver={cssVariablesResolver}
      defaultColorScheme="auto"
    >
      <DatesProvider settings={{ locale: "de" }}>
        <QueryClientProvider client={queryClient}>
          <DataTableProvider
            baseUrl={API_BASE}
            queryClient={queryClient}
            getHeaders={getHeaders}
          >
            <ModalsProvider>
              <Notifications layout="stacked" />
              <RouterProvider router={router} />
            </ModalsProvider>
          </DataTableProvider>
        </QueryClientProvider>
      </DatesProvider>
    </MantineProvider>
  </StrictMode>,
);
