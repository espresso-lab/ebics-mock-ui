import { Fragment } from 'react'
import {
  ActionIcon,
  AppShell,
  Badge,
  Burger,
  Button,
  Container,
  CopyButton,
  Divider,
  Group,
  NavLink,
  ScrollArea,
  Stack,
  Text,
  Title,
  Tooltip,
  UnstyledButton,
  useComputedColorScheme,
  useMantineColorScheme,
  useMantineTheme,
} from '@mantine/core'
import { useDisclosure, useLocalStorage, useMediaQuery } from '@mantine/hooks'
import { Link, Outlet, useRouterState } from '@tanstack/react-router'
import {
  IconArrowsExchange,
  IconBuildingBank,
  IconCheck,
  IconChecklist,
  IconChevronLeft,
  IconChevronRight,
  IconCopy,
  IconFileText,
  IconFileUpload,
  type Icon,
  IconKey,
  IconMoon,
  IconSun,
  IconUsers,
  IconWritingSign,
} from '@tabler/icons-react'
import classes from './Shell.module.css'
import { useApiQuery } from './api'
import { bankUrl } from './config'

interface NavItemDef {
  path: string
  label: string
  icon: Icon
}

const SECTIONS: { label: string; items: NavItemDef[] }[] = [
  {
    label: 'Teilnehmer',
    items: [
      { path: '/', label: 'Teilnehmer', icon: IconUsers },
      { path: '/bank-keys', label: 'Bank-Schlüssel', icon: IconKey },
    ],
  },
  {
    label: 'Zahlungsverkehr',
    items: [
      { path: '/accounts', label: 'Konten & Umsätze', icon: IconBuildingBank },
      { path: '/statements', label: 'Kontoauszüge', icon: IconFileText },
      { path: '/orders', label: 'Eingereichte Aufträge', icon: IconFileUpload },
      { path: '/veu', label: 'VEU / Freigaben', icon: IconWritingSign },
    ],
  },
  {
    label: 'Protokoll',
    items: [
      { path: '/protocol', label: 'Kundenprotokoll', icon: IconChecklist },
      { path: '/exchanges', label: 'Verkehr (Roh-XML)', icon: IconArrowsExchange },
    ],
  },
]

function NavItem({ item, collapsed, active, onNavigate }: { item: NavItemDef; collapsed: boolean; active: boolean; onNavigate: () => void }) {
  const ItemIcon = item.icon
  if (collapsed) {
    return (
      <Tooltip label={item.label} position="right" offset={14} withArrow>
        <UnstyledButton
          component={Link}
          to={item.path}
          onClick={onNavigate}
          className={classes.railLink}
          data-active={active || undefined}
          aria-label={item.label}
        >
          <ItemIcon size={20} stroke={1.7} />
        </UnstyledButton>
      </Tooltip>
    )
  }
  return (
    <NavLink
      component={Link}
      to={item.path}
      active={active}
      leftSection={<ItemIcon size={19} stroke={1.7} />}
      classNames={{ root: classes.root, label: classes.label }}
      label={item.label}
      onClick={onNavigate}
    />
  )
}

