import type { Order, Participant, SignatureClass, VeuOrder } from '@ebics-mock/shared'
import type { Store } from '../db/store.js'
import { requireBankKey } from './bank.js'
import { bookOrder } from './booking.js'
import { aesDecryptInflate, decryptTransactionKey, orderHash, verifyA006Digest } from './crypto.js'
import { REASON, protocol, step, type HacStep } from './hac.js'
import type { HandlerResult, RespondDownload } from './handlers.js'
import { RETURN } from './namespaces.js'
import type { ParsedRequest } from './request.js'
import { buildEbicsResponse } from './responses.js'
import { attrOf, byLocalName, escapeXml, parseXml, textOf } from './xml.js'

const NS = 'xmlns="urn:org:ebics:H005"'

/**
 * The distributed signature as a bank runs it (EBICS 3.0.2, chapter 8): HVU and HVZ list the open orders of
 * the participant's customer, HVD hands out an order's hash value with its accompanying note, HVT the order
 * file itself, and HVE and HVS sign or cancel an order with an A006 signature over that hash value. A transport
 * participant (class T) can do none of it.
 */
export function handleVeuInitialisation(
  store: Store,
  parsed: ParsedRequest,
  participant: Participant,
  respond: RespondDownload,
): HandlerResult {
  if (participant.signatureClass === 'T') return rejectTransportOnly(store, participant, parsed.orderType)
  if (parsed.orderType === 'HVU' || parsed.orderType === 'HVZ') {
    const folder = folderOf(store, participant)
    if (!folder.length) return veuNoData(store, participant, parsed.orderType)
    const extended = parsed.orderType === 'HVZ'
    const details = folder.map(({ veu, order }) => orderDetails(store, veu, order, participant, extended)).join('')
    const root = `${parsed.orderType}ResponseOrderData`
    return respond(participant, [], Buffer.from(`<${root} ${NS}>${details}</${root}>`, 'utf8'))
  }

  const referenced = referencedOrder(store, parsed, participant)
  if ('returnCode' in referenced) return veuError(store, participant, parsed.orderType, referenced.returnCode)
  const { veu, order } = referenced
  switch (parsed.orderType) {
    case 'HVD':
      return respond(participant, [], Buffer.from(hvdOrderData(veu, order), 'utf8'))
    case 'HVT':
      return completeOrderData(parsed)
        ? respond(participant, [], painOf(order))
        : veuError(store, participant, 'HVT', RETURN.UNSUPPORTED_REQUEST_FOR_ORDER_INSTANCE)
    case 'HVE':
      return signOrder(store, parsed, participant, veu, order)
    case 'HVS':
      return cancelOrder(store, parsed, participant, veu, order)
    default:
      return veuNoData(store, participant, parsed.orderType)
  }
}

function rejectTransportOnly(store: Store, participant: Participant, orderType: string): HandlerResult {
  switch (orderType) {
    case 'HVU':
    case 'HVZ':
      return veuNoData(store, participant, orderType)
    case 'HVD':
    case 'HVT':
      return veuError(store, participant, orderType, RETURN.DISTRIBUTED_SIGNATURE_AUTHORISATION_FAILED)
    default:
      return veuError(store, participant, orderType, RETURN.AUTHORISATION_ORDER_IDENTIFIER_FAILED)
  }
}

function folderOf(store: Store, participant: Participant): { veu: VeuOrder; order: Order }[] {
  return store.listOpenVeuOfCustomer(participant.hostId, participant.partnerId).flatMap((veu) => {
    const order = store.getOrderByOrderId(veu.orderId)
    return order ? [{ veu, order }] : []
  })
}

/**
 * The order an HVD, HVT, HVE or HVS request names by the submitter's customer ID and order number. It has to
 * belong to the participant's own customer, and HVE and HVS find a finished order final rather than unknown.
 */
