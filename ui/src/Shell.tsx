import { AppShell, Badge, Group, NavLink, ScrollArea, Text, Title } from '@mantine/core'
import { Link, Outlet, useRouterState } from '@tanstack/react-router'
import {
  IconArrowsExchange,
  IconBuildingBank,
  IconChecklist,
  IconFileText,
  IconFileUpload,
  IconKey,
  IconUsers,
  IconWritingSign,
} from '@tabler/icons-react'
import { useApiQuery } from './api'

const NAV = [
  { path: '/', label: 'Teilnehmer', icon: IconUsers },
  { path: '/accounts', label: 'Konten & Umsätze', icon: IconBuildingBank },
  { path: '/orders', label: 'Eingereichte Aufträge', icon: IconFileUpload },
  { path: '/statements', label: 'Kontoauszüge', icon: IconFileText },
  { path: '/veu', label: 'VEU / Freigaben', icon: IconWritingSign },
  { path: '/protocol', label: 'Kundenprotokoll', icon: IconChecklist },
  { path: '/exchanges', label: 'Verkehr (Roh-XML)', icon: IconArrowsExchange },
  { path: '/bank-keys', label: 'Bank-Schlüssel', icon: IconKey },
] as const

export function Shell() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const health = useApiQuery<{ status: string; hostId: string }>(['health'], '/api/health', 10_000)

  return (
    <AppShell header={{ height: 60 }} navbar={{ width: 250, breakpoint: 'sm' }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="xs">
            <IconBuildingBank size={22} />
            <Title order={4}>EBICS Mock Bank</Title>
            <Badge variant="light" color="indigo">
              H005
            </Badge>
          </Group>
          <Badge color={health.data ? 'teal' : 'red'} variant="dot">
            {health.data ? `online · ${health.data.hostId}` : 'offline'}
          </Badge>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="xs">
        <ScrollArea>
          {NAV.map((item) => (
            <NavLink
              key={item.path}
              active={pathname === item.path}
              label={item.label}
              leftSection={<item.icon size={18} />}
              renderRoot={(props) => <Link to={item.path} {...props} />}
            />
          ))}
        </ScrollArea>
        <Text size="xs" c="dimmed" mt="auto" p="xs">
          Lokaler EBICS-3.0-Gegenpart für den banking-service.
        </Text>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  )
}
