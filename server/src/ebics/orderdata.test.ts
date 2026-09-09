import { describe, expect, it } from 'vitest'
import type { Account } from '@ebics-mock/shared'
import { type HtdContext, buildHtdResponseOrderData } from './orderdata.js'

const ctx = (accounts: Account[], over: Partial<HtdContext> = {}): HtdContext => ({
  hostId: 'MOCKBANK',
  partnerId: 'MV1',
  userId: 'U1',
  userName: 'U1',
  partnerName: 'MV1',
  accounts,
  signatureClass: 'E',
  signatureClassDisclosed: true,
  ...over,
})

const permissions = (xml: string) => xml.match(/<Permission[^>]*>.*?<\/Permission>/g) ?? []

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

  it('announces the participant signature class as AuthorisationLevel on every BTU permission', () => {
    const btu = permissions(buildHtdResponseOrderData(ctx([], { signatureClass: 'T' }))).filter((p) => p.includes('<AdminOrderType>BTU<'))
    expect(btu).toHaveLength(2)
    btu.forEach((p) => expect(p).toMatch(/^<Permission AuthorisationLevel="T">/))
  })

  it('never puts AuthorisationLevel on download permissions and keeps T on HVE/HVS', () => {
    const all = permissions(buildHtdResponseOrderData(ctx([], { signatureClass: 'T' })))
    const downloads = all.filter((p) => /<AdminOrderType>(BTD|HAC|HTD|PTK|HVU|HVD)</.test(p))
    expect(downloads.length).toBeGreaterThan(0)
    downloads.forEach((p) => expect(p).not.toContain('AuthorisationLevel'))
    all.filter((p) => /<AdminOrderType>(HVE|HVS)</.test(p)).forEach((p) => expect(p).toContain('AuthorisationLevel="T"'))
  })

  it('omits the attribute on BTU permissions when the bank does not disclose the class', () => {
    const xml = buildHtdResponseOrderData(ctx([], { signatureClass: 'T', signatureClassDisclosed: false }))
    permissions(xml).filter((p) => p.includes('<AdminOrderType>BTU<')).forEach((p) => expect(p).toMatch(/^<Permission><AdminOrderType>BTU</))
    expect(xml).toMatch(/<AdminOrderType>BTU<\/AdminOrderType>.*?<NumSigRequired>1<\/NumSigRequired>/)
  })
})
