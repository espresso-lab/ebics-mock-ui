import { randomBytes } from 'node:crypto'
import { ALGO, NS, RETURN_TEXT } from './namespaces.js'
import { AUTH_SIGNATURE_SKELETON, signDocument } from './signature.js'

export function newTransactionId(): string {
  return randomBytes(16).toString('hex').toUpperCase()
}

export function newOrderId(): string {
  return 'N' + randomBytes(2).toString('hex').toUpperCase().slice(0, 3)
}

function reportText(code: string): string {
  return RETURN_TEXT[code] ?? '[EBICS_OK] OK'
}

export function buildHevResponse(): string {
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<ebicsHEVResponse xmlns="${NS.H000}">` +
    `<SystemReturnCode><ReturnCode>000000</ReturnCode><ReportText>[EBICS_OK] OK</ReportText></SystemReturnCode>` +
    `<VersionNumber ProtocolVersion="H005">05.00</VersionNumber>` +
    `</ebicsHEVResponse>`
  )
}

export function buildKeyManagementResponse(returnCode: string, orderId?: string): string {
  const text = reportText(returnCode)
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<ebicsKeyManagementResponse xmlns="${NS.H005}" xmlns:ds="${NS.DS}" Version="H005" Revision="1">` +
    `<header authenticate="true"><static></static>` +
    `<mutable>${orderId ? `<OrderID>${orderId}</OrderID>` : ''}<ReturnCode>${returnCode}</ReturnCode><ReportText>${text}</ReportText></mutable>` +
    `</header>` +
    `<body><ReturnCode authenticate="true">${returnCode}</ReturnCode></body>` +
    `</ebicsKeyManagementResponse>`
  )
}

export interface EncryptedTransfer {
  orderDataB64: string
  transactionKeyB64: string
  pubKeyDigestB64: string
}

function dataEncryptionInfoXml(transfer: EncryptedTransfer): string {
  return (
    `<DataEncryptionInfo authenticate="true">` +
    `<EncryptionPubKeyDigest Version="E002" Algorithm="${ALGO.SHA256}">${transfer.pubKeyDigestB64}</EncryptionPubKeyDigest>` +
    `<TransactionKey>${transfer.transactionKeyB64}</TransactionKey>` +
    `</DataEncryptionInfo>`
  )
}

export function buildHpbKeyManagementResponse(transfer: EncryptedTransfer): string {
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<ebicsKeyManagementResponse xmlns="${NS.H005}" xmlns:ds="${NS.DS}" Version="H005" Revision="1">` +
    `<header authenticate="true"><static></static>` +
    `<mutable><ReturnCode>000000</ReturnCode><ReportText>[EBICS_OK] OK</ReportText></mutable></header>` +
    `<body><DataTransfer>${dataEncryptionInfoXml(transfer)}<OrderData>${transfer.orderDataB64}</OrderData></DataTransfer>` +
    `<ReturnCode authenticate="true">000000</ReturnCode></body>` +
    `</ebicsKeyManagementResponse>`
  )
}

export interface EbicsResponseOptions {
  phase: 'Initialisation' | 'Transfer' | 'Receipt'
  bankX002Priv: string
  transactionId?: string
  numSegments?: number
  segmentNumber?: number
  lastSegment?: boolean
  orderId?: string
  returnCode: string
  headerReturnCode?: string
  transfer?: EncryptedTransfer
}

export function buildEbicsResponse(opts: EbicsResponseOptions): string {
  const headerCode = opts.headerReturnCode ?? opts.returnCode
  const staticParts =
    (opts.transactionId ? `<TransactionID>${opts.transactionId}</TransactionID>` : '') +
    (opts.numSegments !== undefined ? `<NumSegments>${opts.numSegments}</NumSegments>` : '')
  const segment =
    opts.segmentNumber !== undefined
      ? `<SegmentNumber lastSegment="${opts.lastSegment ? 'true' : 'false'}">${opts.segmentNumber}</SegmentNumber>`
      : ''
  const mutable =
    `<TransactionPhase>${opts.phase}</TransactionPhase>` +
    segment +
    (opts.orderId ? `<OrderID>${opts.orderId}</OrderID>` : '') +
    `<ReturnCode>${headerCode}</ReturnCode><ReportText>${reportText(headerCode)}</ReportText>`
  const body =
    (opts.transfer ? `<DataTransfer>${dataEncryptionInfoXml(opts.transfer)}<OrderData>${opts.transfer.orderDataB64}</OrderData></DataTransfer>` : '') +
    `<ReturnCode authenticate="true">${opts.returnCode}</ReturnCode>`

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<ebicsResponse xmlns="${NS.H005}" xmlns:ds="${NS.DS}" Version="H005" Revision="1">` +
    `<header authenticate="true"><static>${staticParts}</static><mutable>${mutable}</mutable></header>` +
    AUTH_SIGNATURE_SKELETON +
    `<body>${body}</body>` +
    `</ebicsResponse>`

  return signDocument(xml, opts.bankX002Priv)
}
