import { DataTable, type Field } from '@espresso-lab/mantine-data-table'
import { Code, ScrollArea, Spoiler, Stack, Table } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconWritingSign } from '@tabler/icons-react'
import { useQueryClient } from '@tanstack/react-query'
import { apiPost, useApiQuery } from '../api'
import { listField } from '../components/fields'
import { Money, SignatureBadge, StatusBadge, fmtDateTime } from '../components/ui'
import type { Order } from '../types'

function OrderDetails({ order }: { order: Order }) {
  const { data } = useApiQuery<Order>(['order', order.id], `/api/orders/${order.id}`)
  const items = data?.items ?? []
  return (
    <Stack p="sm" gap="sm">
      <Table withTableBorder withColumnBorders striped>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Empfänger/Zahler</Table.Th>
            <Table.Th>IBAN</Table.Th>
            <Table.Th>Verwendungszweck</Table.Th>
            <Table.Th>End-to-End</Table.Th>
            <Table.Th ta="right">Betrag</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {items.map((item, index) => (
            <Table.Tr key={index}>
              <Table.Td>{item.name}</Table.Td>
              <Table.Td><Code>{item.iban}</Code></Table.Td>
              <Table.Td>{item.remittance}</Table.Td>
              <Table.Td>{item.endToEndId}</Table.Td>
              <Table.Td><Money amount={item.amount} currency={item.currency} /></Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <Spoiler maxHeight={0} showLabel="Roh-pain anzeigen" hideLabel="Roh-pain ausblenden">
        <ScrollArea h={260}>
          <Code block>{data?.rawPain ?? ''}</Code>
        </ScrollArea>
      </Spoiler>
    </Stack>
  )
}

const fields: Field<Order>[] = [
  listField('orderId', { accessor: 'orderId', title: 'Order-ID', sortable: true, render: (o) => <Code>{o.orderId}</Code> }),
  listField('kind', { accessor: 'kind', title: 'Art' }),
  listField('msgName', { accessor: 'msgName', title: 'Nachricht' }),
  listField('itemCount', { accessor: 'itemCount', title: 'Posten', textAlign: 'right' }),
  listField('totalAmount', { accessor: 'totalAmount', title: 'Summe', textAlign: 'right', render: (o) => <Money amount={o.totalAmount} currency={o.currency} /> }),
  listField('signatureValid', { accessor: 'signatureValid', title: 'ES', render: (o) => <SignatureBadge value={o.signatureValid} /> }),
  listField('status', { accessor: 'status', title: 'Status', render: (o) => <StatusBadge value={o.status} /> }),
  listField('createdAt', { accessor: 'createdAt', title: 'Eingang', render: (o) => fmtDateTime(o.createdAt) }),
]

export function Orders() {
  const queryClient = useQueryClient()

  const requestVeu = async (orders: Order[]) => {
    for (const order of orders) {
      await apiPost('/api/veu', { orderId: order.orderId })
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['orders'] }),
      queryClient.invalidateQueries({ queryKey: ['veu'] }),
    ])
    notifications.show({ color: 'yellow', message: `${orders.length} Auftrag/Aufträge zur VEU-Freigabe gestellt.` })
  }

  return (
    <DataTable<Order>
      title="Eingereichte Aufträge"
      titleHint="Per BTU eingereichte SEPA-Aufträge (pain.001/008), entschlüsselt und geparst. Aufklappen zeigt die Einzelposten."
      queryKey={['orders']}
      apiPath="/api/orders"
      fields={fields}
      selection
      mobileCards
      defaultSort={{ field: 'createdAt', direction: 'desc' }}
      actions={[
        {
          label: 'VEU anfordern',
          icon: <IconWritingSign size={16} />,
          onClick: requestVeu,
          disabled: (records) => records.length === 0 || records.some((r) => r.status !== 'RECEIVED'),
        },
      ]}
      rowExpansion={{ content: (record) => <OrderDetails order={record} /> }}
    />
  )
}
