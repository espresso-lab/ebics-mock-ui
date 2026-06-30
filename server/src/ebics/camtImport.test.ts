import { describe, expect, it } from 'vitest'
import type { Account, Booking } from '@ebics-mock/shared'
import { generateCamt053 } from './camt.js'
import { parseCamtBookings } from './camtImport.js'

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

describe('parseCamtBookings', () => {
  it('round-trips bookings through generate + parse', () => {
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

    const parsed = parseCamtBookings(xml)
    expect(parsed).toHaveLength(2)

    const credit = parsed.find((b) => b.creditDebit === 'CRDT')!
    expect(credit.amount).toBe('850.00')
    expect(credit.currency).toBe('EUR')
    expect(credit.bookDate).toBe('2026-06-10')
    expect(credit.remittance).toBe('Hausgeld Juni')
    expect(credit.counterpartyName).toBe('Anna Müller')
    expect(credit.counterpartyIban).toBe('DE89370400440532013000')

    const debit = parsed.find((b) => b.creditDebit === 'DBIT')!
    expect(debit.amount).toBe('420.00')
    expect(debit.counterpartyName).toBe('Stadtwerke München')
  })

  it('returns an empty list for a statement without entries', () => {
    const xml = generateCamt053({
      msgId: 'M2',
      statementId: 'S2',
      account,
      fromDate: '2026-07-01',
      toDate: '2026-07-31',
      openingBalance: '0.00',
      closingBalance: '0.00',
      createdAt: '2026-07-31T12:00:00Z',
      bookings: [],
    })
    expect(parseCamtBookings(xml)).toHaveLength(0)
  })

  it('handles a camt.052 collection entry: Cdtr/Pty/Nm with no Dbtr (party fallback)', () => {
    const xml =
      `<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.052.001.08"><BkToCstmrAcctRpt><Rpt>` +
      `<Ntry><Amt Ccy="EUR">900.00</Amt><CdtDbtInd>CRDT</CdtDbtInd><Sts><Cd>BOOK</Cd></Sts>` +
      `<BookgDt><Dt>2025-01-02</Dt></BookgDt><ValDt><Dt>2025-01-02</Dt></ValDt>` +
      `<NtryDtls><TxDtls><Refs><EndToEndId>HAUSGELD-JAN-2025</EndToEndId></Refs>` +
      `<Amt Ccy="EUR">900.00</Amt><RltdPties><Cdtr><Pty><Nm>WEG Musterstraße 1-3</Nm></Pty></Cdtr>` +
      `<CdtrAcct><Id><IBAN>DE89370400440532013000</IBAN></Id></CdtrAcct></RltdPties>` +
      `<RmtInf><Ustrd>Sammellastschrift Hausgeld Januar 2025</Ustrd></RmtInf></TxDtls></NtryDtls></Ntry>` +
      `</Rpt></BkToCstmrAcctRpt></Document>`
    const parsed = parseCamtBookings(xml)
    expect(parsed).toHaveLength(1)
    expect(parsed[0]).toMatchObject({
      amount: '900.00',
      creditDebit: 'CRDT',
      bookDate: '2025-01-02',
      counterpartyName: 'WEG Musterstraße 1-3',
      counterpartyIban: 'DE89370400440532013000',
      remittance: 'Sammellastschrift Hausgeld Januar 2025',
    })
  })

  it('tolerates a foreign camt.053.001.08 namespace and Ntry layout', () => {
    const xml =
      `<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.08"><BkToCstmrStmt><Stmt>` +
      `<Ntry><Amt Ccy="EUR">1234.56</Amt><CdtDbtInd>CRDT</CdtDbtInd><BookgDt><Dt>2026-05-03</Dt></BookgDt>` +
      `<ValDt><Dt>2026-05-04</Dt></ValDt><NtryDtls><TxDtls><RltdPties><Dbtr><Nm>ACME GmbH</Nm></Dbtr>` +
      `<DbtrAcct><Id><IBAN>DE02100500000054540402</IBAN></Id></DbtrAcct></RltdPties>` +
      `<RmtInf><Ustrd>Rechnung 7</Ustrd></RmtInf></TxDtls></NtryDtls></Ntry>` +
      `</Stmt></BkToCstmrStmt></Document>`
    const parsed = parseCamtBookings(xml)
    expect(parsed).toHaveLength(1)
    expect(parsed[0]).toMatchObject({
      amount: '1234.56',
      creditDebit: 'CRDT',
      bookDate: '2026-05-03',
      valueDate: '2026-05-04',
      counterpartyName: 'ACME GmbH',
      counterpartyIban: 'DE02100500000054540402',
      remittance: 'Rechnung 7',
    })
  })
})