function referencedOrder(
  store: Store,
  parsed: ParsedRequest,
  participant: Participant,
): { veu: VeuOrder; order: Order } | { returnCode: string } {
  const params = byLocalName(parsed.doc, `${parsed.orderType}OrderParams`)
  const veu = params ? store.getVeuByOrderId(textOf(params, 'OrderID')) : undefined
  const originator = veu ? store.getParticipant(veu.participantId) : undefined
  const order = veu ? store.getOrderByOrderId(veu.orderId) : undefined
  const ownCustomer =
    originator !== undefined &&
    originator.hostId === participant.hostId &&
    originator.partnerId === participant.partnerId &&
    originator.partnerId === textOf(params, 'PartnerID')
  if (!veu || !order || !ownCustomer) return { returnCode: RETURN.ORDERID_UNKNOWN }
  if (veu.status !== 'OPEN') {
    const upload = parsed.orderType === 'HVE' || parsed.orderType === 'HVS'
    return { returnCode: upload ? RETURN.ORDERID_ALREADY_FINAL : RETURN.ORDERID_UNKNOWN }
  }
  return { veu, order }
}

function painOf(order: Order): Buffer {
  return Buffer.from(order.rawPain, 'utf8')
}

function digestXml(order: Order): string {
  return `<DataDigest SignatureVersion="A006">${orderHash(painOf(order)).toString('base64')}</DataDigest>`
}

function serviceXml(order: Order): string {
  const directDebit = order.kind === 'CDD' || order.kind === 'CDC'
  const serviceName = order.service || (directDebit ? 'SDD' : 'SCT')
  return (
    `<Service><ServiceName>${escapeXml(serviceName)}</ServiceName><Scope>DE</Scope>` +
    `<MsgName>${escapeXml(order.msgName || (directDebit ? 'pain.008' : 'pain.001'))}</MsgName></Service>`
  )
}

function orderDetails(store: Store, veu: VeuOrder, order: Order, viewer: Participant, extended: boolean): string {
  const size = painOf(order).length
  const credit = order.kind === 'CCT' || order.kind === 'CCC'
  return (
    `<OrderDetails>` +
    serviceXml(order) +
    `<OrderID>${escapeXml(veu.orderId)}</OrderID>` +
    (extended ? `${digestXml(order)}<OrderDataAvailable>true</OrderDataAvailable>` : '') +
    `<OrderDataSize>${size}</OrderDataSize>` +
    (extended
      ? `<OrderDetailsAvailable>false</OrderDetailsAvailable><TotalOrders>${order.itemCount}</TotalOrders>` +
        `<TotalAmount isCredit="${credit}">${escapeXml(order.totalAmount)}</TotalAmount><Currency>${escapeXml(order.currency)}</Currency>`
      : '') +
    `<SigningInfo readyToBeSigned="${!signedBy(veu, viewer)}" NumSigRequired="${veu.signaturesRequired}" NumSigDone="${veu.signaturesDone}"/>` +
    signerInfos(veu) +
    originatorInfo(store.getParticipant(veu.participantId), veu) +
    `</OrderDetails>`
  )
}

function signedBy(veu: VeuOrder, participant: Participant): boolean {
  return veu.signers.some((signer) => signer.participantId === participant.id)
}

function signerInfos(veu: VeuOrder): string {
  return veu.signers
    .map(
      (signer) =>
        `<SignerInfo><PartnerID>${escapeXml(signer.partnerId)}</PartnerID><UserID>${escapeXml(signer.userId)}</UserID>` +
        (signer.userName ? `<Name>${escapeXml(signer.userName)}</Name>` : '') +
        `<Timestamp>${signer.createdAt}</Timestamp><Permission AuthorisationLevel="${signer.authorisationLevel}"/></SignerInfo>`,
    )
    .join('')
}

function originatorInfo(originator: Participant | undefined, veu: VeuOrder): string {
  return (
    `<OriginatorInfo><PartnerID>${escapeXml(originator?.partnerId || 'UNKNOWN')}</PartnerID>` +
    `<UserID>${escapeXml(originator?.userId || 'UNKNOWN')}</UserID>` +
    (originator?.userName ? `<Name>${escapeXml(originator.userName)}</Name>` : '') +
    `<Timestamp>${veu.createdAt}</Timestamp></OriginatorInfo>`
  )
}

