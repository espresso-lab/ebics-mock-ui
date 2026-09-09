import { useState } from 'react'
import { DataTable, type Field } from '@espresso-lab/mantine-data-table'
import { Button, Code, Group, Modal, Text } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconCircleCheck, IconCircleX } from '@tabler/icons-react'
import { useQueryClient } from '@tanstack/react-query'
import { apiPost } from '../api'
import { listField } from '../components/fields'
import { Money, StatusBadge, fmtDateTime } from '../components/ui'
import type { VeuOrder } from '../types'

type VeuAction = 'approve' | 'cancel'

const ACTION_LABEL: Record<VeuAction, string> = { approve: 'Freigeben (Bank-App)', cancel: 'Stornieren' }
const ACTION_HINT: Record<VeuAction, string> = {
  approve: 'Simuliert die Freigabe durch den E-Teilnehmer in der Bank-App: der Auftrag wird verbucht, im HAC folgen VEU_VERIFICATION_END und ORDER_HAC_FINAL_POS.',
  cancel: 'Simuliert den Storno in der Bank-App: der Auftrag wird abgewiesen, im HAC folgen VEU_CANCEL_ORDER und ORDER_HAC_FINAL_NEG.',
}

const fields: Field<VeuOrder>[] = [
  listField('orderId', { accessor: 'orderId', title: 'Order-ID', render: (v) => <Code>{v.orderId}</Code> }, { delete: true }),
  listField('kind', { accessor: 'kind', title: 'Art' }),
  listField('totalAmount', { accessor: 'totalAmount', title: 'Summe', textAlign: 'right', render: (v) => <Money amount={v.totalAmount} currency={v.currency} /> }),
  listField('signatures', { accessor: 'signaturesDone', title: 'Unterschriften', render: (v) => `${v.signaturesDone} / ${v.signaturesRequired}` }),
  listField('status', { accessor: 'status', title: 'Status', render: (v) => <StatusBadge value={v.status} /> }),
  listField('createdAt', { accessor: 'createdAt', title: 'Erstellt', render: (v) => fmtDateTime(v.createdAt) }),
]

const notOpen = (records: VeuOrder[]) => records.length === 0 || records.some((r) => r.status !== 'OPEN')

export function Veu() {
  const queryClient = useQueryClient()
  const [pending, setPending] = useState<{ action: VeuAction; records: VeuOrder[] } | null>(null)
  const [busy, setBusy] = useState(false)

  const run = async () => {
    if (!pending) return
    setBusy(true)
    try {
      for (const veu of pending.records) {
        await apiPost(`/api/veu/${veu.id}/${pending.action}`)
      }
      await Promise.all(
        [['veu'], ['orders'], ['protocol'], ['accounts'], ['bookings']].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      )
      notifications.show({
        color: pending.action === 'approve' ? 'green' : 'yellow',
        message: `${pending.records.length} Auftrag/Aufträge ${pending.action === 'approve' ? 'freigegeben und verbucht' : 'storniert'}.`,
      })
      setPending(null)
    } catch (e) {
      notifications.show({ color: 'red', message: e instanceof Error ? e.message : String(e) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <DataTable<VeuOrder>
        title="VEU / Verteilte Unterschriften"
        titleHint="Aufträge in der verteilten Freigabe (HVU). Ein E-Teilnehmer signiert per HVE und storniert per HVS; für Aufträge eines T-Teilnehmers übernehmen »Freigeben (Bank-App)« und »Stornieren« die Rolle der Bank-App."
        queryKey={['veu']}
        apiPath="/api/veu"
        fields={fields}
        selection
        mobileCards
        autoPoll={5000}
        defaultSort={{ field: 'createdAt', direction: 'desc' }}
        actions={[
          { label: ACTION_LABEL.approve, icon: <IconCircleCheck size={16} />, onClick: (records) => setPending({ action: 'approve', records }), disabled: notOpen },
          { label: ACTION_LABEL.cancel, icon: <IconCircleX size={16} />, onClick: (records) => setPending({ action: 'cancel', records }), disabled: notOpen },
        ]}
      />
      <Modal opened={pending !== null} onClose={() => setPending(null)} title={pending ? ACTION_LABEL[pending.action] : ''} centered>
        {pending && (
          <>
            <Text size="sm">{ACTION_HINT[pending.action]}</Text>
            <Text size="sm" mt="sm">
              Betroffen: <Code>{pending.records.map((r) => r.orderId).join(', ')}</Code>
            </Text>
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={() => setPending(null)}>
                Abbrechen
              </Button>
              <Button color={pending.action === 'cancel' ? 'red' : undefined} loading={busy} onClick={run}>
                {ACTION_LABEL[pending.action]}
              </Button>
            </Group>
          </>
        )}
      </Modal>
    </>
  )
}
