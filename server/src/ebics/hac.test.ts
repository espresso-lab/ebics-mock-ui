import { describe, expect, it } from 'vitest'
import { Store } from '../db/store.js'
import { REASON, buildHacPain002, defaultStep, protocol, step } from './hac.js'
import { RETURN } from './namespaces.js'
import { parseXml, selectNodes, textOf } from './xml.js'

describe('defaultStep', () => {
  it('derives the pain.002 action and result from order type and return code', () => {
    expect(defaultStep('BTU', RETURN.OK)).toEqual({ action: 'FILE_UPLOAD', reasonCode: 'TS01' })
    expect(defaultStep('BTD', RETURN.NO_DOWNLOAD_DATA)).toEqual({ action: 'FILE_DOWNLOAD', reasonCode: 'TD01' })
    expect(defaultStep('HTD', RETURN.INVALID_USER_OR_USER_STATE)).toEqual({ action: 'FILE_DOWNLOAD', reasonCode: 'TA01' })
    expect(defaultStep('HVE', RETURN.OK)).toEqual({ action: 'ES_UPLOAD', reasonCode: 'TS01' })
  })
})

describe('buildHacPain002', () => {
  it('renders one OrgnlPmtInfAndSts per protocol step, oldest first, without Rsn on the final marker', () => {
    const store = new Store(':memory:')
    const participant = store.findOrCreateParticipant('MOCKBANK', 'MV1', 'U1')
    protocol(store, participant.id, 'BTU', RETURN.OK, 'N001')
    protocol(store, participant.id, 'BTU', RETURN.OK, 'N001', step('VEU_FORWARDING', REASON.TRANSFERRED_TO_VEU))
    protocol(store, participant.id, 'BTU', RETURN.OK, 'N001', step('ORDER_HAC_FINAL_POS'))

    const doc = parseXml(buildHacPain002('MOCKBANK', participant, store.listProtocol(participant.id)))
    const steps = selectNodes(doc, "//*[local-name()='OrgnlPmtInfAndSts']")

    expect(steps.map((s) => textOf(s, 'OrgnlPmtInfId'))).toEqual(['FILE_UPLOAD', 'VEU_FORWARDING', 'ORDER_HAC_FINAL_POS'])
    expect(steps.map((s) => textOf(s, 'Cd'))).toEqual(['TS01', 'DS06', ''])
    expect(textOf(doc, 'OrgnlMsgId')).toBe('EBICS')
    const ids = selectNodes(steps[1]!, ".//*[local-name()='Othr']").map((o) => [textOf(o, 'Prtry'), textOf(o, 'Id')])
    expect(ids).toEqual(
      expect.arrayContaining([
        ['PartnerID', 'MV1'],
        ['UserID', 'U1'],
        ['AdminOrderType', 'BTU'],
        ['OrderID', 'N001'],
      ]),
    )
    expect(ids.find(([name]) => name === 'TimeStamp')?.[1]).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })
})