export function Shell() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const health = useApiQuery<{ status: string; hostId: string }>(['health'], '/api/health', 10_000)
  const { setColorScheme } = useMantineColorScheme()
  const scheme = useComputedColorScheme('light', { getInitialValueInEffect: true })
  const [opened, { toggle, close }] = useDisclosure()
  const [collapsed, setCollapsed] = useLocalStorage({ key: 'ebics-mock-nav-collapsed', defaultValue: false, getInitialValueInEffect: false })
  const { breakpoints } = useMantineTheme()
  const isMobile = useMediaQuery(`(max-width: ${breakpoints.sm})`)

  const rail = collapsed && !isMobile
  const navbarWidth = isMobile ? 240 : collapsed ? 76 : 250
  const onNavigate = () => {
    if (isMobile) close()
  }

  return (
    <AppShell
      layout={isMobile ? 'default' : 'alt'}
      header={{ height: isMobile ? 60 : 0 }}
      navbar={{ width: navbarWidth, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      styles={{ navbar: { transition: 'width 200ms ease' }, main: { transition: 'padding 200ms ease' } }}
      padding="md"
    >
      <AppShell.Header withBorder={false}>
        {isMobile && (
          <Group h="100%" px="md" justify="space-between">
            <Group gap="xs">
              <IconBuildingBank size={22} />
              <Title order={5}>EBICS Mock Bank</Title>
            </Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          </Group>
        )}
      </AppShell.Header>

      <AppShell.Navbar withBorder>
        {!isMobile && (
          <AppShell.Section>
            <Group gap="xs" px={rail ? 4 : 'md'} py="md" justify={rail ? 'center' : 'flex-start'} wrap="nowrap">
              <IconBuildingBank size={24} />
              {!rail && (
                <>
                  <Title order={5}>EBICS Mock Bank</Title>
                  <Badge variant="light" color="brand" size="sm">
                    H005
                  </Badge>
                </>
              )}
            </Group>
          </AppShell.Section>
        )}

        <AppShell.Section grow component={ScrollArea}>
          <Stack gap={2} py="sm" px={rail ? 'xs' : 'sm'} align={rail ? 'center' : 'stretch'}>
            {SECTIONS.map((section, index) => (
              <Fragment key={section.label}>
                {rail ? (
                  index > 0 && <Divider my={6} w="55%" />
                ) : (
                  <Text className={classes.sectionLabel} mt={index === 0 ? 0 : 'sm'}>
                    {section.label}
                  </Text>
                )}
                {section.items.map((item) => (
                  <NavItem key={item.path} item={item} collapsed={rail} active={pathname === item.path} onNavigate={onNavigate} />
                ))}
              </Fragment>
            ))}
          </Stack>
        </AppShell.Section>

        <AppShell.Section className={classes.footer} data-collapsed={rail || undefined}>
          <Stack gap="xs" align={rail ? 'center' : 'stretch'}>
            {rail ? (
              <Tooltip label={health.data ? `online · ${health.data.hostId}` : 'offline'} position="right" withArrow>
                <Badge color={health.data ? 'brand' : 'red'} variant="dot" size="xs" />
              </Tooltip>
            ) : (
              <Badge color={health.data ? 'brand' : 'red'} variant="dot" size="sm">
                {health.data ? `online · ${health.data.hostId}` : 'offline'}
              </Badge>
            )}
            <Group gap="xs" justify={rail ? 'center' : 'flex-start'} wrap="nowrap">
              <Tooltip label="Farbschema umschalten" position={rail ? 'right' : 'top'} withArrow>
                <ActionIcon
                  variant="default"
                  size="lg"
                  aria-label="Farbschema umschalten"
                  onClick={() => setColorScheme(scheme === 'dark' ? 'light' : 'dark')}
                >
                  {scheme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
                </ActionIcon>
              </Tooltip>
              <CopyButton value={bankUrl} timeout={1500}>
                {({ copied, copy }) =>
                  rail ? (
                    <Tooltip label={copied ? 'Kopiert!' : 'Bank-URL kopieren'} position="right" withArrow>
                      <ActionIcon variant="default" size="lg" onClick={copy} aria-label="Bank-URL kopieren">
                        {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                      </ActionIcon>
                    </Tooltip>
                  ) : (
                    <Tooltip label={copied ? 'Kopiert!' : bankUrl} withArrow>
                      <Button variant="default" flex={1} onClick={copy} leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}>
                        Bank-URL
                      </Button>
                    </Tooltip>
                  )
                }
              </CopyButton>
            </Group>
          </Stack>
        </AppShell.Section>
      </AppShell.Navbar>

      {!isMobile && (
        <Tooltip label={collapsed ? 'Menü ausklappen' : 'Menü einklappen'} position="right" offset={8} withArrow>
          <ActionIcon
            onClick={() => setCollapsed((value) => !value)}
            variant="default"
            radius="xl"
            size={26}
            aria-label="Menü ein- oder ausklappen"
            style={{
              position: 'fixed',
              top: 16,
              left: 'calc(var(--app-shell-navbar-width) - 13px)',
              zIndex: 101,
              boxShadow: 'var(--mantine-shadow-sm)',
              transition: 'left 200ms ease',
            }}
          >
            {collapsed ? <IconChevronRight size={15} /> : <IconChevronLeft size={15} />}
          </ActionIcon>
        </Tooltip>
      )}

      <AppShell.Main bg="var(--mantine-color-gray-0)">
        <Container fluid p="md" mih="100%" bg="var(--mantine-color-body)" style={{ borderRadius: 'var(--mantine-radius-md)', boxShadow: 'var(--mantine-shadow-sm)' }}>
          <Outlet />
        </Container>
      </AppShell.Main>
    </AppShell>
  )
}
