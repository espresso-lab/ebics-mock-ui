import type { OrderItem, OrderKind } from '@ebics-mock/shared'
import { byLocalName, parseXml, selectNodes, textOf } from './xml.js'

export interface ParsedPain {
  kind: OrderKind
  msgName: string
  currency: string
  totalAmount: string
  items: OrderItem[]
}

function attrCcy(node: Node | undefined): string {
  if (!node) return 'EUR'
  const el = node as unknown as Element
  return (typeof el.getAttribute === 'function' ? el.getAttribute('Ccy') : '') || 'EUR'
}

export function parsePain(xml: string, serviceName: string): ParsedPain {
  const doc = parseXml(xml)
  const isDirectDebit = serviceName === 'SDD' || !!byLocalName(doc, 'CstmrDrctDbtInitn')
  const kind: OrderKind = isDirectDebit ? 'CDD' : 'CCT'
  const txTag = isDirectDebit ? 'DrctDbtTxInf' : 'CdtTrfTxInf'
  const partyTag = isDirectDebit ? 'Dbtr' : 'Cdtr'
  const acctTag = isDirectDebit ? 'DbtrAcct' : 'CdtrAcct'

  let total = 0
  let currency = 'EUR'
  const items: OrderItem[] = selectNodes(doc, `//*[local-name()='${txTag}']`).map((tx) => {
    const amountNode = byLocalName(tx, 'InstdAmt')
    const amount = Number(amountNode?.textContent?.trim() ?? '0')
    currency = attrCcy(amountNode)
    total += amount
    const party = byLocalName(tx, partyTag)
    const acct = byLocalName(tx, acctTag)
    return {
      name: party ? textOf(party, 'Nm') : '',
      iban: acct ? textOf(acct, 'IBAN') : '',
      amount: amount.toFixed(2),
      currency,
      remittance: textOf(byLocalName(tx, 'RmtInf') ?? tx, 'Ustrd'),
      endToEndId: textOf(byLocalName(tx, 'PmtId') ?? tx, 'EndToEndId'),
    }
  })

  return {
    kind,
    msgName: isDirectDebit ? 'pain.008' : 'pain.001',
    currency,
    totalAmount: total.toFixed(2),
    items,
  }
}