function hvdOrderData(veu: VeuOrder, order: Order): string {
  return (
    `<HVDResponseOrderData ${NS}>` +
    digestXml(order) +
    `<DisplayFile>${Buffer.from(displayFile(veu, order), 'utf8').toString('base64')}</DisplayFile>` +
    `<OrderDataAvailable>true</OrderDataAvailable>` +
    `<OrderDataSize>${painOf(order).length}</OrderDataSize>` +
    `<OrderDetailsAvailable>false</OrderDetailsAvailable>` +
    signerInfos(veu) +
    `</HVDResponseOrderData>`
  )
}

/** The accompanying note (Begleitzettel) a bank prints for an order in the VEU. */
function displayFile(veu: VeuOrder, order: Order): string {
  const kind = order.kind === 'CDD' || order.kind === 'CDC' ? 'SEPA-Lastschrift' : 'SEPA-Überweisung'
  const hash = orderHash(painOf(order)).toString('hex').toUpperCase().match(/../g)!.join(' ')
  return [
    'Begleitzettel zur Verteilten Elektronischen Unterschrift',
    `Auftragsart: ${kind} (${order.msgName})`,
    `Auftragsnummer: ${veu.orderId}`,
    `Anzahl Zahlungen: ${order.itemCount}`,
    `Summe: ${order.totalAmount} ${order.currency}`,
    `Hashwert (SHA-256): ${hash}`,
  ].join('\n')
}

function completeOrderData(parsed: ParsedRequest): boolean {
  const flags = byLocalName(parsed.doc, 'OrderFlags')
  return flags !== undefined && attrOf(flags, 'completeOrderData') === 'true'
}

/**
 * Whether the signatures release the order: one single signature (E), two first signatures (A + A) or a first
 * and a second one (A + B) — a second signature alone never does.
 */
function releases(levels: SignatureClass[]): boolean {
  const count = (level: SignatureClass) => levels.filter((given) => given === level).length
  return count('E') > 0 || count('A') >= 2 || (count('A') >= 1 && count('B') >= 1)
}

/** The A006 signature in an HVE or HVS request, verified over the order's hash value with the signer's key. */
function signsHash(store: Store, parsed: ParsedRequest, participant: Participant, order: Order): boolean {
  const a006 = store.getParticipantKey(participant.id, 'A006')
  if (!a006 || !parsed.transactionKey || !parsed.signatureData) return false
  try {
    const transactionKey = decryptTransactionKey(parsed.transactionKey, requireBankKey(store, 'E002').privateKeyPem)
    const signatureXml = aesDecryptInflate(parsed.signatureData, transactionKey).toString('utf8')
    const signature = byLocalName(parseXml(signatureXml), 'OrderSignatureData')
    if (!signature || textOf(signature, 'SignatureVersion') !== 'A006') return false
    if (textOf(signature, 'PartnerID') !== participant.partnerId || textOf(signature, 'UserID') !== participant.userId) {
      return false
    }
    const value = Buffer.from(textOf(signature, 'SignatureValue').replace(/\s+/g, ''), 'base64')
    return verifyA006Digest(a006.publicKeyPem, orderHash(painOf(order)), value)
  } catch {
    return false
  }
}

function signOrder(store: Store, parsed: ParsedRequest, participant: Participant, veu: VeuOrder, order: Order) {
  if (signedBy(veu, participant)) return veuError(store, participant, 'HVE', RETURN.DUPLICATE_SIGNATURE)
  if (!signsHash(store, parsed, participant, order)) {
    return veuError(store, participant, 'HVE', RETURN.SIGNATURE_VERIFICATION_FAILED)
  }
  store.addVeuSigner(veu.id, participant.id, participant.signatureClass)
  const released = releases([...veu.signers.map((signer) => signer.authorisationLevel), participant.signatureClass])
  const done = veu.signaturesDone + 1
  store.updateVeu(veu.id, done, released ? 'SIGNED' : 'OPEN', released ? done : Math.max(veu.signaturesRequired, done + 1))
  protocol(store, participant.id, 'HVE', RETURN.OK, veu.orderId)
  orderStep(store, veu, step('VEU_VERIFICATION', REASON.SIGNATURES_CORRECT))
  if (released) release(store, veu)
  return ok(store, participant, 'HVE')
}

