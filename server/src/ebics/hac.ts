import type { HacAction, Participant, ProtocolEntry } from '@ebics-mock/shared'
import type { Store } from '../db/store.js'
import { RETURN } from './namespaces.js'
import { escapeXml } from './xml.js'

const PAIN002_NS = 'urn:iso:std:iso:20022:tech:xsd:pain.002.001.03'

export const REASON = {
  TRANSMISSION_SUCCESSFUL: 'TS01',
  TRANSMISSION_ABORTED: 'TA01',
  NO_DATA_AVAILABLE: 'TD01',
  SIGNATURES_CORRECT: 'DS01',
  ORDER_CANCELLED: 'DS02',
  FORWARDED_FOR_POSTPROCESSING: 'DS05',
  TRANSFERRED_TO_VEU: 'DS06',
  NOT_ALLOWED_PAYMENT: 'DS0G',
} as const

const REASON_TEXT: Record<string, string> = {
  TS01: 'Übertragung erfolgreich',
  TA01: 'Übertragung abgebrochen',
  TD01: 'keine Daten zur Abholung vorhanden',
  DS01: 'Unterschrift korrekt',
  DS02: 'Auftrag storniert',
  DS05: 'Auftrag zur Weiterverarbeitung weitergeleitet',
  DS06: 'Auftrag zur VEU weitergeleitet',
  DS0G: 'Teilnehmer nicht unterschriftsberechtigt',
}

export interface HacStep {
  action: HacAction
  reasonCode: string
}

export const step = (action: HacAction, reasonCode = ''): HacStep => ({ action, reasonCode })

const UPLOAD_ORDER_TYPES = new Set(['INI', 'HIA', 'BTU', 'HVS'])

export function defaultStep(orderType: string, returnCode: string): HacStep {
  const transmitted = returnCode === RETURN.OK ? REASON.TRANSMISSION_SUCCESSFUL : REASON.TRANSMISSION_ABORTED
  if (orderType === 'HVE') return step('ES_UPLOAD', transmitted)
  if (UPLOAD_ORDER_TYPES.has(orderType)) return step('FILE_UPLOAD', transmitted)
  return step('FILE_DOWNLOAD', returnCode === RETURN.NO_DOWNLOAD_DATA ? REASON.NO_DATA_AVAILABLE : transmitted)
}

export function protocol(
  store: Store,
  participantId: string | null,
  orderType: string,
  returnCode: string,
  orderId: string | null = null,
  hac: HacStep = defaultStep(orderType, returnCode),
) {
  store.addProtocol({ participantId, orderType, orderId, ...hac, returnCode, reasonText: REASON_TEXT[hac.reasonCode] ?? '' })
}

function proprietaryId(name: string, value: string): string {
  return `<Othr><Id>${escapeXml(value)}</Id><SchmeNm><Prtry>${name}</Prtry></SchmeNm></Othr>`
}

function stepXml(participant: Participant, entry: ProtocolEntry): string {
  const { action, reasonCode } = entry.action ? entry : defaultStep(entry.orderType, entry.returnCode)
  return (
    `<OrgnlPmtInfAndSts><OrgnlPmtInfId>${action}</OrgnlPmtInfId><StsRsnInf>` +
    `<Orgtr><Nm>${escapeXml(participant.userName || participant.partnerId)}</Nm><Id><OrgId>` +
    proprietaryId('PartnerID', participant.partnerId) +
    proprietaryId('UserID', participant.userId) +
    proprietaryId('AdminOrderType', entry.orderType) +
    (entry.orderId ? proprietaryId('OrderID', entry.orderId) : '') +
    proprietaryId('TimeStamp', entry.createdAt) +
    `</OrgId></Id></Orgtr>` +
    (reasonCode ? `<Rsn><Cd>${reasonCode}</Cd></Rsn>` : '') +
    (entry.reasonText ? `<AddtlInf>${escapeXml(entry.reasonText.slice(0, 105))}</AddtlInf>` : '') +
    `</StsRsnInf></OrgnlPmtInfAndSts>`
  )
}

export function buildHacPain002(hostId: string, participant: Participant, newestFirst: ProtocolEntry[]): string {
  const created = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
  const steps = newestFirst.slice(0, 200).reverse().map((entry) => stepXml(participant, entry)).join('')
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<Document xmlns="${PAIN002_NS}"><CstmrPmtStsRpt>` +
    `<GrpHdr><MsgId>HAC-${Date.now()}</MsgId><CreDtTm>${created}</CreDtTm>` +
    `<InitgPty><Id><OrgId>${proprietaryId('HostID', hostId)}</OrgId></Id></InitgPty></GrpHdr>` +
    `<OrgnlGrpInfAndSts><OrgnlMsgId>EBICS</OrgnlMsgId><OrgnlMsgNmId>EBICS</OrgnlMsgNmId></OrgnlGrpInfAndSts>` +
    steps +
    `</CstmrPmtStsRpt></Document>`
  )
}
