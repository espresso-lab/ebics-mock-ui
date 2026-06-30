import { describe, expect, it } from 'vitest'
import { Store } from './store.js'

const newStore = () => new Store(':memory:')

describe('Store', () => {
  it('find-or-create participant is idempotent on (host, partner, user)', () => {
    const store = newStore()
    const a = store.findOrCreateParticipant('MOCKBANK', 'MV1', 'USER1')
    const b = store.findOrCreateParticipant('MOCKBANK', 'MV1', 'USER1')
    expect(a.id).toBe(b.id)
    expect(store.listParticipants()).toHaveLength(1)
    expect(a.iniState).toBe('NEW')
    expect(a.hpbState).toBe('PENDING')
  })

  it('tracks INI/HIA/HPB state transitions', () => {
    const store = newStore()
    const p = store.findOrCreateParticipant('MOCKBANK', 'MV1', 'USER1')
    store.setInitState(p.id, 'ini_state', 'DONE')
    store.setInitState(p.id, 'hia_state', 'DONE')
    store.setHpbState(p.id, 'DELIVERED')
    const updated = store.getParticipant(p.id)!
    expect(updated.iniState).toBe('DONE')
    expect(updated.hiaState).toBe('DONE')
    expect(updated.hpbState).toBe('DELIVERED')
  })

  it('stores participant keys keyed by type', () => {
    const store = newStore()
    const p = store.findOrCreateParticipant('MOCKBANK', 'MV1', 'USER1')
    store.setParticipantKey(p.id, 'A006', 'pem-a006', 'd1')
    store.setParticipantKey(p.id, 'E002', 'pem-e002', 'd2')
    store.setParticipantKey(p.id, 'E002', 'pem-e002-new', 'd3')
    expect(store.listParticipantKeys(p.id)).toHaveLength(2)
    expect(store.getParticipantKey(p.id, 'E002')!.publicKeyPem).toBe('pem-e002-new')
  })

  it('persists an upload order with items', () => {
    const store = newStore()
    const p = store.findOrCreateParticipant('MOCKBANK', 'MV1', 'USER1')
    const id = store.createOrder({
      participantId: p.id,
      orderId: 'N001',
      kind: 'CCT',
      service: 'SCT',
      msgName: 'pain.001',
      signatureValid: true,
      itemCount: 1,
      totalAmount: '100.00',
      currency: 'EUR',
      rawPain: '<Document/>',
    })
    store.addOrderItem(id, {
      name: 'ACME',
      iban: 'DE00',
      amount: '100.00',
      currency: 'EUR',
      remittance: 'Rechnung 1',
      endToEndId: 'E2E1',
    })
    const order = store.getOrder(id)!
    expect(order.items).toHaveLength(1)
    expect(order.items![0]!.name).toBe('ACME')
    expect(store.listOrders()).toHaveLength(1)
  })

  it('marks statements fetched', () => {
    const store = newStore()
    const acc = store.createAccount({
      partnerId: 'MV1',
      iban: 'DE53201304000060279767',
      bic: 'GREBDEH1XXX',
      currency: 'EUR',
      name: 'WEG Test',
      balance: '0.00',
    })
    const stmt = store.createStatement({
      accountId: acc.id,
      iban: acc.iban,
      fromDate: '2026-06-01',
      toDate: '2026-06-30',
      fileName: 'camt.053.xml',
      content: '<Document/>',
    })
    expect(store.listAvailableStatements()).toHaveLength(1)
    store.markStatementsFetched([stmt.id])
    expect(store.listAvailableStatements()).toHaveLength(0)
    expect(store.getStatement(stmt.id)!.status).toBe('FETCHED')
  })

  it('records exchanges and protocol entries', () => {
    const store = newStore()
    store.addExchange({
      participantId: null,
      rootElement: 'ebicsHEVRequest',
      orderType: 'HEV',
      transactionId: null,
      phase: '',
      returnCode: '000000',
      requestXml: '<r/>',
      responseXml: '<r/>',
    })
    store.addProtocol({ participantId: null, orderType: 'BTU', orderId: 'N001', returnCode: '000000', reasonText: 'OK' })
    expect(store.listExchanges()).toHaveLength(1)
    expect(store.listProtocol()).toHaveLength(1)
  })
})
