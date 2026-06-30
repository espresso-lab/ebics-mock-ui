export type EbicsKeyType = 'A006' | 'X002' | 'E002'

export type InitState = 'NEW' | 'RECEIVED' | 'DONE'
export type HpbState = 'PENDING' | 'DELIVERED'

export interface Participant {
  id: string
  hostId: string
  partnerId: string
  userId: string
  userName: string
  iniState: InitState
  hiaState: InitState
  hpbState: HpbState
  createdAt: string
}

export interface ParticipantKey {
  participantId: string
  type: EbicsKeyType
  publicKeyPem: string
  digest: string
  createdAt: string
}

export interface BankKeyInfo {
  type: 'X002' | 'E002'
  publicKeyPem: string
  digest: string
}

export interface Account {
  id: string
  iban: string
  bic: string
  currency: string
  name: string
  balance: string
}

export type CreditDebit = 'CRDT' | 'DBIT'

export interface Booking {
  id: string
  accountId: string
  bookDate: string
  valueDate: string
  amount: string
  currency: string
  creditDebit: CreditDebit
  remittance: string
  counterpartyName: string
  counterpartyIban: string
}

export type OrderKind = 'CCT' | 'CCC' | 'CDD' | 'CDC'
export type OrderStatus = 'RECEIVED' | 'PENDING_VEU' | 'BOOKED' | 'REJECTED'

export interface OrderItem {
  name: string
  iban: string
  amount: string
  currency: string
  remittance: string
  endToEndId: string
}

export interface Order {
  id: string
  participantId: string
  orderId: string
  kind: OrderKind
  service: string
  msgName: string
  status: OrderStatus
  signatureValid: boolean | null
  itemCount: number
  totalAmount: string
  currency: string
  rawPain: string
  createdAt: string
  items?: OrderItem[]
}

export type StatementStatus = 'AVAILABLE' | 'FETCHED'

export interface Statement {
  id: string
  accountId: string
  iban: string
  fromDate: string
  toDate: string
  fileName: string
  status: StatementStatus
  createdAt: string
}

export interface ProtocolEntry {
  id: string
  participantId: string | null
  orderType: string
  orderId: string | null
  returnCode: string
  reasonText: string
  createdAt: string
}

export type ExchangeDirection = 'IN' | 'OUT'

export interface Exchange {
  id: string
  participantId: string | null
  rootElement: string
  orderType: string
  transactionId: string | null
  phase: string
  returnCode: string | null
  requestXml: string
  responseXml: string
  createdAt: string
}

export interface VeuOrder {
  id: string
  orderId: string
  participantId: string
  kind: OrderKind
  totalAmount: string
  currency: string
  signaturesDone: number
  signaturesRequired: number
  status: 'OPEN' | 'SIGNED' | 'CANCELLED'
  createdAt: string
}
