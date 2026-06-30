import { DataTable, type Field } from '@espresso-lab/mantine-data-table'
import { Group, Stack, Text } from '@mantine/core'
import { useApiQuery } from '../api'
import { listField } from '../components/fields'
import { Mono, StateBadge, fmtDateTime } from '../components/ui'
import type { Participant, ParticipantKey } from '../types'

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
  listField('partnerId', { accessor: 'partnerId', title: 'Kunden-ID', sortable: true }, { delete: true }),
  listField('userId', { accessor: 'userId', title: 'Teilnehmer-ID', sortable: true }),
  listField('hostId', { accessor: 'hostId', title: 'Host-ID' }),
  listField('ini', { accessor: 'iniState', title: 'INI', render: (r) => <StateBadge value={r.iniState} /> }),
  listField('hia', { accessor: 'hiaState', title: 'HIA', render: (r) => <StateBadge value={r.hiaState} /> }),
  listField('hpb', { accessor: 'hpbState', title: 'HPB', render: (r) => <StateBadge value={r.hpbState} /> }),
  listField('createdAt', { accessor: 'createdAt', title: 'Angelegt', render: (r) => fmtDateTime(r.createdAt) }),
]

export function Participants() {
  return (
    <DataTable<Participant>
      title="Teilnehmer"
      titleHint="INI/HIA/HPB-Status je Teilnehmer. Aufklappen zeigt die empfangenen Schlüssel-Hashes."
      queryKey={['participants']}
      apiPath="/api/participants"
      fields={fields}
      mobileCards
      defaultSort={{ field: 'createdAt', direction: 'desc' }}
      rowExpansion={{ content: (record) => <KeyList participantId={record.id} /> }}
    />
  )
}
