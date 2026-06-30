import type { Store } from '../db/store.js'
import { dispatch } from './handlers.js'
import { RETURN } from './namespaces.js'
import { parseRequest } from './request.js'
import { buildKeyManagementResponse } from './responses.js'

export interface EbicsResult {
  xml: string
}

export function handleEbics(store: Store, rawXml: string): EbicsResult {
  let parsed
  try {
    parsed = parseRequest(rawXml)
  } catch {
    return { xml: buildKeyManagementResponse(RETURN.INVALID_REQUEST) }
  }

  const handlerResult = dispatch(store, parsed)

  store.addExchange({
    participantId: handlerResult.participantId,
    rootElement: parsed.root,
    orderType: handlerResult.orderType || parsed.orderType,
    transactionId: handlerResult.transactionId,
    phase: handlerResult.phase || parsed.phase,
    returnCode: handlerResult.returnCode,
    requestXml: rawXml,
    responseXml: handlerResult.xml,
  })

  return { xml: handlerResult.xml }
}
