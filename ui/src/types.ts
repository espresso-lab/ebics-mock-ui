export interface Participant {
  id: string
  hostId: string
  partnerId: string
  userId: string
  userName: string
  iniState: 'NEW' | 'RECEIVED' | 'DONE'
  hiaState: 'NEW' | 'RECEIVED' | 'DONE'
  hpbState: 'PENDING' | 'DELIVERED'
  activated: boolean
  createdAt: string
}

export interface ParticipantKey {
  id: string
  participantId: string
  type: 'A006' | 'X002' | 'E002'
  publicKeyPem: string
  digest: string
  createdAt: string
}

export interface BankKey {
  id: string
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

export interface Booking {
  id: string
  accountId: string
  bookDate: string
  valueDate: string
  amount: string
  currency: string
  creditDebit: 'CRDT' | 'DBIT'
  remittance: string
  counterpartyName: string
  counterpartyIban: string
}

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
  kind: 'CCT' | 'CCC' | 'CDD' | 'CDC'
  service: string
  msgName: string
  status: 'RECEIVED' | 'PENDING_VEU' | 'BOOKED' | 'REJECTED'
  signatureValid: boolean | null
  itemCount: number
  totalAmount: string
  currency: string
  rawPain: string
  createdAt: string
  items?: OrderItem[]
}

export interface Statement {
  id: string
  accountId: string
  iban: string
  fromDate: string
  toDate: string
  fileName: string
  status: 'AVAILABLE' | 'FETCHED'
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
  kind: string
  totalAmount: string
  currency: string
  signaturesDone: number
  signaturesRequired: number
  status: 'OPEN' | 'SIGNED' | 'CANCELLED'
  createdAt: string
}
