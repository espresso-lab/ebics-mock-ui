import { randomBytes } from 'node:crypto'
import type { SignatureClass } from '@ebics-mock/shared'
import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../app.js'
import { config } from '../config.js'
import { Store } from '../db/store.js'
import { ensureBankKeys } from './bank.js'
import {
  aesEncryptDeflate,
  decryptOrderData,
  ebicsPublicKeyDigest,
  encryptTransactionKey,
  generateRsaKeyPair,
  orderHash,
  signA006,
  signA006Digest,
} from './crypto.js'
import { byLocalName, parseXml, selectNodes, textOf } from './xml.js'

const HOST = config.hostId
const PARTNER = 'VEUKUNDE'

const pain =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.09"><CstmrCdtTrfInitn>` +
  `<GrpHdr><MsgId>VEU-1</MsgId><NbOfTxs>1</NbOfTxs><CtrlSum>123.45</CtrlSum></GrpHdr><PmtInf><CdtTrfTxInf>` +
  `<PmtId><EndToEndId>E2E-VEU</EndToEndId></PmtId><Amt><InstdAmt Ccy="EUR">123.45</InstdAmt></Amt>` +
  `<Cdtr><Nm>Hausmeister Muster</Nm></Cdtr><CdtrAcct><Id><IBAN>DE89370400440532013000</IBAN></Id></CdtrAcct>` +
  `<RmtInf><Ustrd>Rechnung 2026-11</Ustrd></RmtInf></CdtTrfTxInf></PmtInf></CstmrCdtTrfInitn></Document>\n`
const digest = orderHash(Buffer.from(pain, 'utf8'))

interface Subscriber {
  id: string
  userId: string
  partnerId: string
  a006: { publicKeyPem: string; privateKeyPem: string }
  e002: { publicKeyPem: string; privateKeyPem: string }
}

