import { describe, expect, it } from 'vitest'
import { Store } from '../db/store.js'
import { bookOrder } from './booking.js'

const DEBTOR_IBAN = 'DE89370400440532013000'
const CREDITOR_IBAN = 'DE69120300001011230487'

const pain001 = `<?xml version="1.0"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03">
  <CstmrCdtTrfInitn><PmtInf>
    <Dbtr><Nm>AssetSquare</Nm></Dbtr>
    <DbtrAcct><Id><IBAN>${DEBTOR_IBAN}</IBAN></Id></DbtrAcct>
    <CdtTrfTxInf>
      <PmtId><EndToEndId>E2E1</EndToEndId></PmtId>
      <Amt><InstdAmt Ccy="EUR">12.34</InstdAmt></Amt>
      <Cdtr><Nm>Jannick</Nm></Cdtr>
      <CdtrAcct><Id><IBAN>${CREDITOR_IBAN}</IBAN></Id></CdtrAcct>
      <RmtInf><Ustrd>Miete Juli</Ustrd></RmtInf>
    </CdtTrfTxInf>
  </PmtInf></CstmrCdtTrfInitn>
</Document>`

const pain008 = `<?xml version="1.0"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.008.001.02">
  <CstmrDrctDbtInitn><PmtInf>
    <Cdtr><Nm>AssetSquare</Nm></Cdtr>
    <CdtrAcct><Id><IBAN>${DEBTOR_IBAN}</IBAN></Id></CdtrAcct>
    <DrctDbtTxInf>
      <PmtId><EndToEndId>E2E2</EndToEndId></PmtId>
      <InstdAmt Ccy="EUR">50.00</InstdAmt>
      <Dbtr><Nm>Peter Lustig</Nm></Dbtr>
      <DbtrAcct><Id><IBAN>${CREDITOR_IBAN}</IBAN></Id></DbtrAcct>
      <RmtInf><Ustrd>Hausgeld</Ustrd></RmtInf>
    </DrctDbtTxInf>
  </PmtInf></CstmrDrctDbtInitn>
</Document>`

function orderWith(store: Store, kind: 'CCT' | 'CDD', rawPain: string): string {
  const participant = store.findOrCreateParticipant('MOCKBANK', 'MV1', 'USER1')
  const id = store.createOrder({
    participantId: participant.id,
    orderId: kind === 'CCT' ? 'A001' : 'A002',
    kind,
    service: kind === 'CCT' ? 'SCT' : 'SDD',
    msgName: kind === 'CCT' ? 'pain.001' : 'pain.008',
    signatureValid: true,
    itemCount: 1,
    totalAmount: kind === 'CCT' ? '12.34' : '50.00',
    currency: 'EUR',
    rawPain,
  })
  store.addOrderItem(id, {
    name: kind === 'CCT' ? 'Jannick' : 'Peter Lustig',
    iban: CREDITOR_IBAN,
    amount: kind === 'CCT' ? '12.34' : '50.00',
    currency: 'EUR',
    remittance: kind === 'CCT' ? 'Miete Juli' : 'Hausgeld',
    endToEndId: kind === 'CCT' ? 'E2E1' : 'E2E2',
  })
  return id
}

describe('bookOrder', () => {
  it('books a credit transfer as debit on the debtor account and marks the order BOOKED', () => {
    const store = new Store(':memory:')
    const account = store.createAccount({ partnerId: 'MV1', iban: DEBTOR_IBAN, bic: 'COBADEFFXXX', currency: 'EUR', name: 'Firmenkonto', balance: '0.00' })
    const orderId = orderWith(store, 'CCT', pain001)

    const result = bookOrder(store, orderId)

    expect(result).toEqual({ booked: 1, accountIban: DEBTOR_IBAN })
    const bookings = store.listBookings(account.id)
    expect(bookings).toHaveLength(1)
    expect(bookings[0]).toMatchObject({
      creditDebit: 'DBIT',
      amount: '12.34',
      counterpartyName: 'Jannick',
      counterpartyIban: CREDITOR_IBAN,
      remittance: 'Miete Juli',
      endToEndId: 'E2E1',
    })
    expect(store.getOrder(orderId)?.status).toBe('BOOKED')
  })

  it('books a direct debit as credit on the creditor account', () => {
    const store = new Store(':memory:')
    const account = store.createAccount({ partnerId: 'MV1', iban: DEBTOR_IBAN, bic: 'COBADEFFXXX', currency: 'EUR', name: 'Firmenkonto', balance: '0.00' })
    const orderId = orderWith(store, 'CDD', pain008)

    bookOrder(store, orderId)

    const bookings = store.listBookings(account.id)
    expect(bookings).toHaveLength(1)
    expect(bookings[0]).toMatchObject({ creditDebit: 'CRDT', amount: '50.00', counterpartyName: 'Peter Lustig' })
  })

  it('rejects booking when the ordering account does not exist and keeps the order untouched', () => {
    const store = new Store(':memory:')
    const orderId = orderWith(store, 'CCT', pain001)

    expect(() => bookOrder(store, orderId)).toThrowError(/no account with IBAN/)
    expect(store.getOrder(orderId)?.status).toBe('RECEIVED')
  })

  it('refuses to book twice', () => {
    const store = new Store(':memory:')
    store.createAccount({ partnerId: 'MV1', iban: DEBTOR_IBAN, bic: 'COBADEFFXXX', currency: 'EUR', name: 'Firmenkonto', balance: '0.00' })
    const orderId = orderWith(store, 'CCT', pain001)

    bookOrder(store, orderId)

    expect(() => bookOrder(store, orderId)).toThrowError(/already booked/)
  })
})
