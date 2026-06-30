import { DataTable, type Field } from '@espresso-lab/mantine-data-table'
import { Code } from '@mantine/core'
import { listField } from '../components/fields'
import { Money, StatusBadge, fmtDateTime } from '../components/ui'
import type { VeuOrder } from '../types'

const fields: Field<VeuOrder>[] = [
  listField('orderId', { accessor: 'orderId', title: 'Order-ID', render: (v) => <Code>{v.orderId}</Code> }, { delete: true }),
  listField('kind', { accessor: 'kind', title: 'Art' }),
  listField('totalAmount', { accessor: 'totalAmount', title: 'Summe', textAlign: 'right', render: (v) => <Money amount={v.totalAmount} currency={v.currency} /> }),
  listField('signatures', { accessor: 'signaturesDone', title: 'Unterschriften', render: (v) => `${v.signaturesDone} / ${v.signaturesRequired}` }),
  listField('status', { accessor: 'status', title: 'Status', render: (v) => <StatusBadge value={v.status} /> }),
  listField('createdAt', { accessor: 'createdAt', title: 'Erstellt', render: (v) => fmtDateTime(v.createdAt) }),
]

export function Veu() {
  return (
    <DataTable<VeuOrder>
      title="VEU / Verteilte Unterschriften"
      titleHint="Offene Aufträge in der verteilten Freigabe (HVU). Signatur via HVE, Storno via HVS."
      queryKey={['veu']}
      apiPath="/api/veu"
      fields={fields}
      selection
      mobileCards
      autoPoll={5000}
      defaultSort={{ field: 'createdAt', direction: 'desc' }}
    />
  )
}
