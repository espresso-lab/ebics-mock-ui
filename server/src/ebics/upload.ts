import type { Participant } from '@ebics-mock/shared'
import type { Store } from '../db/store.js'
import { requireBankKey } from './bank.js'
import { aesDecryptInflate, decryptTransactionKey } from './crypto.js'
import { verifyOrderSignature } from './es.js'
import type { HandlerResult } from './handlers.js'
import { newOrderId, protocol } from './handlers.js'
import { RETURN } from './namespaces.js'
import { parsePain } from './pain.js'
import type { ParsedRequest } from './request.js'
import { buildEbicsResponse, newTransactionId } from './responses.js'

interface UploadMeta {
  tek: string
  orderId: string
  serviceName: string
  signatureData?: string
}

export function handleBtuInitialisation(store: Store, parsed: ParsedRequest, participant: Participant): HandlerResult {
  const bankE002 = requireBankKey(store, 'E002')
  if (!parsed.transactionKey) return uploadError(store, participant, parsed.orderType)

  const tek = decryptTransactionKey(parsed.transactionKey, bankE002.privateKeyPem)
  const orderId = newOrderId()
  const txId = newTransactionId()
  const meta: UploadMeta = {
    tek: tek.toString('base64'),
    orderId,
    serviceName: parsed.btf?.serviceName ?? 'SCT',
    signatureData: parsed.signatureData?.toString('base64'),
  }
  store.createTransactionState({
    transactionId: txId,
    participantId: participant.id,
    orderType: 'BTU',
    direction: 'UPLOAD',
    segmentsTotal: 1,
    segmentsDone: 0,
    payload: JSON.stringify(meta),
  })

  if (parsed.orderDataSegments.length) return finalize(store, participant.id, txId, parsed)

  const bank = requireBankKey(store, 'X002')
  const xml = buildEbicsResponse({
    phase: 'Initialisation',
    bankX002Priv: bank.privateKeyPem,
    transactionId: txId,
    orderId,
    returnCode: RETURN.OK,
  })
  return { xml, participantId: participant.id, orderType: 'BTU', phase: 'Initialisation', returnCode: RETURN.OK, transactionId: txId }
}

export function handleUploadTransfer(store: Store, parsed: ParsedRequest): HandlerResult {
  const state = store.getTransactionState(parsed.transactionId)
  const bank = requireBankKey(store, 'X002')
  if (!state || state.direction !== 'UPLOAD') {
    const xml = buildEbicsResponse({
      phase: 'Transfer',
      bankX002Priv: bank.privateKeyPem,
      transactionId: parsed.transactionId,
      returnCode: RETURN.TX_UNKNOWN,
    })
    return { xml, participantId: null, orderType: 'BTU', phase: 'Transfer', returnCode: RETURN.TX_UNKNOWN, transactionId: parsed.transactionId }
  }
  return finalize(store, state.participantId, state.transactionId, parsed)
}

function finalize(store: Store, participantId: string | null, transactionId: string, parsed: ParsedRequest): HandlerResult {
  const state = store.getTransactionState(transactionId)!
  const meta = JSON.parse(state.payload) as UploadMeta
  const tek = Buffer.from(meta.tek, 'base64')
  const bank = requireBankKey(store, 'X002')

  let orderDataBytes: Buffer | null = null
  try {
    orderDataBytes = aesDecryptInflate(Buffer.concat(parsed.orderDataSegments), tek)
  } catch {
    orderDataBytes = null
  }

  if (orderDataBytes) {
    const painXml = orderDataBytes.toString('utf8')
    const pain = parsePain(painXml, meta.serviceName)
    const a006 = participantId ? store.getParticipantKey(participantId, 'A006') : undefined
    const signatureValid =
      meta.signatureData && a006
        ? verifyOrderSignature(Buffer.from(meta.signatureData, 'base64'), tek, orderDataBytes, a006.publicKeyPem)
        : null
    const orderDbId = store.createOrder({
      participantId: participantId ?? '',
      orderId: meta.orderId,
      kind: pain.kind,
      service: meta.serviceName,
      msgName: pain.msgName,
      signatureValid,
      itemCount: pain.items.length,
      totalAmount: pain.totalAmount,
      currency: pain.currency,
      rawPain: painXml,
    })
    pain.items.forEach((item) => store.addOrderItem(orderDbId, item))
    protocol(store, participantId, 'BTU', RETURN.OK, meta.orderId)
  }

  store.deleteTransactionState(transactionId)
  const xml = buildEbicsResponse({
    phase: 'Transfer',
    bankX002Priv: bank.privateKeyPem,
    transactionId,
    orderId: meta.orderId,
    returnCode: RETURN.OK,
  })
  return { xml, participantId, orderType: 'BTU', phase: 'Transfer', returnCode: RETURN.OK, transactionId }
}

function uploadError(store: Store, participant: Participant, orderType: string): HandlerResult {
  protocol(store, participant.id, orderType, RETURN.INTERNAL_ERROR)
  const bank = requireBankKey(store, 'X002')
  const xml = buildEbicsResponse({ phase: 'Initialisation', bankX002Priv: bank.privateKeyPem, returnCode: RETURN.INTERNAL_ERROR })
  return { xml, participantId: participant.id, orderType, phase: 'Initialisation', returnCode: RETURN.INTERNAL_ERROR, transactionId: null }
}