function cancelOrder(store: Store, parsed: ParsedRequest, participant: Participant, veu: VeuOrder, order: Order) {
  if (!signsHash(store, parsed, participant, order)) {
    return veuError(store, participant, 'HVS', RETURN.SIGNATURE_VERIFICATION_FAILED)
  }
  protocol(store, participant.id, 'HVS', RETURN.OK, veu.orderId)
  cancelVeu(store, veu)
  return ok(store, participant, 'HVS')
}

/** The approval in the bank's own app: enough signatures given there, the order runs. */
export function approveVeu(store: Store, veu: VeuOrder): VeuOrder {
  const signaturesDone = veu.signaturesDone + 1
  const signed = signaturesDone >= veu.signaturesRequired
  store.updateVeu(veu.id, signaturesDone, signed ? 'SIGNED' : 'OPEN')
  orderStep(store, veu, step('VEU_VERIFICATION', REASON.SIGNATURES_CORRECT))
  if (signed) release(store, veu)
  return store.getVeu(veu.id)!
}

export function cancelVeu(store: Store, veu: VeuOrder): VeuOrder {
  store.updateVeu(veu.id, veu.signaturesDone, 'CANCELLED')
  const order = store.getOrderByOrderId(veu.orderId)
  if (order) store.setOrderStatus(order.id, 'REJECTED')
  orderStep(store, veu, step('VEU_CANCEL_ORDER', REASON.ORDER_CANCELLED))
  orderStep(store, veu, step('ORDER_HAC_FINAL_NEG'))
  return store.getVeu(veu.id)!
}

function release(store: Store, veu: VeuOrder) {
  executeAuthorizedOrder(store, veu.orderId)
  orderStep(store, veu, step('VEU_VERIFICATION_END', REASON.FORWARDED_FOR_POSTPROCESSING))
  orderStep(store, veu, step('ORDER_HAC_FINAL_POS'))
}

function orderStep(store: Store, veu: VeuOrder, hac: HacStep) {
  protocol(store, veu.participantId, 'BTU', RETURN.OK, veu.orderId, hac)
}

function executeAuthorizedOrder(store: Store, orderId: string) {
  const order = store.getOrderByOrderId(orderId)
  if (!order) return
  try {
    bookOrder(store, order.id)
  } catch {
    store.setOrderStatus(order.id, 'BOOKED')
  }
}

function ok(store: Store, participant: Participant, orderType: string): HandlerResult {
  const bank = requireBankKey(store, 'X002')
  const xml = buildEbicsResponse({ phase: 'Initialisation', bankX002Priv: bank.privateKeyPem, returnCode: RETURN.OK })
  return { xml, participantId: participant.id, orderType, phase: 'Initialisation', returnCode: RETURN.OK, transactionId: null }
}

function veuNoData(store: Store, participant: Participant, orderType: string): HandlerResult {
  return veuError(store, participant, orderType, RETURN.NO_DOWNLOAD_DATA)
}

/** A business return code: the transaction itself went fine, so the header says OK and the body tells why not. */
function veuError(store: Store, participant: Participant, orderType: string, returnCode: string): HandlerResult {
  protocol(store, participant.id, orderType, returnCode)
  const bank = requireBankKey(store, 'X002')
  const xml = buildEbicsResponse({
    phase: 'Initialisation',
    bankX002Priv: bank.privateKeyPem,
    headerReturnCode: RETURN.OK,
    returnCode,
  })
  return { xml, participantId: participant.id, orderType, phase: 'Initialisation', returnCode, transactionId: null }
}
