import type { Account, Booking } from '@ebics-mock/shared'
import { escapeXml } from './xml.js'

const CAMT_NS = 'urn:iso:std:iso:20022:tech:xsd:camt.053.001.02'

export interface CamtInput {
  msgId: string
  statementId: string
  account: Account
  fromDate: string
  toDate: string
  openingBalance: string
  closingBalance: string
  createdAt: string
  bookings: Booking[]
}

function balance(code: string, amount: string, currency: string, date: string): string {
  const sign = Number(amount) < 0 ? 'DBIT' : 'CRDT'
  const value = Math.abs(Number(amount)).toFixed(2)
  return (
    `<Bal><Tp><CdOrPrtry><Cd>${code}</Cd></CdOrPrtry></Tp>` +
    `<Amt Ccy="${currency}">${value}</Amt><CdtDbtInd>${sign}</CdtDbtInd>` +
    `<Dt><Dt>${date}</Dt></Dt></Bal>`
  )
}

function entry(booking: Booking): string {
  const amount = Math.abs(Number(booking.amount)).toFixed(2)
  const party =
    booking.creditDebit === 'CRDT'
      ? `<RltdPties><Dbtr><Nm>${escapeXml(booking.counterpartyName)}</Nm></Dbtr>${booking.counterpartyIban ? `<DbtrAcct><Id><IBAN>${booking.counterpartyIban}</IBAN></Id></DbtrAcct>` : ''}</RltdPties>`
      : `<RltdPties><Cdtr><Nm>${escapeXml(booking.counterpartyName)}</Nm></Cdtr>${booking.counterpartyIban ? `<CdtrAcct><Id><IBAN>${booking.counterpartyIban}</IBAN></Id></CdtrAcct>` : ''}</RltdPties>`
  return (
    `<Ntry><Amt Ccy="${booking.currency}">${amount}</Amt><CdtDbtInd>${booking.creditDebit}</CdtDbtInd>` +
    `<Sts>BOOK</Sts><BookgDt><Dt>${booking.bookDate}</Dt></BookgDt><ValDt><Dt>${booking.valueDate}</Dt></ValDt>` +
    `<NtryDtls><TxDtls>${party}` +
    `<RmtInf><Ustrd>${escapeXml(booking.remittance)}</Ustrd></RmtInf></TxDtls></NtryDtls></Ntry>`
  )
}

export function generateCamt053(input: CamtInput): string {
  const { account } = input
  const entries = input.bookings.map(entry).join('')
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<Document xmlns="${CAMT_NS}"><BkToCstmrStmt>` +
    `<GrpHdr><MsgId>${input.msgId}</MsgId><CreDtTm>${input.createdAt}</CreDtTm></GrpHdr>` +
    `<Stmt><Id>${input.statementId}</Id><CreDtTm>${input.createdAt}</CreDtTm>` +
    `<FrToDt><FrDtTm>${input.fromDate}T00:00:00</FrDtTm><ToDtTm>${input.toDate}T23:59:59</ToDtTm></FrToDt>` +
    `<Acct><Id><IBAN>${account.iban}</IBAN></Id><Ccy>${account.currency}</Ccy>` +
    `<Ownr><Nm>${escapeXml(account.name)}</Nm></Ownr>` +
    (account.bic ? `<Svcr><FinInstnId><BIC>${account.bic}</BIC></FinInstnId></Svcr>` : '') +
    `</Acct>` +
    balance('OPBD', input.openingBalance, account.currency, input.fromDate) +
    balance('CLBD', input.closingBalance, account.currency, input.toDate) +
    entries +
    `</Stmt></BkToCstmrStmt></Document>`
  )
}
