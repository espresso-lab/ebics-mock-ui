import { describe, expect, it } from 'vitest'
import type { Account } from '@ebics-mock/shared'
import { buildHtdResponseOrderData } from './orderdata.js'

const ctx = (accounts: Account[]) => ({
  hostId: 'MOCKBANK',
  partnerId: 'MV1',
  userId: 'U1',
  userName: 'U1',
  partnerName: 'MV1',
  accounts,
})

const account = (over: Partial<Account>): Account => ({
  id: 'a1',
  iban: 'DE89370400440532013000',
  bic: '',
  currency: 'EUR',
  name: '',
  balance: '0.00',
  ...over,
})

describe('buildHtdResponseOrderData', () => {
  it('always emits AccountNumber AND BankCode — real clients drop AccountInfo without a BIC', () => {
    const xml = buildHtdResponseOrderData(ctx([account({ bic: '', name: '' })]))
    expect(xml).toContain('<AccountNumber international="true">DE89370400440532013000</AccountNumber>')
    expect(xml).toMatch(/<BankCode international="true">[A-Z0-9]+<\/BankCode>/)
  })

  it('uses the account BIC when set', () => {
    const xml = buildHtdResponseOrderData(ctx([account({ bic: 'GREBDEH1XXX', name: 'WEG' })]))
    expect(xml).toContain('<BankCode international="true">GREBDEH1XXX</BankCode>')
  })
})
