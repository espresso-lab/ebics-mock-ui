import type { Participant, VeuOrder } from '@ebics-mock/shared'
import type { Store } from '../db/store.js'
import { requireBankKey } from './bank.js'
import { sha256 } from './crypto.js'
import type { HandlerResult, RespondDownload } from './handlers.js'
import { protocol } from './handlers.js'
import { RETURN } from './namespaces.js'
import type { ParsedRequest } from './request.js'
import { buildEbicsResponse } from './responses.js'
import { escapeXml, textOf } from './xml.js'

const NS = 'xmlns="urn:org:ebics:H005"'

export function handleVeuInitialisation(
  store: Store,
  parsed: ParsedRequest,
  participant: Participant,
  respond: RespondDownload,
): HandlerResult {
  switch (parsed.orderType) {
    case 'HVU':
    case 'HVZ': {
      const open = store.listOpenVeu()
      if (!open.length) return veuNoData(store, participant, parsed.orderType)
      return respond(participant, [], Buffer.from(buildHvuResponseOrderData(store, open), 'utf8'))
    }
    case 'HVD':
    case 'HVT': {
      const veu = findVeu(store, parsed)
      if (!veu) return veuNoData(store, participant, parsed.orderType)
      return respond(participant, [], Buffer.from(buildHvdResponseOrderData(veu), 'utf8'))
    }
    case 'HVE':
      return signOrder(store, participant, parsed)
    case 'HVS':
      return cancelOrder(store, participant, parsed)
    default:
      return veuNoData(store, participant, parsed.orderType)
  }
}

function serviceFor(kind: string): string {
  const directDebit = kind === 'CDD' || kind === 'CDC'
  return (
    `<Service><ServiceName>${directDebit ? 'SDD' : 'SCT'}</ServiceName>` +
    `<Scope>DE</Scope><MsgName>${directDebit ? 'pain.008' : 'pain.001'}</MsgName></Service>`
  )
}

function buildHvuResponseOrderData(store: Store, open: VeuOrder[]): string {
  const details = open
    .map((veu) => {
      const originator = store.getParticipant(veu.participantId)
      const partnerId = originator?.partnerId || 'UNKNOWN'
      const userId = originator?.userId || 'UNKNOWN'
      const ready = veu.signaturesDone < veu.signaturesRequired
      return (
        `<OrderDetails>` +
        serviceFor(veu.kind) +
        `<OrderID>${veu.orderId}</OrderID>` +
        `<OrderDataSize>100</OrderDataSize>` +
        `<SigningInfo readyToBeSigned="${ready}" NumSigRequired="${veu.signaturesRequired}" NumSigDone="${veu.signaturesDone}"/>` +
        `<OriginatorInfo><PartnerID>${escapeXml(partnerId)}</PartnerID><UserID>${escapeXml(userId)}</UserID><Timestamp>${veu.createdAt}</Timestamp></OriginatorInfo>` +
        `</OrderDetails>`
      )
    })
    .join('')
  return `<HVUResponseOrderData ${NS}>${details}</HVUResponseOrderData>`
}

function buildHvdResponseOrderData(veu: VeuOrder): string {
  const digest = sha256(Buffer.from(veu.orderId, 'utf8')).toString('base64')
  const display = Buffer.from(`VEU ${veu.orderId} ${veu.kind} ${veu.totalAmount} ${veu.currency}`, 'utf8').toString('base64')
  return (
    `<HVDResponseOrderData ${NS}>` +
    `<DataDigest SignatureVersion="A006">${digest}</DataDigest>` +
    `<DisplayFile>${display}</DisplayFile>` +
    `<OrderDataAvailable>true</OrderDataAvailable>` +
    `<OrderDataSize>100</OrderDataSize>` +
    `<OrderDetailsAvailable>true</OrderDetailsAvailable>` +
    `</HVDResponseOrderData>`
  )
}

function signOrder(store: Store, participant: Participant, parsed: ParsedRequest): HandlerResult {
  const veu = findVeu(store, parsed)
  if (veu) {
    const done = veu.signaturesDone + 1
    const status: VeuOrder['status'] = done >= veu.signaturesRequired ? 'SIGNED' : 'OPEN'
    store.updateVeu(veu.id, done, status)
    if (status === 'SIGNED') store.setOrderStatus(orderDbId(store, veu.orderId), 'BOOKED')
    protocol(store, participant.id, 'HVE', RETURN.OK, veu.orderId)
  }
  return ok(store, participant, 'HVE')
}

function cancelOrder(store: Store, participant: Participant, parsed: ParsedRequest): HandlerResult {
  const veu = findVeu(store, parsed)
  if (veu) {
    store.updateVeu(veu.id, veu.signaturesDone, 'CANCELLED')
    store.setOrderStatus(orderDbId(store, veu.orderId), 'REJECTED')
    protocol(store, participant.id, 'HVS', RETURN.OK, veu.orderId)
  }
  return ok(store, participant, 'HVS')
}

function findVeu(store: Store, parsed: ParsedRequest): VeuOrder | undefined {
  const orderId = textOf(parsed.doc, 'OrderID')
  return orderId ? store.getVeuByOrderId(orderId) : store.listOpenVeu()[0]
}

function orderDbId(store: Store, orderId: string): string {
  return store.listOrders().find((o) => o.orderId === orderId)?.id ?? ''
}

function ok(store: Store, participant: Participant, orderType: string): HandlerResult {
  const bank = requireBankKey(store, 'X002')
  const xml = buildEbicsResponse({ phase: 'Initialisation', bankX002Priv: bank.privateKeyPem, returnCode: RETURN.OK })
  return { xml, participantId: participant.id, orderType, phase: 'Initialisation', returnCode: RETURN.OK, transactionId: null }
}

function veuNoData(store: Store, participant: Participant, orderType: string): HandlerResult {
  protocol(store, participant.id, orderType, RETURN.NO_DOWNLOAD_DATA)
  const bank = requireBankKey(store, 'X002')
  const xml = buildEbicsResponse({ phase: 'Initialisation', bankX002Priv: bank.privateKeyPem, returnCode: RETURN.NO_DOWNLOAD_DATA })
  return { xml, participantId: participant.id, orderType, phase: 'Initialisation', returnCode: RETURN.NO_DOWNLOAD_DATA, transactionId: null }
}
