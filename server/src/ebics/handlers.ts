import type { Participant } from '@ebics-mock/shared'
import { config } from '../config.js'
import type { Store } from '../db/store.js'
import { requireBankKey } from './bank.js'
import { ebicsPublicKeyDigest, encryptOrderData, selfSignedCertificateB64 } from './crypto.js'
import { buildHaaResponseOrderData, buildHpbResponseOrderData, buildHtdResponseOrderData } from './orderdata.js'
import { RETURN } from './namespaces.js'
import type { ParsedRequest } from './request.js'
import {
  buildEbicsResponse,
  buildHevResponse,
  buildHpbKeyManagementResponse,
  buildKeyManagementResponse,
  newOrderId,
  newTransactionId,
} from './responses.js'
import { handleBtuInitialisation, handleUploadTransfer } from './upload.js'
import { handleBtdInitialisation } from './download.js'
import { handleVeuInitialisation } from './veu.js'

export interface HandlerResult {
  xml: string
  participantId: string | null
  orderType: string
  phase: string
  returnCode: string
  transactionId: string | null
}

export type RespondDownload = (participant: Participant, statementIds: string[], payload: Buffer) => HandlerResult

export function dispatch(store: Store, parsed: ParsedRequest): HandlerResult {
  switch (parsed.root) {
    case 'ebicsHEVRequest':
      return result(buildHevResponse(), null, 'HEV', '', RETURN.OK, null)
    case 'ebicsUnsecuredRequest':
      return parsed.orderType === 'HIA' ? handleHia(store, parsed) : handleIni(store, parsed)
    case 'ebicsNoPubKeyDigestsRequest':
      return handleHpb(store, parsed)
    case 'ebicsRequest':
      return handleRequest(store, parsed)
    default:
      return errorResult(store, parsed, RETURN.INTERNAL_ERROR)
  }
}

function handleIni(store: Store, parsed: ParsedRequest): HandlerResult {
  const participant = store.findOrCreateParticipant(parsed.hostId || config.hostId, parsed.partnerId, parsed.userId)
  if (!parsed.signatureKey) return keyMgmtError(store, parsed, participant, 'INI')
  store.setParticipantKey(participant.id, 'A006', parsed.signatureKey.publicKeyPem, ebicsPublicKeyDigest(parsed.signatureKey.publicKeyPem).toString('hex'))
  store.setInitState(participant.id, 'ini_state', 'DONE')
  protocol(store, participant.id, 'INI', RETURN.OK)
  return result(buildKeyManagementResponse(RETURN.OK), participant.id, 'INI', '', RETURN.OK, null)
}

function handleHia(store: Store, parsed: ParsedRequest): HandlerResult {
  const participant = store.findOrCreateParticipant(parsed.hostId || config.hostId, parsed.partnerId, parsed.userId)
  if (!parsed.authKey || !parsed.encryptionKey) return keyMgmtError(store, parsed, participant, 'HIA')
  store.setParticipantKey(participant.id, 'X002', parsed.authKey.publicKeyPem, ebicsPublicKeyDigest(parsed.authKey.publicKeyPem).toString('hex'))
  store.setParticipantKey(participant.id, 'E002', parsed.encryptionKey.publicKeyPem, ebicsPublicKeyDigest(parsed.encryptionKey.publicKeyPem).toString('hex'))
  store.setInitState(participant.id, 'hia_state', 'DONE')
  protocol(store, participant.id, 'HIA', RETURN.OK)
  return result(buildKeyManagementResponse(RETURN.OK), participant.id, 'HIA', '', RETURN.OK, null)
}

