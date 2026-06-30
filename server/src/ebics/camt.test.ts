import { describe, expect, it } from 'vitest'
import type { Account, Booking } from '@ebics-mock/shared'
import { generateCamt053 } from './camt.js'

const account: Account = {
  id: 'a1',
  iban: 'DE53201304000060279767',
  bic: 'GREBDEH1XXX',
  currency: 'EUR',
  name: 'WEG Test',
  balance: '0.00',
}

const bookings: Booking[] = [
  { id: 'b1', accountId: 'a1', bookDate: '2026-06-10', valueDate: '2026-06-10', amount: '850.00', currency: 'EUR', creditDebit: 'CRDT', remittance: 'Hausgeld Juni', counterpartyName: 'Anna Müller', counterpartyIban: 'DE89370400440532013000' },
  { id: 'b2', accountId: 'a1', bookDate: '2026-06-12', valueDate: '2026-06-12', amount: '420.00', currency: 'EUR', creditDebit: 'DBIT', remittance: 'Stadtwerke', counterpartyName: 'Stadtwerke München', counterpartyIban: 'DE12500105170648489890' },
]

const xml = generateCamt053({
  msgId: 'M1',
  statementId: 'S1',
  account,
  fromDate: '2026-06-01',
  toDate: '2026-06-30',
  openingBalance: '0.00',
  closingBalance: '430.00',
  createdAt: '2026-06-30T12:00:00Z',
  bookings,
})

describe('generateCamt053 (camt.053.001.08)', () => {
  it('uses the modern camt.053.001.08 namespace', () => {
    expect(xml).toContain('xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.08"')
  })

  it('emits the structured entry status the ISO-20022 parser requires', () => {
    expect(xml).toContain('<Sts><Cd>BOOK</Cd></Sts>')
    expect(xml).not.toContain('<Sts>BOOK</Sts>')
  })

  it('uses BICFI for the account servicer and a mandatory BkTxCd per entry', () => {
    expect(xml).toContain('<Svcr><FinInstnId><BICFI>GREBDEH1XXX</BICFI></FinInstnId></Svcr>')
    expect((xml.match(/<BkTxCd><Prtry><Cd>NTRF<\/Cd><\/Prtry><\/BkTxCd>/g) ?? [])).toHaveLength(2)
  })

  it('nests party names under Pty and places the own account on the booking side', () => {
    expect(xml).toContain('<Dbtr><Pty><Nm>Anna Müller</Nm></Pty></Dbtr>')
    expect(xml).toContain('<DbtrAcct><Id><IBAN>DE89370400440532013000</IBAN></Id></DbtrAcct><CdtrAcct><Id><IBAN>DE53201304000060279767</IBAN></Id></CdtrAcct>')
    expect(xml).toContain('<DbtrAcct><Id><IBAN>DE53201304000060279767</IBAN></Id></DbtrAcct><Cdtr><Pty><Nm>Stadtwerke München</Nm></Pty></Cdtr>')
  })
})
