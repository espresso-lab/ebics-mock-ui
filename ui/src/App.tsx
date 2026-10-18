import { AppShell, Burger, Container, Group, useMantineTheme } from "@mantine/core";
import { useMediaQuery, useReducedMotion } from "@mantine/hooks";
import { Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { BreadcrumbProvider } from "@espresso-lab/mantine-data-table";
import { BankLogo } from "./Components/Logo/BankLogo.tsx";
import { NavSidebar } from "./Components/Navigation/Navigation.tsx";
import { NavDrawer } from "./Components/Navigation/NavDrawer.tsx";
import {
  RAIL_WIDTH,
  SIDEBAR_WIDTH,
  useNavigation,
} from "./Components/Navigation/useNavigation.ts";

export function App() {
  const nav = useNavigation();
  const { breakpoints } = useMantineTheme();
  const isMobile = useMediaQuery(`(max-width: ${breakpoints.md})`);
  const reduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const onOverview = useLocation({ select: (location) => location.pathname === "/" });
  const trail = onOverview
    ? []
    : [{ label: "Übersicht", onClick: () => navigate({ to: "/" }) }];

  return (
    <AppShell
      layout={isMobile ? "default" : "alt"}
      header={{ height: isMobile ? 60 : 0 }}
      navbar={{
        width: nav.rail ? RAIL_WIDTH : SIDEBAR_WIDTH,
        breakpoint: "md",
        collapsed: { mobile: true },
      }}
      transitionDuration={reduceMotion ? 0 : 200}
      transitionTimingFunction="cubic-bezier(0.2, 0.7, 0.2, 1)"
      styles={{
        navbar: { transitionProperty: "transform, top, height, width" },
      }}
    >
      <AppShell.Header withBorder={false}>
        {isMobile && (
          <Group h={60} px="md" justify="space-between">
            <BankLogo size={32} />
            <Burger
              opened={nav.drawerOpened}
              onClick={nav.drawer.toggle}
              hiddenFrom="md"
              size="sm"
              color="var(--mantine-color-text)"
              aria-label="Menü öffnen"
            />
          </Group>
        )}
      </AppShell.Header>

      <AppShell.Navbar withBorder={false}>
        {!isMobile && <NavSidebar nav={nav} />}
      </AppShell.Navbar>

      <NavDrawer nav={nav} />

      <AppShell.Main bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-8))">
        <Container fluid py="md">
          <BreadcrumbProvider trail={trail}>
            <Outlet />
          </BreadcrumbProvider>
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
