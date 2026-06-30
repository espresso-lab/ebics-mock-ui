import type { Store } from './db/store.js'

export function seedDemoData(store: Store): void {
  if (store.listAccounts().length > 0) return
  const account = store.createAccount({
    partnerId: 'MV126086',
    iban: 'DE53201304000060279767',
    bic: 'GREBDEH1XXX',
    currency: 'EUR',
    name: 'WEG Musterstraße 1',
    balance: '12500.00',
  })
  const seedBookings = [
    { amount: '850.00', creditDebit: 'CRDT' as const, remittance: 'Hausgeld Juni Wohnung 1', counterpartyName: 'Anna Müller', counterpartyIban: 'DE89370400440532013000' },
    { amount: '420.00', creditDebit: 'DBIT' as const, remittance: 'Stadtwerke Abschlag', counterpartyName: 'Stadtwerke München', counterpartyIban: 'DE12500105170648489890' },
    { amount: '850.00', creditDebit: 'CRDT' as const, remittance: 'Hausgeld Juni Wohnung 2', counterpartyName: 'Boris Klein', counterpartyIban: 'DE02100500000054540402' },
  ]
  seedBookings.forEach((b, i) =>
    store.createBooking({
      accountId: account.id,
      bookDate: `2026-06-${String(10 + i).padStart(2, '0')}`,
      valueDate: `2026-06-${String(10 + i).padStart(2, '0')}`,
      amount: b.amount,
      currency: 'EUR',
      creditDebit: b.creditDebit,
      remittance: b.remittance,
      counterpartyName: b.counterpartyName,
      counterpartyIban: b.counterpartyIban,
    }),
  )
}
