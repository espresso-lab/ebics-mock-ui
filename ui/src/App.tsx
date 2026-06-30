import { useState } from 'react'
import { AppShell, Badge, Group, NavLink, ScrollArea, Text, Title } from '@mantine/core'
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
import { Accounts } from './screens/Accounts'
import { BankKeys } from './screens/BankKeys'
import { Exchanges } from './screens/Exchanges'
import { Orders } from './screens/Orders'
import { Participants } from './screens/Participants'
import { Protocol } from './screens/Protocol'
import { Statements } from './screens/Statements'
import { Veu } from './screens/Veu'

const SECTIONS = [
  { key: 'participants', label: 'Teilnehmer', icon: IconUsers, component: Participants },
  { key: 'accounts', label: 'Konten & Umsätze', icon: IconBuildingBank, component: Accounts },
  { key: 'orders', label: 'Eingereichte Aufträge', icon: IconFileUpload, component: Orders },
  { key: 'statements', label: 'Kontoauszüge', icon: IconFileText, component: Statements },
  { key: 'veu', label: 'VEU / Freigaben', icon: IconWritingSign, component: Veu },
  { key: 'protocol', label: 'Kundenprotokoll', icon: IconChecklist, component: Protocol },
  { key: 'exchanges', label: 'Verkehr (Roh-XML)', icon: IconArrowsExchange, component: Exchanges },
  { key: 'bankKeys', label: 'Bank-Schlüssel', icon: IconKey, component: BankKeys },
] as const

export function App() {
  const [active, setActive] = useState<string>('participants')
  const health = useApiQuery<{ status: string; hostId: string }>(['health'], '/api/health', 10_000)
  const Section = SECTIONS.find((s) => s.key === active)?.component ?? Participants

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
          <Group gap="xs">
            <Badge color={health.data ? 'teal' : 'red'} variant="dot">
              {health.data ? `online · ${health.data.hostId}` : 'offline'}
            </Badge>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="xs">
        <ScrollArea>
          {SECTIONS.map((section) => (
            <NavLink
              key={section.key}
              active={active === section.key}
              label={section.label}
              leftSection={<section.icon size={18} />}
              onClick={() => setActive(section.key)}
            />
          ))}
        </ScrollArea>
        <Text size="xs" c="dimmed" mt="auto" p="xs">
          Lokaler EBICS-3.0-Gegenpart für den banking-service.
        </Text>
      </AppShell.Navbar>

      <AppShell.Main>
        <Section />
      </AppShell.Main>
    </AppShell>
  )
}