describe('distributed signature of another participant (HVU/HVZ/HVD/HVT/HVE/HVS)', () => {
  let app: FastifyInstance
  let store: Store

  const post = async (xml: string) =>
    (await app.inject({ method: 'POST', url: config.ebicsPath, headers: { 'content-type': 'text/xml' }, payload: xml })).body
  const bodyCode = (xml: string) => textOf(byLocalName(parseXml(xml), 'body')!, 'ReturnCode')

  const subscriber = (userId: string, signatureClass: SignatureClass, partnerId = PARTNER): Subscriber => {
    const keys = { A006: generateRsaKeyPair(), X002: generateRsaKeyPair(), E002: generateRsaKeyPair() }
    const participant = store.findOrCreateParticipant(HOST, partnerId, userId)
    for (const [type, pair] of Object.entries(keys) as ['A006' | 'X002' | 'E002', { publicKeyPem: string }][]) {
      store.setParticipantKey(participant.id, type, pair.publicKeyPem, ebicsPublicKeyDigest(pair.publicKeyPem).toString('hex'))
    }
    store.setParticipantActivated(participant.id, true)
    store.setSignatureClass(participant.id, signatureClass)
    store.setUserName(participant.id, `Teilnehmer ${userId}`)
    return { id: participant.id, userId, partnerId, a006: keys.A006, e002: keys.E002 }
  }

  const request = (s: Subscriber, orderDetails: string, body = '<body/>', numSegments?: number) =>
    `<ebicsRequest xmlns="urn:org:ebics:H005" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Version="H005" Revision="1">` +
    `<header authenticate="true"><static><HostID>${HOST}</HostID><PartnerID>${s.partnerId}</PartnerID><UserID>${s.userId}</UserID>` +
    `<OrderDetails>${orderDetails}</OrderDetails><SecurityMedium>0000</SecurityMedium>` +
    (numSegments === undefined ? '' : `<NumSegments>${numSegments}</NumSegments>`) +
    `</static><mutable><TransactionPhase>Initialisation</TransactionPhase></mutable></header>${body}</ebicsRequest>`

  const orderParams = (orderType: string, orderId: string, extra = '') =>
    `<${orderType}OrderParams><PartnerID>${PARTNER}</PartnerID>` +
    `<Service><ServiceName>SCT</ServiceName><Scope>DE</Scope><MsgName>pain.001</MsgName></Service>` +
    `<OrderID>${orderId}</OrderID>${extra}</${orderType}OrderParams>`

  const userSignature = (s: Subscriber, signature: Buffer) =>
    `<UserSignatureData xmlns="http://www.ebics.org/S002"><OrderSignatureData><SignatureVersion>A006</SignatureVersion>` +
    `<SignatureValue>${signature.toString('base64')}</SignatureValue><PartnerID>${s.partnerId}</PartnerID>` +
    `<UserID>${s.userId}</UserID></OrderSignatureData></UserSignatureData>`

  const dataTransfer = (transactionKey: Buffer, signatureData: Buffer, orderData = '') =>
    `<body><DataTransfer><DataEncryptionInfo authenticate="true">` +
    `<EncryptionPubKeyDigest Version="E002" Algorithm="http://www.w3.org/2001/04/xmlenc#sha256">x</EncryptionPubKeyDigest>` +
    `<TransactionKey>${transactionKey.toString('base64')}</TransactionKey></DataEncryptionInfo>` +
    `<SignatureData authenticate="true">${signatureData.toString('base64')}</SignatureData>` +
    `<DataDigest SignatureVersion="A006">${orderData}</DataDigest></DataTransfer></body>`

  const download = async (s: Subscriber, orderType: string, params = '') => {
    const response = await post(request(s, `<AdminOrderType>${orderType}</AdminOrderType>${params}`))
    const doc = parseXml(response)
    if (bodyCode(response) !== '000000') return { code: bodyCode(response), data: Buffer.alloc(0) }
    const orderData = Buffer.from(textOf(doc, 'OrderData'), 'base64')
    const transactionKey = Buffer.from(textOf(byLocalName(doc, 'DataEncryptionInfo')!, 'TransactionKey'), 'base64')
    return { code: '000000', data: decryptOrderData(orderData, transactionKey, s.e002.privateKeyPem) }
  }

  /** The submitter's BTU with the signature flag and requestEDS, as abrechnung360 sends it with a T participant. */
  const submit = async (submitter: Subscriber) => {
    const tek = randomBytes(16)
    const transactionKey = encryptTransactionKey(tek, store.getBankKey('E002')!.publicKeyPem)
    const signature = signA006(submitter.a006.privateKeyPem, Buffer.from(pain, 'utf8'))
    const signatureData = aesEncryptDeflate(Buffer.from(userSignature(submitter, signature), 'utf8'), tek)
    const details =
      `<AdminOrderType>BTU</AdminOrderType><BTUOrderParams><Service><ServiceName>SCT</ServiceName><Scope>DE</Scope>` +
      `<MsgName>pain.001</MsgName></Service><SignatureFlag requestEDS="true"/></BTUOrderParams>`
    const init = parseXml(await post(request(submitter, details, dataTransfer(transactionKey, signatureData), 1)))
    const transfer =
      `<ebicsRequest xmlns="urn:org:ebics:H005" Version="H005" Revision="1"><header authenticate="true"><static>` +
      `<HostID>${HOST}</HostID><TransactionID>${textOf(init, 'TransactionID')}</TransactionID></static><mutable>` +
      `<TransactionPhase>Transfer</TransactionPhase><SegmentNumber lastSegment="true">1</SegmentNumber></mutable></header>` +
      `<body><DataTransfer><OrderData>${aesEncryptDeflate(Buffer.from(pain, 'utf8'), tek).toString('base64')}</OrderData>` +
      `</DataTransfer></body></ebicsRequest>`
    await post(transfer)
    return textOf(init, 'OrderID')
  }

  /** HVE or HVS: only the signature over the hash value travels, the DataDigest stays empty (EBICS 3.0.2, 8.3.4). */
  const sign = async (signer: Subscriber, orderType: 'HVE' | 'HVS', orderId: string, hash = digest) => {
    const tek = randomBytes(16)
    const transactionKey = encryptTransactionKey(tek, store.getBankKey('E002')!.publicKeyPem)
    const signature = signA006Digest(signer.a006.privateKeyPem, hash)
    const signatureData = aesEncryptDeflate(Buffer.from(userSignature(signer, signature), 'utf8'), tek)
    const details = `<AdminOrderType>${orderType}</AdminOrderType>${orderParams(orderType, orderId)}`
    return bodyCode(await post(request(signer, details, dataTransfer(transactionKey, signatureData), 0)))
  }

  const hacActions = (submitter: Subscriber, orderId: string) =>
    store
      .listProtocol(submitter.id)
      .filter((entry) => entry.orderId === orderId)
      .map((entry) => entry.action)
      .reverse()

  const folder = async (s: Subscriber, orderType: 'HVU' | 'HVZ') => {
    const { code, data } = await download(s, orderType)
    return { code, details: code === '000000' ? selectNodes(parseXml(data.toString('utf8')), "//*[local-name()='OrderDetails']") : [] }
  }
  const detailsOf = (nodes: Node[], orderId: string) => nodes.find((node) => textOf(node, 'OrderID') === orderId)!
  const signingInfo = (node: Node) => byLocalName(node, 'SigningInfo') as unknown as Element

  let submitter: Subscriber
  let single: Subscriber
  let first: Subscriber
  let second: Subscriber

  beforeAll(async () => {
    store = new Store(':memory:')
    ensureBankKeys(store)
    app = await createApp(store)
    submitter = subscriber('TRANSPORT', 'T')
    single = subscriber('EINZEL', 'E')
    first = subscriber('ERSTE', 'A')
    second = subscriber('ZWEITE', 'B')
  })

  afterAll(async () => {
    await app.close()
    store.close()
  })

  it('lists the orders of the own customer with their hash value in HVZ and without it in HVU', async () => {
    const orderId = await submit(submitter)

    const hvz = detailsOf((await folder(single, 'HVZ')).details, orderId)
    expect(textOf(hvz, 'DataDigest')).toBe(digest.toString('base64'))
    expect(textOf(hvz, 'TotalAmount')).toBe('123.45')
    expect(textOf(hvz, 'TotalOrders')).toBe('1')
    expect(textOf(byLocalName(hvz, 'OriginatorInfo')!, 'UserID')).toBe('TRANSPORT')
    expect(signingInfo(hvz).getAttribute('readyToBeSigned')).toBe('true')
    expect(signingInfo(hvz).getAttribute('NumSigRequired')).toBe('1')
    expect(signingInfo(hvz).getAttribute('NumSigDone')).toBe('0')

    const hvu = detailsOf((await folder(single, 'HVU')).details, orderId)
    expect(byLocalName(hvu, 'DataDigest')).toBeUndefined()
    expect(textOf(hvu, 'OrderDataSize')).toBe(String(Buffer.byteLength(pain)))

    const stranger = subscriber('FREMD', 'E', 'ANDERER')
    expect((await folder(stranger, 'HVZ')).code).toBe('090005')
    expect((await download(stranger, 'HVD', orderParams('HVD', orderId))).code).toBe('091114')
  })

  it('hands out the hash value with the accompanying note (HVD) and the order file itself (HVT)', async () => {
    const orderId = await submit(submitter)

    const hvd = parseXml((await download(single, 'HVD', orderParams('HVD', orderId))).data.toString('utf8'))
    expect(textOf(hvd, 'DataDigest')).toBe(digest.toString('base64'))
    expect(Buffer.from(textOf(hvd, 'DisplayFile'), 'base64').toString('utf8')).toContain(`Auftragsnummer: ${orderId}`)
    expect(textOf(hvd, 'OrderDataAvailable')).toBe('true')

    const file = await download(single, 'HVT', orderParams('HVT', orderId, '<OrderFlags completeOrderData="true" fetchLimit="0" fetchOffset="0"/>'))
    expect(file.data.toString('utf8')).toBe(pain)
    const details = await download(single, 'HVT', orderParams('HVT', orderId, '<OrderFlags completeOrderData="false" fetchLimit="100" fetchOffset="0"/>'))
    expect(details.code).toBe('090006')
    expect((await download(single, 'HVD', orderParams('HVD', 'XXXX'))).code).toBe('091114')
  })

  it('executes an order once a single signature (E) over its hash value arrives via HVE', async () => {
    const orderId = await submit(submitter)

    expect(await sign(single, 'HVE', orderId)).toBe('000000')
    expect(store.getVeuByOrderId(orderId)).toMatchObject({ status: 'SIGNED', signaturesDone: 1 })
    expect(store.getOrderByOrderId(orderId)!.status).toBe('BOOKED')
    expect(hacActions(submitter, orderId)).toEqual([
      'FILE_UPLOAD',
      'ES_VERIFICATION',
      'VEU_FORWARDING',
      'VEU_VERIFICATION',
      'VEU_VERIFICATION_END',
      'ORDER_HAC_FINAL_POS',
    ])
    expect(await sign(first, 'HVE', orderId)).toBe('091115')
  })

  it('waits for a second signature after a first one (A), refuses the same signer twice and runs with A + B', async () => {
    const orderId = await submit(submitter)

    expect(await sign(first, 'HVE', orderId)).toBe('000000')
    expect(store.getVeuByOrderId(orderId)).toMatchObject({ status: 'OPEN', signaturesDone: 1, signaturesRequired: 2 })
    expect(store.getOrderByOrderId(orderId)!.status).toBe('PENDING_VEU')
    const seenByFirst = detailsOf((await folder(first, 'HVZ')).details, orderId)
    expect(signingInfo(seenByFirst).getAttribute('readyToBeSigned')).toBe('false')
    expect(byLocalName(byLocalName(seenByFirst, 'SignerInfo')!, 'Permission')).toBeDefined()
    expect(await sign(first, 'HVE', orderId)).toBe('091306')

    expect(await sign(second, 'HVE', orderId)).toBe('000000')
    expect(store.getVeuByOrderId(orderId)).toMatchObject({ status: 'SIGNED', signaturesDone: 2 })
    expect(hacActions(submitter, orderId).slice(-2)).toEqual(['VEU_VERIFICATION_END', 'ORDER_HAC_FINAL_POS'])
  })

  it('refuses a signature over anything but the order’s hash value', async () => {
    const orderId = await submit(submitter)

    expect(await sign(single, 'HVE', orderId, orderHash(Buffer.from('another file')))).toBe('091301')
    expect(await sign(single, 'HVS', orderId, orderHash(Buffer.from('another file')))).toBe('091301')
    expect(store.getVeuByOrderId(orderId)).toMatchObject({ status: 'OPEN', signaturesDone: 0 })
  })

  it('cancels an order with a signed HVS and closes its protocol negatively', async () => {
    const orderId = await submit(submitter)

    expect(await sign(first, 'HVS', orderId)).toBe('000000')
    expect(store.getVeuByOrderId(orderId)!.status).toBe('CANCELLED')
    expect(store.getOrderByOrderId(orderId)!.status).toBe('REJECTED')
    expect(hacActions(submitter, orderId).slice(-2)).toEqual(['VEU_CANCEL_ORDER', 'ORDER_HAC_FINAL_NEG'])
    expect(await sign(single, 'HVE', orderId)).toBe('091115')
  })
})
