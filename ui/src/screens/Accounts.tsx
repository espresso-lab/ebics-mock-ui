import { useState } from 'react'
import { DataTable, type Field } from '@espresso-lab/mantine-data-table'
import { Button, FileButton } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconFileText, IconUpload } from '@tabler/icons-react'
import { useQueryClient } from '@tanstack/react-query'
import { apiPost } from '../api'
import { formField } from '../components/fields'
import { Money } from '../components/ui'
import type { Account, Booking } from '../types'

function CamtImport({ accountId }: { accountId: string }) {
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)

  const onFile = async (file: File | null) => {
    if (!file) return
    setLoading(true)
    try {
      const content = await file.text()
      const res = await apiPost<{ imported: number }>(`/api/accounts/${accountId}/import-camt`, { content })
      await queryClient.invalidateQueries({ queryKey: ['bookings', accountId] })
      notifications.show({ color: 'teal', message: `${res.imported} Umsätze aus ${file.name} importiert.` })
    } catch (error) {
      notifications.show({ color: 'red', message: `Import fehlgeschlagen: ${String(error)}` })
    } finally {
      setLoading(false)
    }
  }

  return (
    <FileButton accept=".xml,text/xml,application/xml" onChange={onFile}>
      {(props) => (
        <Button {...props} variant="light" size="xs" leftSection={<IconUpload size={14} />} loading={loading}>
          camt importieren
        </Button>
      )}
    </FileButton>
  )
}

const monthStart = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}
const today = () => new Date().toISOString().slice(0, 10)

const bookingFields: Field<Booking>[] = [
  formField('bookDate', { accessor: 'bookDate', title: 'Buchungstag', sortable: true }, { type: 'date', required: true, delete: true }),
  formField('counterpartyName', { accessor: 'counterpartyName', title: 'Gegenpartei' }, {}),
  formField('counterpartyIban', { accessor: 'counterpartyIban', title: 'Gegen-IBAN' }, {}),
  formField('remittance', { accessor: 'remittance', title: 'Verwendungszweck' }, {}),
  formField('creditDebit', { accessor: 'creditDebit', title: 'S/H', render: (b) => b.creditDebit }, { placeholder: 'CRDT oder DBIT' }),
  formField('amount', { accessor: 'amount', title: 'Betrag', textAlign: 'right', render: (b) => <Money amount={b.amount} currency={b.currency} /> }, { type: 'number', required: true }),
]

function Bookings({ account }: { account: Account }) {
  return (
    <DataTable<Booking>
      title={`Umsätze · ${account.iban}`}
      queryKey={['bookings', account.id]}
      apiPath={`/api/accounts/${account.id}/bookings`}
      createButtonText="Buchung anlegen"
      buttons={[<CamtImport key="camt-import" accountId={account.id} />]}
      fields={bookingFields}
      mobileCards
      defaultSort={{ field: 'bookDate', direction: 'desc' }}
    />
  )
}

const fields: Field<Account>[] = [
  formField('iban', { accessor: 'iban', title: 'IBAN', sortable: true }, { required: true, delete: true }),
  formField('bic', { accessor: 'bic', title: 'BIC' }, {}),
  formField('name', { accessor: 'name', title: 'Kontoinhaber' }, {}),
  formField('currency', { accessor: 'currency', title: 'Währung' }, { placeholder: 'EUR' }),
  formField('balance', { accessor: 'balance', title: 'Saldo', textAlign: 'right', render: (a) => <Money amount={a.balance} currency={a.currency} /> }, { type: 'number' }),
]

export function Accounts() {
  const queryClient = useQueryClient()

  const generateStatements = async (accounts: Account[]) => {
    for (const account of accounts) {
      await apiPost(`/api/accounts/${account.id}/statements`, { fromDate: monthStart(), toDate: today() })
    }
    await queryClient.invalidateQueries({ queryKey: ['statements'] })
    notifications.show({ color: 'teal', message: `camt.053 für ${accounts.length} Konto/Konten erzeugt und zum Abruf freigegeben.` })
  }

  return (
    <DataTable<Account>
      title="Konten & Umsätze"
      titleHint="Konten der Mock-Bank. Auswählen und »Auszug erzeugen« baut einen camt.053 aus den Umsätzen, den der banking-service per BTD abholt."
      queryKey={['accounts']}
      apiPath="/api/accounts"
      createButtonText="Konto anlegen"
      fields={fields}
      selection
      mobileCards
      defaultSort={{ field: 'iban', direction: 'asc' }}
      actions={[
        {
          label: 'Auszug erzeugen',
          icon: <IconFileText size={16} />,
          onClick: generateStatements,
          disabled: (records) => records.length === 0,
        },
      ]}
      rowExpansion={{ content: (record) => <Bookings account={record} /> }}
    />
  )
}
