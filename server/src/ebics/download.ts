import type { Participant } from '@ebics-mock/shared'
import type { Store } from '../db/store.js'
import { requireBankKey } from './bank.js'
import type { HandlerResult, RespondDownload } from './handlers.js'
import { protocol } from './handlers.js'
import { RETURN } from './namespaces.js'
import type { ParsedRequest } from './request.js'
import { buildEbicsResponse } from './responses.js'
import { zipStored } from './zip.js'

export function handleBtdInitialisation(
  store: Store,
  parsed: ParsedRequest,
  participant: Participant,
  respond: RespondDownload,
): HandlerResult {
  const service = parsed.btf?.serviceName ?? ''
  const msgName = parsed.btf?.msgName ?? ''
  const isStatement = (service === 'EOP' || service === 'STM') && msgName.startsWith('camt.053')

  if (!isStatement) return noDownloadData(store, participant, parsed.orderType)

  const dated = Boolean(parsed.dateStart && parsed.dateEnd)
  const statements = dated
    ? store.listStatementsInRange(parsed.dateStart!, parsed.dateEnd!)
    : store.listAvailableStatements()
  if (!statements.length) return noDownloadData(store, participant, parsed.orderType)

  const files = statements.map((statement, index) => ({
    name: statement.fileName || `camt053_${index + 1}.xml`,
    content: Buffer.from(store.getStatementContent(statement.id) ?? '', 'utf8'),
  }))
  const container = parsed.btf?.container === 'ZIP' || !parsed.btf?.container
  const payload = container ? zipStored(files) : files[0]!.content
  const consumeIds = dated ? [] : statements.map((s) => s.id)
  return respond(participant, consumeIds, payload)
}

function noDownloadData(store: Store, participant: Participant, orderType: string): HandlerResult {
  protocol(store, participant.id, orderType, RETURN.NO_DOWNLOAD_DATA)
  const bank = requireBankKey(store, 'X002')
  const xml = buildEbicsResponse({
    phase: 'Initialisation',
    bankX002Priv: bank.privateKeyPem,
    headerReturnCode: RETURN.OK,
    returnCode: RETURN.NO_DOWNLOAD_DATA,
  })
  return { xml, participantId: participant.id, orderType, phase: 'Initialisation', returnCode: RETURN.NO_DOWNLOAD_DATA, transactionId: null }
}
