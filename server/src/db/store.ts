import { randomUUID } from 'node:crypto'
import Database from 'better-sqlite3'
import type {
  Account,
  BankKeyInfo,
  Booking,
  CreditDebit,
  EbicsKeyType,
  Exchange,
  HpbState,
  InitState,
  Order,
  OrderItem,
  OrderKind,
  Participant,
  ParticipantKey,
  ProtocolEntry,
  Statement,
  VeuOrder,
} from '@ebics-mock/shared'
import { SCHEMA } from './schema.js'

type Row = Record<string, unknown>

const now = () => new Date().toISOString()
const str = (v: unknown) => String(v ?? '')
const num = (v: unknown) => Number(v ?? 0)

export interface BankKey {
  type: 'X002' | 'E002'
  publicKeyPem: string
  privateKeyPem: string
  digest: string
}

export interface TransactionState {
  transactionId: string
  participantId: string | null
  orderType: string
  direction: 'UPLOAD' | 'DOWNLOAD'
  segmentsTotal: number
  segmentsDone: number
  payload: string
}

export class Store {
  readonly db: Database.Database

  constructor(path: string) {
    this.db = new Database(path)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
    this.db.exec(SCHEMA)
  }

  close() {
    this.db.close()
  }

  getBankKey(type: 'X002' | 'E002'): BankKey | undefined {
    const r = this.db.prepare('SELECT * FROM bank_key WHERE type = ?').get(type) as Row | undefined
    if (!r) return undefined
    return {
      type,
      publicKeyPem: str(r.public_key_pem),
      privateKeyPem: str(r.private_key_pem),
      digest: str(r.digest),
    }
  }

  upsertBankKey(type: 'X002' | 'E002', publicKeyPem: string, privateKeyPem: string, digest: string) {
    this.db
      .prepare(
        `INSERT INTO bank_key (type, public_key_pem, private_key_pem, digest, created_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(type) DO UPDATE SET public_key_pem = excluded.public_key_pem,
           private_key_pem = excluded.private_key_pem, digest = excluded.digest`,
      )
      .run(type, publicKeyPem, privateKeyPem, digest, now())
  }

  listBankKeys(): BankKeyInfo[] {
    return (this.db.prepare('SELECT type, public_key_pem, digest FROM bank_key ORDER BY type').all() as Row[]).map(
      (r) => ({ type: r.type as 'X002' | 'E002', publicKeyPem: str(r.public_key_pem), digest: str(r.digest) }),
    )
  }

  findOrCreateParticipant(hostId: string, partnerId: string, userId: string): Participant {
    const existing = this.db
      .prepare('SELECT * FROM participant WHERE host_id = ? AND partner_id = ? AND user_id = ?')
      .get(hostId, partnerId, userId) as Row | undefined
    if (existing) return mapParticipant(existing)
    const id = randomUUID()
    this.db
      .prepare(
        `INSERT INTO participant (id, host_id, partner_id, user_id, created_at) VALUES (?, ?, ?, ?, ?)`,
      )
      .run(id, hostId, partnerId, userId, now())
    return this.getParticipant(id)!
  }

  getParticipant(id: string): Participant | undefined {
    const r = this.db.prepare('SELECT * FROM participant WHERE id = ?').get(id) as Row | undefined
    return r ? mapParticipant(r) : undefined
  }

  listParticipants(): Participant[] {
    return (this.db.prepare('SELECT * FROM participant ORDER BY created_at DESC').all() as Row[]).map(mapParticipant)
  }

  setInitState(id: string, field: 'ini_state' | 'hia_state', state: InitState) {
    this.db.prepare(`UPDATE participant SET ${field} = ? WHERE id = ?`).run(state, id)
  }

  setHpbState(id: string, state: HpbState) {
    this.db.prepare('UPDATE participant SET hpb_state = ? WHERE id = ?').run(state, id)
  }

  setUserName(id: string, userName: string) {
    if (userName) this.db.prepare('UPDATE participant SET user_name = ? WHERE id = ?').run(userName, id)
  }

  setParticipantKey(participantId: string, type: EbicsKeyType, publicKeyPem: string, digest: string) {
    this.db
      .prepare(
        `INSERT INTO participant_key (participant_id, type, public_key_pem, digest, created_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(participant_id, type) DO UPDATE SET public_key_pem = excluded.public_key_pem,
           digest = excluded.digest, created_at = excluded.created_at`,
      )
      .run(participantId, type, publicKeyPem, digest, now())
  }

  getParticipantKey(participantId: string, type: EbicsKeyType): ParticipantKey | undefined {
    const r = this.db
      .prepare('SELECT * FROM participant_key WHERE participant_id = ? AND type = ?')
      .get(participantId, type) as Row | undefined
    return r ? mapParticipantKey(r) : undefined
  }

