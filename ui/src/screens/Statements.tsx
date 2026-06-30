import { DataTable, type Field } from '@espresso-lab/mantine-data-table'
import { ActionIcon, Code, Tooltip } from '@mantine/core'
import { IconEye } from '@tabler/icons-react'
import { statementContentUrl } from '../api'
import { listField } from '../components/fields'
import { StatusBadge, fmtDateTime } from '../components/ui'
import type { Statement } from '../types'

const fields: Field<Statement>[] = [
  listField('iban', { accessor: 'iban', title: 'IBAN', sortable: true, render: (s) => <Code>{s.iban}</Code> }, { delete: true }),
  listField('period', { accessor: 'fromDate', title: 'Zeitraum', render: (s) => `${s.fromDate} – ${s.toDate}` }),
  listField('fileName', { accessor: 'fileName', title: 'Datei' }),
  listField('status', { accessor: 'status', title: 'Status', render: (s) => <StatusBadge value={s.status} /> }),
  listField('createdAt', { accessor: 'createdAt', title: 'Erzeugt', render: (s) => fmtDateTime(s.createdAt) }),
  listField('view', {
    accessor: 'id',
    title: '',
    width: 50,
    render: (s) => (
      <Tooltip label="camt.053 anzeigen">
        <ActionIcon variant="subtle" onClick={() => window.open(statementContentUrl(s.id), '_blank')}>
          <IconEye size={16} />
        </ActionIcon>
      </Tooltip>
    ),
  }),
]

export function Statements() {
  return (
    <DataTable<Statement>
      title="Kontoauszüge (camt.053)"
      titleHint="Erzeugte Auszüge. AVAILABLE = abrufbar per BTD, FETCHED = bereits vom banking-service abgeholt."
      queryKey={['statements']}
      apiPath="/api/statements"
      fields={fields}
      selection
      mobileCards
      defaultSort={{ field: 'createdAt', direction: 'desc' }}
    />
  )
}
