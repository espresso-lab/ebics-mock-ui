import type { Account, Order } from '@ebics-mock/shared'
import type { Store } from '../db/store.js'
import { byLocalName, parseXml, textOf } from './xml.js'

export interface BookOrderResult {
  booked: number
  accountIban: string
}

/**
 * Executes a received upload order against the ordering account, like a bank booking the order after
 * full authorisation: one booking per pain item (CCT/CCC debit the debtor account, CDD/CDC credit the
 * creditor account) and the order moves to BOOKED. The bookings then flow into generated camt.053
 * statements.
 */
export function bookOrder(store: Store, orderDbId: string): BookOrderResult {
  const order = store.getOrder(orderDbId)
  if (!order) throw new Error('order not found')
  if (order.status === 'BOOKED') throw new Error(`order ${order.orderId} is already booked`)
  if (order.status === 'REJECTED') throw new Error(`order ${order.orderId} was rejected`)

  const account = orderingAccount(store, order)
  const items = order.items ?? []
  if (items.length === 0) throw new Error(`order ${order.orderId} has no items`)

  const isOutgoing = order.kind === 'CCT' || order.kind === 'CCC'
  const today = new Date().toISOString().slice(0, 10)
  for (const item of items) {
    store.createBooking({
      accountId: account.id,
      bookDate: today,
      valueDate: today,
      amount: item.amount,
      currency: item.currency,
      creditDebit: isOutgoing ? 'DBIT' : 'CRDT',
      remittance: item.remittance,
      counterpartyName: item.name,
      counterpartyIban: item.iban,
      endToEndId: item.endToEndId,
    })
  }
  store.setOrderStatus(order.id, 'BOOKED')
  return { booked: items.length, accountIban: account.iban }
}

function orderingAccount(store: Store, order: Order): Account {
  const acctTag = order.kind === 'CDD' || order.kind === 'CDC' ? 'CdtrAcct' : 'DbtrAcct'
  const acct = byLocalName(parseXml(order.rawPain), acctTag)
  const iban = (acct ? textOf(acct, 'IBAN') : '').replace(/\s+/g, '')
  if (!iban) throw new Error(`order ${order.orderId}: pain file has no ${acctTag} IBAN`)
  const account = store.getAccountByIban(iban)
  if (!account) {
    throw new Error(`no account with IBAN ${iban} on the mock bank — create it under Konten first`)
  }
  return account
}