function handleHpb(store: Store, parsed: ParsedRequest): HandlerResult {
  const participant = store.findOrCreateParticipant(parsed.hostId || config.hostId, parsed.partnerId, parsed.userId)
  const clientE002 = store.getParticipantKey(participant.id, 'E002')
  if (!clientE002 || !participant.activated) {
    protocol(store, participant.id, 'HPB', RETURN.INVALID_USER_OR_USER_STATE)
    return result(buildKeyManagementResponse(RETURN.INVALID_USER_OR_USER_STATE), participant.id, 'HPB', '', RETURN.INVALID_USER_OR_USER_STATE, null)
  }
  const bankX002 = requireBankKey(store, 'X002')
  const bankE002 = requireBankKey(store, 'E002')
  const orderData = buildHpbResponseOrderData(
    config.hostId,
    selfSignedCertificateB64(bankX002.publicKeyPem, bankX002.privateKeyPem),
    selfSignedCertificateB64(bankE002.publicKeyPem, bankE002.privateKeyPem),
  )
  const enc = encryptOrderData(Buffer.from(orderData, 'utf8'), clientE002.publicKeyPem)
  store.setHpbState(participant.id, 'DELIVERED')
  protocol(store, participant.id, 'HPB', RETURN.OK)
  return result(
    buildHpbKeyManagementResponse({
      orderDataB64: enc.orderData.toString('base64'),
      transactionKeyB64: enc.transactionKey.toString('base64'),
      pubKeyDigestB64: enc.pubKeyDigest.toString('base64'),
    }),
    participant.id,
    'HPB',
    '',
    RETURN.OK,
    null,
  )
}

function handleRequest(store: Store, parsed: ParsedRequest): HandlerResult {
  if (parsed.phase === 'Receipt') return handleReceipt(store, parsed)
  if (parsed.phase === 'Transfer') return handleUploadTransfer(store, parsed)

  const participant = store.findOrCreateParticipant(parsed.hostId || config.hostId, parsed.partnerId, parsed.userId)
  switch (parsed.orderType) {
    case 'HTD':
      return respondDownload(store, participant, 'HTD', utf8(buildHtdResponseOrderData(htdContext(store, participant))))
    case 'HAA':
      return respondDownload(store, participant, 'HAA', utf8(buildHaaResponseOrderData()))
    case 'HAC':
    case 'PTK':
      return respondDownload(store, participant, parsed.orderType, utf8(buildProtocolOrderData(store, participant)))
    case 'BTD':
      return handleBtdInitialisation(store, parsed, participant, (p, t, x) => respondDownload(store, p, 'BTD', x, t))
    case 'BTU':
      return handleBtuInitialisation(store, parsed, participant)
    case 'HVU':
    case 'HVD':
    case 'HVZ':
    case 'HVT':
    case 'HVE':
    case 'HVS':
      return handleVeuInitialisation(store, parsed, participant, (p, t, x) => respondDownload(store, p, parsed.orderType, x, t))
    default:
      return errorResult(store, parsed, RETURN.INVALID_USER_OR_USER_STATE)
  }
}

function utf8(value: string): Buffer {
  return Buffer.from(value, 'utf8')
}

export function respondDownload(
  store: Store,
  participant: Participant,
  orderType: string,
  payload: Buffer,
  statementIds: string[] = [],
): HandlerResult {
  const clientE002 = store.getParticipantKey(participant.id, 'E002')
  if (!clientE002) return result(downloadError(store), participant.id, orderType, 'Initialisation', RETURN.INVALID_USER_OR_USER_STATE, null)
  const enc = encryptOrderData(payload, clientE002.publicKeyPem)
  const txId = newTransactionId()
  const bank = requireBankKey(store, 'X002')
  store.createTransactionState({
    transactionId: txId,
    participantId: participant.id,
    orderType,
    direction: 'DOWNLOAD',
    segmentsTotal: 1,
    segmentsDone: 1,
    payload: JSON.stringify(statementIds),
  })
  protocol(store, participant.id, orderType, RETURN.OK)
  const xml = buildEbicsResponse({
    phase: 'Initialisation',
    bankX002Priv: bank.privateKeyPem,
    transactionId: txId,
    numSegments: 1,
    segmentNumber: 1,
    lastSegment: true,
    returnCode: RETURN.OK,
    transfer: {
      orderDataB64: enc.orderData.toString('base64'),
      transactionKeyB64: enc.transactionKey.toString('base64'),
      pubKeyDigestB64: enc.pubKeyDigest.toString('base64'),
    },
  })
  return result(xml, participant.id, orderType, 'Initialisation', RETURN.OK, txId)
}