  listParticipantKeys(participantId: string): ParticipantKey[] {
    return (
      this.db.prepare('SELECT * FROM participant_key WHERE participant_id = ? ORDER BY type').all(participantId) as Row[]
    ).map(mapParticipantKey)
  }

  listAccounts(): Account[] {
    return (this.db.prepare('SELECT * FROM account ORDER BY iban').all() as Row[]).map(mapAccount)
  }

  getAccount(id: string): Account | undefined {
    const r = this.db.prepare('SELECT * FROM account WHERE id = ?').get(id) as Row | undefined
    return r ? mapAccount(r) : undefined
  }

  getAccountByIban(iban: string): Account | undefined {
    const r = this.db.prepare('SELECT * FROM account WHERE iban = ?').get(iban) as Row | undefined
    return r ? mapAccount(r) : undefined
  }

  createAccount(input: Omit<Account, 'id'> & { partnerId: string }): Account {
    const id = randomUUID()
    this.db
      .prepare(
        `INSERT INTO account (id, partner_id, iban, bic, currency, name, balance) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(id, input.partnerId, input.iban, input.bic, input.currency, input.name, input.balance)
    return this.getAccount(id)!
  }

  listBookings(accountId: string): Booking[] {
    return (
      this.db.prepare('SELECT * FROM booking WHERE account_id = ? ORDER BY book_date, created_at').all(accountId) as Row[]
    ).map(mapBooking)
  }

  createBooking(input: Omit<Booking, 'id'> & { statementId?: string | null }): Booking {
    const id = randomUUID()
    this.db
      .prepare(
        `INSERT INTO booking (id, account_id, book_date, value_date, amount, currency, credit_debit,
           remittance, counterparty_name, counterparty_iban, statement_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.accountId,
        input.bookDate,
        input.valueDate,
        input.amount,
        input.currency,
        input.creditDebit,
        input.remittance,
        input.counterpartyName,
        input.counterpartyIban,
        input.statementId ?? null,
        now(),
      )
    return this.db.prepare('SELECT * FROM booking WHERE id = ?').get(id) as Booking
  }

  createOrder(input: {
    participantId: string
    orderId: string
    kind: OrderKind
    service: string
    msgName: string
    signatureValid: boolean | null
    itemCount: number
    totalAmount: string
    currency: string
    rawPain: string
    status?: Order['status']
  }): string {
    const id = randomUUID()
    this.db
      .prepare(
        `INSERT INTO upload_order (id, participant_id, order_id, kind, service, msg_name, status,
           signature_valid, item_count, total_amount, currency, raw_pain, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.participantId,
        input.orderId,
        input.kind,
        input.service,
        input.msgName,
        input.status ?? 'RECEIVED',
        input.signatureValid === null ? null : input.signatureValid ? 1 : 0,
        input.itemCount,
        input.totalAmount,
        input.currency,
        input.rawPain,
        now(),
      )
    return id
  }

  addOrderItem(orderId: string, item: OrderItem) {
    this.db
      .prepare(
        `INSERT INTO order_item (id, order_id, name, iban, amount, currency, remittance, end_to_end_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(randomUUID(), orderId, item.name, item.iban, item.amount, item.currency, item.remittance, item.endToEndId)
  }

  listOrders(): Order[] {
    return (this.db.prepare('SELECT * FROM upload_order ORDER BY created_at DESC').all() as Row[]).map(mapOrder)
  }

  getOrder(id: string): Order | undefined {
    const r = this.db.prepare('SELECT * FROM upload_order WHERE id = ?').get(id) as Row | undefined
    if (!r) return undefined
    const order = mapOrder(r)
    order.items = (
      this.db.prepare('SELECT * FROM order_item WHERE order_id = ?').all(id) as Row[]
    ).map(mapOrderItem)
    return order
  }

  setOrderStatus(id: string, status: Order['status']) {
    this.db.prepare('UPDATE upload_order SET status = ? WHERE id = ?').run(status, id)
  }

  createStatement(input: {
    accountId: string
    iban: string
    fromDate: string
    toDate: string
    fileName: string
    content: string
  }): Statement {
    const id = randomUUID()
    this.db
      .prepare(
        `INSERT INTO statement (id, account_id, iban, from_date, to_date, file_name, content, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'AVAILABLE', ?)`,
      )
      .run(id, input.accountId, input.iban, input.fromDate, input.toDate, input.fileName, input.content, now())
    return this.getStatement(id)!
  }

  getStatement(id: string): Statement | undefined {
    const r = this.db.prepare('SELECT * FROM statement WHERE id = ?').get(id) as Row | undefined
    return r ? mapStatement(r) : undefined
  }

  getStatementContent(id: string): string | undefined {
    const r = this.db.prepare('SELECT content FROM statement WHERE id = ?').get(id) as Row | undefined
    return r ? str(r.content) : undefined
  }

  listStatements(): Statement[] {
    return (this.db.prepare('SELECT * FROM statement ORDER BY created_at DESC').all() as Row[]).map(mapStatement)
  }

  listAvailableStatements(): Statement[] {
    return (
      this.db.prepare("SELECT * FROM statement WHERE status = 'AVAILABLE' ORDER BY created_at").all() as Row[]
    ).map(mapStatement)
  }

  markStatementsFetched(ids: string[]) {
    const stmt = this.db.prepare("UPDATE statement SET status = 'FETCHED' WHERE id = ?")
    const tx = this.db.transaction((list: string[]) => list.forEach((id) => stmt.run(id)))
    tx(ids)
  }

  addProtocol(input: {
    participantId: string | null
    orderType: string
    orderId: string | null
    returnCode: string
    reasonText: string
  }) {
    this.db
      .prepare(
        `INSERT INTO protocol (id, participant_id, order_type, order_id, return_code, reason_text, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(randomUUID(), input.participantId, input.orderType, input.orderId, input.returnCode, input.reasonText, now())
  }

  listProtocol(participantId?: string): ProtocolEntry[] {
    const rows = participantId
      ? (this.db
          .prepare('SELECT * FROM protocol WHERE participant_id = ? ORDER BY created_at DESC')
          .all(participantId) as Row[])
      : (this.db.prepare('SELECT * FROM protocol ORDER BY created_at DESC LIMIT 500').all() as Row[])
    return rows.map(mapProtocol)
  }

  addExchange(input: {
    participantId: string | null
    rootElement: string
    orderType: string
    transactionId: string | null
    phase: string
    returnCode: string | null
    requestXml: string
    responseXml: string
  }) {
    this.db
      .prepare(
        `INSERT INTO exchange (id, participant_id, root_element, order_type, transaction_id, phase,
           return_code, request_xml, response_xml, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        randomUUID(),
        input.participantId,
        input.rootElement,
        input.orderType,
        input.transactionId,
        input.phase,
        input.returnCode,
        input.requestXml,
        input.responseXml,
        now(),
      )
  }

  listExchanges(limit = 200): Exchange[] {
    return (
      this.db.prepare('SELECT * FROM exchange ORDER BY created_at DESC LIMIT ?').all(limit) as Row[]
    ).map(mapExchange)
  }

  createVeu(input: {
    orderId: string
    participantId: string
    kind: OrderKind
    totalAmount: string
    currency: string
    signaturesRequired: number
  }): VeuOrder {
    const id = randomUUID()
    this.db
      .prepare(
        `INSERT INTO veu_order (id, order_id, participant_id, kind, total_amount, currency,
           signatures_done, signatures_required, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, 'OPEN', ?)`,
      )
      .run(id, input.orderId, input.participantId, input.kind, input.totalAmount, input.currency, input.signaturesRequired, now())
    return this.getVeu(id)!
  }

  getVeu(id: string): VeuOrder | undefined {
    const r = this.db.prepare('SELECT * FROM veu_order WHERE id = ?').get(id) as Row | undefined
    return r ? mapVeu(r) : undefined
  }

  getVeuByOrderId(orderId: string): VeuOrder | undefined {
    const r = this.db.prepare('SELECT * FROM veu_order WHERE order_id = ?').get(orderId) as Row | undefined
    return r ? mapVeu(r) : undefined
  }

  listOpenVeu(): VeuOrder[] {
    return (this.db.prepare("SELECT * FROM veu_order WHERE status = 'OPEN' ORDER BY created_at").all() as Row[]).map(
      mapVeu,
    )
  }

  updateVeu(id: string, signaturesDone: number, status: VeuOrder['status']) {
    this.db.prepare('UPDATE veu_order SET signatures_done = ?, status = ? WHERE id = ?').run(signaturesDone, status, id)
  }

  createTransactionState(state: TransactionState) {
    this.db
      .prepare(
        `INSERT INTO transaction_state (transaction_id, participant_id, order_type, direction,
           segments_total, segments_done, payload, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        state.transactionId,
        state.participantId,
        state.orderType,
        state.direction,
        state.segmentsTotal,
        state.segmentsDone,
        state.payload,
        now(),
      )
  }

  getTransactionState(transactionId: string): TransactionState | undefined {
    const r = this.db
      .prepare('SELECT * FROM transaction_state WHERE transaction_id = ?')
      .get(transactionId) as Row | undefined
    if (!r) return undefined
    return {
      transactionId: str(r.transaction_id),
      participantId: r.participant_id ? str(r.participant_id) : null,
      orderType: str(r.order_type),
      direction: r.direction as 'UPLOAD' | 'DOWNLOAD',
      segmentsTotal: num(r.segments_total),
      segmentsDone: num(r.segments_done),
      payload: str(r.payload),
    }
  }

  deleteTransactionState(transactionId: string) {
    this.db.prepare('DELETE FROM transaction_state WHERE transaction_id = ?').run(transactionId)
  }
}

function mapParticipant(r: Row): Participant {
  return {
    id: str(r.id),
    hostId: str(r.host_id),
    partnerId: str(r.partner_id),
    userId: str(r.user_id),
    userName: str(r.user_name),
    iniState: r.ini_state as InitState,
    hiaState: r.hia_state as InitState,
    hpbState: r.hpb_state as HpbState,
    createdAt: str(r.created_at),
  }
}

function mapParticipantKey(r: Row): ParticipantKey {
  return {
    participantId: str(r.participant_id),
    type: r.type as EbicsKeyType,
    publicKeyPem: str(r.public_key_pem),
    digest: str(r.digest),
    createdAt: str(r.created_at),
  }
}

function mapAccount(r: Row): Account {
  return {
    id: str(r.id),
    iban: str(r.iban),
    bic: str(r.bic),
    currency: str(r.currency),
    name: str(r.name),
    balance: str(r.balance),
  }
}

function mapBooking(r: Row): Booking {
  return {
    id: str(r.id),
    accountId: str(r.account_id),
    bookDate: str(r.book_date),
    valueDate: str(r.value_date),
    amount: str(r.amount),
    currency: str(r.currency),
    creditDebit: r.credit_debit as CreditDebit,
    remittance: str(r.remittance),
    counterpartyName: str(r.counterparty_name),
    counterpartyIban: str(r.counterparty_iban),
  }
}

function mapOrder(r: Row): Order {
  return {
    id: str(r.id),
    participantId: str(r.participant_id),
    orderId: str(r.order_id),
    kind: r.kind as OrderKind,
    service: str(r.service),
    msgName: str(r.msg_name),
    status: r.status as Order['status'],
    signatureValid: r.signature_valid === null ? null : num(r.signature_valid) === 1,
    itemCount: num(r.item_count),
    totalAmount: str(r.total_amount),
    currency: str(r.currency),
    rawPain: str(r.raw_pain),
    createdAt: str(r.created_at),
  }
}

function mapOrderItem(r: Row): OrderItem {
  return {
    name: str(r.name),
    iban: str(r.iban),
    amount: str(r.amount),
    currency: str(r.currency),
    remittance: str(r.remittance),
    endToEndId: str(r.end_to_end_id),
  }
}

function mapStatement(r: Row): Statement {
  return {
    id: str(r.id),
    accountId: str(r.account_id),
    iban: str(r.iban),
    fromDate: str(r.from_date),
    toDate: str(r.to_date),
    fileName: str(r.file_name),
    status: r.status as Statement['status'],
    createdAt: str(r.created_at),
  }
}

function mapProtocol(r: Row): ProtocolEntry {
  return {
    id: str(r.id),
    participantId: r.participant_id ? str(r.participant_id) : null,
    orderType: str(r.order_type),
    orderId: r.order_id ? str(r.order_id) : null,
    returnCode: str(r.return_code),
    reasonText: str(r.reason_text),
    createdAt: str(r.created_at),
  }
}

function mapExchange(r: Row): Exchange {
  return {
    id: str(r.id),
    participantId: r.participant_id ? str(r.participant_id) : null,
    rootElement: str(r.root_element),
    orderType: str(r.order_type),
    transactionId: r.transaction_id ? str(r.transaction_id) : null,
    phase: str(r.phase),
    returnCode: r.return_code ? str(r.return_code) : null,
    requestXml: str(r.request_xml),
    responseXml: str(r.response_xml),
    createdAt: str(r.created_at),
  }
}

function mapVeu(r: Row): VeuOrder {
  return {
    id: str(r.id),
    orderId: str(r.order_id),
    participantId: str(r.participant_id),
    kind: r.kind as OrderKind,
    totalAmount: str(r.total_amount),
    currency: str(r.currency),
    signaturesDone: num(r.signatures_done),
    signaturesRequired: num(r.signatures_required),
    status: r.status as VeuOrder['status'],
    createdAt: str(r.created_at),
  }
}
