import { DataTable, type Field } from '@espresso-lab/mantine-data-table'
import { Code } from '@mantine/core'
import { listField } from '../components/fields'
import { ReturnCodeBadge, fmtDateTime } from '../components/ui'
import type { ProtocolEntry } from '../types'

const fields: Field<ProtocolEntry>[] = [
  listField('createdAt', { accessor: 'createdAt', title: 'Zeitpunkt', sortable: true, render: (p) => fmtDateTime(p.createdAt) }),
  listField('orderType', { accessor: 'orderType', title: 'Auftragsart', render: (p) => <Code>{p.orderType}</Code> }),
  listField('orderId', { accessor: 'orderId', title: 'Order-ID', render: (p) => (p.orderId ? <Code>{p.orderId}</Code> : '—') }),
  listField('action', { accessor: 'action', title: 'Aktion', render: (p) => (p.action ? <Code>{p.action}</Code> : '—') }),
  listField('reasonCode', { accessor: 'reasonCode', title: 'Ergebnis', render: (p) => (p.reasonCode ? <Code>{p.reasonCode}</Code> : '—') }),
  listField('returnCode', { accessor: 'returnCode', title: 'ReturnCode', render: (p) => <ReturnCodeBadge code={p.returnCode} /> }),
  listField('reasonText', { accessor: 'reasonText', title: 'Hinweis' }),
]

export function Protocol() {
  return (
    <DataTable<ProtocolEntry>
      title="Kundenprotokoll (HAC)"
      titleHint="Chronologisches Protokoll aller Auftragsarten — jede Zeile ist ein pain.002-Protokollschritt (Art der Aktion + Ergebnis), wie ihn der banking-service per HAC/PTK abholt."
      queryKey={['protocol']}
      apiPath="/api/protocol"
      fields={fields}
      mobileCards
      autoPoll={5000}
      defaultSort={{ field: 'createdAt', direction: 'desc' }}
    />
  )
}