function handleReceipt(store: Store, parsed: ParsedRequest): HandlerResult {
  const state = store.getTransactionState(parsed.transactionId)
  const bank = requireBankKey(store, 'X002')
  if (!state) {
    return result(
      buildEbicsResponse({ phase: 'Receipt', bankX002Priv: bank.privateKeyPem, transactionId: parsed.transactionId, returnCode: RETURN.TX_UNKNOWN }),
      null,
      'Receipt',
      'Receipt',
      RETURN.TX_UNKNOWN,
      parsed.transactionId,
    )
  }
  if (state.orderType === 'BTD') {
    const ids = safeJsonArray(state.payload)
    if (ids.length) store.markStatementsFetched(ids)
  }
  store.deleteTransactionState(state.transactionId)
  const xml = buildEbicsResponse({
    phase: 'Receipt',
    bankX002Priv: bank.privateKeyPem,
    transactionId: state.transactionId,
    returnCode: RETURN.DOWNLOAD_POSTPROCESS_DONE,
  })
  return result(xml, state.participantId, state.orderType, 'Receipt', RETURN.DOWNLOAD_POSTPROCESS_DONE, state.transactionId)
}

function htdContext(store: Store, participant: Participant) {
  const bound = store.listParticipantAccounts(participant.id)
  return {
    hostId: participant.hostId,
    partnerId: participant.partnerId,
    userId: participant.userId,
    userName: participant.userName || participant.userId,
    partnerName: participant.partnerId,
    accounts: bound.length > 0 ? bound : store.listAccounts(),
  }
}

function buildProtocolOrderData(store: Store, participant: Participant): string {
  const entries = store
    .listProtocol(participant.id)
    .slice(0, 50)
    .map(
      (e) =>
        `<Action OrderType="${e.orderType}" ${e.orderId ? `OrderID="${e.orderId}"` : ''}><ReturnCode>${e.returnCode}</ReturnCode><Timestamp>${e.createdAt}</Timestamp></Action>`,
    )
    .join('')
  return `<HACResponseOrderData xmlns="urn:org:ebics:H005">${entries}</HACResponseOrderData>`
}

function downloadError(store: Store): string {
  const bank = requireBankKey(store, 'X002')
  return buildEbicsResponse({ phase: 'Initialisation', bankX002Priv: bank.privateKeyPem, returnCode: RETURN.INVALID_USER_OR_USER_STATE })
}

function errorResult(store: Store, parsed: ParsedRequest, code: string): HandlerResult {
  const bank = store.getBankKey('X002')
  const xml = bank
    ? buildEbicsResponse({ phase: parsed.phase || 'Initialisation', bankX002Priv: bank.privateKeyPem, transactionId: parsed.transactionId, returnCode: code })
    : buildKeyManagementResponse(code)
  return result(xml, null, parsed.orderType, parsed.phase, code, parsed.transactionId || null)
}

function keyMgmtError(store: Store, _parsed: ParsedRequest, participant: Participant, orderType: string): HandlerResult {
  protocol(store, participant.id, orderType, RETURN.INTERNAL_ERROR)
  return result(buildKeyManagementResponse(RETURN.INTERNAL_ERROR), participant.id, orderType, '', RETURN.INTERNAL_ERROR, null)
}

export function protocol(store: Store, participantId: string | null, orderType: string, returnCode: string, orderId: string | null = null) {
  store.addProtocol({ participantId, orderType, orderId, returnCode, reasonText: returnCode === RETURN.OK ? 'OK' : '' })
}

export { newOrderId }

function result(xml: string, participantId: string | null, orderType: string, phase: string, returnCode: string, transactionId: string | null): HandlerResult {
  return { xml, participantId, orderType, phase, returnCode, transactionId }
}

function safeJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
