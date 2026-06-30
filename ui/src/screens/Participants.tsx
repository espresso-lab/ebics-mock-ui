import { useState } from 'react'
import { DataTable, type Field } from '@espresso-lab/mantine-data-table'
import { Button, Group, MultiSelect, Stack, Text } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconUserPlus } from '@tabler/icons-react'
import { useQueryClient } from '@tanstack/react-query'
import { apiPost, apiPut, useApiQuery } from '../api'
import { formField, listField } from '../components/fields'
import { Mono, StateBadge, fmtDateTime } from '../components/ui'
import type { Account, Participant, ParticipantKey } from '../types'

function ParticipantAccounts({ participantId }: { participantId: string }) {
  const queryClient = useQueryClient()
  const accounts = useApiQuery<Account[]>(['accounts'], '/api/accounts')
  const bound = useApiQuery<string[]>(['participant-accounts', participantId], `/api/participants/${participantId}/accounts`)
  const [draft, setDraft] = useState<string[] | null>(null)

  const value = draft ?? bound.data ?? []
  const options = (accounts.data ?? []).map((a) => ({ value: a.id, label: `${a.iban} · ${a.name}` }))

  const onChange = (ids: string[]) => {
    setDraft(ids)
    apiPut(`/api/participants/${participantId}/accounts`, { accountIds: ids })
      .then(() => queryClient.invalidateQueries({ queryKey: ['participant-accounts', participantId] }))
      .catch((error) => notifications.show({ color: 'red', message: `Speichern fehlgeschlagen: ${String(error)}` }))
  }

  return (
    <Stack gap={4} p="sm">
      <Text size="sm" fw={600}>Kontoberechtigungen</Text>
      <MultiSelect
        data={options}
        value={value}
        onChange={onChange}
        placeholder={options.length ? 'Konten auswählen…' : 'Noch keine Konten angelegt'}
        searchable
        clearable
      />
      <Text size="xs" c="dimmed">Bestimmt, welche Konten der Teilnehmer per HTD sieht (leer = alle Konten).</Text>
    </Stack>
  )
}

function SimulateParticipant() {
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)

  const run = async () => {
    setLoading(true)
    try {
      await apiPost('/api/participants/simulate')
      await queryClient.invalidateQueries({ queryKey: ['participants'] })
      notifications.show({ color: 'teal', message: 'Test-Teilnehmer simuliert (INI/HIA/HPB durchlaufen).' })
    } catch (error) {
      notifications.show({ color: 'red', message: `Fehlgeschlagen: ${String(error)}` })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="default" leftSection={<IconUserPlus size={16} />} loading={loading} onClick={run}>
      Test-Teilnehmer
    </Button>
  )
}

function KeyList({ participantId }: { participantId: string }) {
  const { data } = useApiQuery<ParticipantKey[]>(['participant-keys', participantId], `/api/participants/${participantId}/keys`)
  if (!data?.length) return <Text size="sm" c="dimmed" p="sm">Noch keine Schlüssel empfangen.</Text>
  return (
    <Stack gap="xs" p="sm">
      {data.map((key) => (
        <Group key={key.id} gap="sm">
          <Text size="sm" fw={600} w={56}>{key.type}</Text>
          <Text size="xs" c="dimmed">SHA-256</Text>
          <Mono value={key.digest} max={48} />
        </Group>
      ))}
    </Stack>
  )
}

const fields: Field<Participant>[] = [
  formField('partnerId', { accessor: 'partnerId', title: 'Kunden-ID', sortable: true }, { required: true, update: false, delete: true }),
  formField('userId', { accessor: 'userId', title: 'Teilnehmer-ID', sortable: true }, { required: true, update: false }),
  formField('hostId', { accessor: 'hostId', title: 'Host-ID' }, { update: false, placeholder: 'MOCKBANK' }),
  listField('ini', { accessor: 'iniState', title: 'INI', render: (r) => <StateBadge value={r.iniState} /> }),
  listField('hia', { accessor: 'hiaState', title: 'HIA', render: (r) => <StateBadge value={r.hiaState} /> }),
  listField('hpb', { accessor: 'hpbState', title: 'HPB', render: (r) => <StateBadge value={r.hpbState} /> }),
  listField('createdAt', { accessor: 'createdAt', title: 'Angelegt', render: (r) => fmtDateTime(r.createdAt) }),
]

export function Participants() {
  return (
    <DataTable<Participant>
      title="Teilnehmer"
      titleHint="Die Bank legt den Teilnehmer mit Host-/Kunden-/Teilnehmer-ID an und übergibt diese Parameter an den Kunden; dessen banking-service initialisiert ihn dann per INI/HIA/HPB (Status NEW → DONE). »Test-Teilnehmer« simuliert den ganzen Handshake intern."
      queryKey={['participants']}
      apiPath="/api/participants"
      createButtonText="Teilnehmer anlegen"
      buttons={[<SimulateParticipant key="simulate" />]}
      fields={fields}
      selection
      mobileCards
      defaultSort={{ field: 'createdAt', direction: 'desc' }}
      rowExpansion={{
        content: (record) => (
          <Stack gap="xs">
            <KeyList participantId={record.id} />
            <ParticipantAccounts participantId={record.id} />
          </Stack>
        ),
      }}
    />
  )
}
