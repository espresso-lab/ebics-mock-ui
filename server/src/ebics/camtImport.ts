import type { CreditDebit } from '@ebics-mock/shared'
import { byLocalName, parseXml, selectNodes, textOf } from './xml.js'

export interface ImportedBooking {
  bookDate: string
  valueDate: string
  amount: string
  currency: string
  creditDebit: CreditDebit
  remittance: string
  counterpartyName: string
  counterpartyIban: string
}

function attrCcy(node: Node | undefined): string {
  if (!node) return 'EUR'
  const el = node as unknown as Element
  return (typeof el.getAttribute === 'function' ? el.getAttribute('Ccy') : '') || 'EUR'
}

function dateOf(node: Node | undefined): string {
  if (!node) return ''
  const date = textOf(node, 'Dt') || textOf(node, 'DtTm')
  return date.slice(0, 10)
}

export function parseCamtBookings(xml: string): ImportedBooking[] {
  const doc = parseXml(xml)
  return selectNodes(doc, "//*[local-name()='Ntry']").map((entry) => {
    const amountNode = byLocalName(entry, 'Amt')
    const creditDebit = (textOf(entry, 'CdtDbtInd') as CreditDebit) || 'CRDT'
    const bookDate = dateOf(byLocalName(entry, 'BookgDt'))
    const valueDate = dateOf(byLocalName(entry, 'ValDt')) || bookDate

    const scope = byLocalName(entry, 'TxDtls') ?? entry
    const debtor = byLocalName(scope, 'Dbtr')
    const creditor = byLocalName(scope, 'Cdtr')
    const debtorAccount = byLocalName(scope, 'DbtrAcct')
    const creditorAccount = byLocalName(scope, 'CdtrAcct')
    const party = creditDebit === 'CRDT' ? (debtor ?? creditor) : (creditor ?? debtor)
    const partyAccount = creditDebit === 'CRDT' ? (debtorAccount ?? creditorAccount) : (creditorAccount ?? debtorAccount)

    return {
      bookDate,
      valueDate,
      amount: Number(amountNode?.textContent?.trim() ?? '0').toFixed(2),
      currency: attrCcy(amountNode),
      creditDebit,
      remittance: textOf(byLocalName(scope, 'RmtInf') ?? scope, 'Ustrd'),
      counterpartyName: party ? textOf(party, 'Nm') : '',
      counterpartyIban: partyAccount ? textOf(partyAccount, 'IBAN') : '',
    }
  })
}
