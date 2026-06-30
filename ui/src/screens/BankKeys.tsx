import { DataTable, type Field } from '@espresso-lab/mantine-data-table'
import { Code, ScrollArea, Stack, Text } from '@mantine/core'
import { listField } from '../components/fields'
import { Mono } from '../components/ui'
import type { BankKey } from '../types'

const LABEL: Record<string, string> = { X002: 'Authentifikation (X002)', E002: 'Verschlüsselung (E002)' }

const fields: Field<BankKey>[] = [
  listField('type', { accessor: 'type', title: 'Schlüssel', render: (k) => LABEL[k.type] ?? k.type }),
  listField('digest', { accessor: 'digest', title: 'SHA-256-Hash', render: (k) => <Mono value={k.digest} max={64} /> }),
]

export function BankKeys() {
  return (
    <DataTable<BankKey>
      title="Bank-Schlüssel (HPB)"
      titleHint="Die öffentlichen Schlüssel der Mock-Bank, die per HPB ausgeliefert werden. Der Hash dient dem Brief-Abgleich (Ini-Letter)."
      queryKey={['bank-keys']}
      apiPath="/api/bank-keys"
      fields={fields}
      mobileCards
      rowExpansion={{
        content: (record) => (
          <Stack gap={4} p="sm">
            <Text size="xs" fw={600} c="dimmed">PUBLIC KEY (PEM)</Text>
            <ScrollArea h={160}>
              <Code block style={{ fontSize: 11 }}>{record.publicKeyPem}</Code>
            </ScrollArea>
          </Stack>
        ),
      }}
    />
  )
}
