import { AppShell, Burger, Container, Group, useMantineTheme } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { Outlet } from '@tanstack/react-router'
import { BankLogo } from './nav/BankLogo'
import { NavDrawer } from './nav/NavDrawer'
import { NavRail } from './nav/NavRail'
import { useNavigation } from './nav/useNavigation'

export function Shell() {
  const nav = useNavigation()
  const { breakpoints } = useMantineTheme()
  const isMobile = useMediaQuery(`(max-width: ${breakpoints.sm})`)

  return (
    <AppShell
      layout={isMobile ? 'default' : 'alt'}
      header={{ height: isMobile ? 60 : 0 }}
      navbar={{ width: nav.navbarWidth, breakpoint: 'sm', collapsed: { mobile: true } }}
      transitionDuration={160}
      transitionTimingFunction="cubic-bezier(0.2, 0.7, 0.2, 1)"
      styles={{ navbar: { overflow: 'visible' } }}
    >
      <AppShell.Header withBorder={false}>
        {isMobile && (
          <Group h={60} px="md" justify="space-between">
            <BankLogo />
            <Burger
              opened={nav.drawerOpened}
              onClick={nav.drawer.toggle}
              hiddenFrom="sm"
              size="sm"
              color="var(--mantine-color-text)"
              aria-label="Menü öffnen"
            />
          </Group>
        )}
      </AppShell.Header>

      <AppShell.Navbar withBorder={false}>{!isMobile && <NavRail nav={nav} />}</AppShell.Navbar>

      <NavDrawer nav={nav} />

      <AppShell.Main bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-8))">
        <Container
          fluid
          py="md"
          mih="100vh"
          pos="relative"
          bg="var(--mantine-color-body)"
          style={{ zIndex: 1, boxShadow: 'var(--mantine-shadow-lg)' }}
        >
          <Outlet />
        </Container>
      </AppShell.Main>
    </AppShell>
  )
}
