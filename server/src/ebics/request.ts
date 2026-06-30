import { inflateSync } from 'node:zlib'
import { publicKeyPemFromModExp, publicKeyPemFromX509 } from './crypto.js'
import { attrOf, byLocalName, parseXml, rootLocalName, selectFirst, selectNodes, textOf } from './xml.js'

export interface Btf {
  serviceName: string
  scope: string
  msgName: string
  msgVersion: string
  container: string
  serviceOption: string
}

export type RootElement =
  | 'ebicsHEVRequest'
  | 'ebicsUnsecuredRequest'
  | 'ebicsNoPubKeyDigestsRequest'
  | 'ebicsRequest'
  | 'unknown'

export type Phase = 'Initialisation' | 'Transfer' | 'Receipt' | ''

export interface RsaPub {
  publicKeyPem: string
  version: string
}

export interface ParsedRequest {
  raw: string
  doc: ReturnType<typeof parseXml>
  root: RootElement
  hostId: string
  partnerId: string
  userId: string
  orderType: string
  btf?: Btf
  phase: Phase
  transactionId: string
  segmentNumber: number
  lastSegment: boolean
  receiptCode: number
  signatureKey?: RsaPub
  authKey?: RsaPub
  encryptionKey?: RsaPub
  transactionKey?: Buffer
  signatureData?: Buffer
  orderDataSegments: Buffer[]
}

function decodeOrderData(base64: string): Buffer {
  const raw = Buffer.from(base64.replace(/\s+/g, ''), 'base64')
  try {
    return inflateSync(raw)
  } catch {
    return raw
  }
}

function keyFromInfo(node: Node | undefined, versionTag: string): RsaPub | undefined {
  if (!node) return undefined
  const certificate = textOf(node, 'X509Certificate')
  if (certificate) {
    return { publicKeyPem: publicKeyPemFromX509(certificate), version: textOf(node, versionTag) }
  }
  const modulus = textOf(node, 'Modulus')
  const exponent = textOf(node, 'Exponent')
  if (!modulus || !exponent) return undefined
  return { publicKeyPem: publicKeyPemFromModExp(modulus, exponent), version: textOf(node, versionTag) }
}

function parseBtf(node: Node | undefined): Btf | undefined {
  if (!node) return undefined
  const service = byLocalName(node, 'Service')
  if (!service) return undefined
  const msgName = byLocalName(service, 'MsgName')
  return {
    serviceName: textOf(service, 'ServiceName'),
    scope: textOf(service, 'Scope'),
    serviceOption: textOf(service, 'ServiceOption'),
    container: attrOf((byLocalName(service, 'Container') as Node) ?? service, 'containerType'),
    msgName: msgName?.textContent?.trim() ?? '',
    msgVersion: msgName ? attrOf(msgName, 'version') : '',
  }
}

export function parseRequest(xml: string): ParsedRequest {
  const doc = parseXml(xml)
  const root = rootLocalName(doc) as RootElement
  const header = byLocalName(doc, 'header')
  const staticHeader = header ? byLocalName(header, 'static') : undefined

  const orderDetails = staticHeader ? byLocalName(staticHeader, 'OrderDetails') : undefined
  const adminOrderType =
    (orderDetails ? textOf(orderDetails, 'AdminOrderType') : '') || (orderDetails ? textOf(orderDetails, 'OrderType') : '')

  const btf = parseBtf(orderDetails)
  const orderType = adminOrderType || (root === 'ebicsHEVRequest' ? 'HEV' : '')

  const mutable = header ? byLocalName(header, 'mutable') : undefined
  const phase = (mutable ? textOf(mutable, 'TransactionPhase') : '') as Phase

  const parsed: ParsedRequest = {
    raw: xml,
    doc,
    root: ['ebicsHEVRequest', 'ebicsUnsecuredRequest', 'ebicsNoPubKeyDigestsRequest', 'ebicsRequest'].includes(root)
      ? root
      : 'unknown',
    hostId: textOf(doc, 'HostID'),
    partnerId: staticHeader ? textOf(staticHeader, 'PartnerID') : '',
    userId: staticHeader ? textOf(staticHeader, 'UserID') : '',
    orderType: btf ? (root === 'ebicsRequest' && phase !== 'Initialisation' ? orderType : orderType) : orderType,
    btf,
    phase,
    transactionId: textOf(doc, 'TransactionID'),
    segmentNumber: Number(textOf(doc, 'SegmentNumber') || '0'),
    lastSegment: attrOf((byLocalName(doc, 'SegmentNumber') as Node) ?? doc, 'lastSegment') === 'true',
    receiptCode: Number(textOf(doc, 'ReceiptCode') || '0'),
    orderDataSegments: [],
  }

  if (root === 'ebicsUnsecuredRequest') {
    const orderDataText = textOf(doc, 'OrderData')
    if (orderDataText) {
      const orderData = decodeOrderData(orderDataText)
      const orderDoc = parseXml(orderData.toString('utf8'))
      if (orderType === 'INI') {
        parsed.signatureKey = keyFromInfo(byLocalName(orderDoc, 'SignaturePubKeyInfo'), 'SignatureVersion')
      } else if (orderType === 'HIA') {
        parsed.authKey = keyFromInfo(byLocalName(orderDoc, 'AuthenticationPubKeyInfo'), 'AuthenticationVersion')
        parsed.encryptionKey = keyFromInfo(byLocalName(orderDoc, 'EncryptionPubKeyInfo'), 'EncryptionVersion')
      }
    }
  }

  if (root === 'ebicsRequest') {
    const encInfo = byLocalName(doc, 'DataEncryptionInfo')
    if (encInfo) {
      const tk = textOf(encInfo, 'TransactionKey')
      if (tk) parsed.transactionKey = Buffer.from(tk.replace(/\s+/g, ''), 'base64')
    }
    const sigData = textOf(doc, 'SignatureData')
    if (sigData) parsed.signatureData = Buffer.from(sigData.replace(/\s+/g, ''), 'base64')
    for (const node of selectNodes(doc, "//*[local-name()='OrderData']")) {
      const text = node.textContent?.replace(/\s+/g, '') ?? ''
      if (text) parsed.orderDataSegments.push(Buffer.from(text, 'base64'))
    }
  }

  return parsed
}

export function authSignaturePresent(parsed: ParsedRequest): boolean {
  return selectFirst(parsed.doc, "//*[local-name()='SignatureValue']") !== undefined
}
