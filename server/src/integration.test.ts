import { randomBytes } from 'node:crypto'
import { deflateSync } from 'node:zlib'
import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from './app.js'
import { config } from './config.js'
import { Store } from './db/store.js'
import { ensureBankKeys } from './ebics/bank.js'
import {
  aesEncryptDeflate,
  decryptOrderData,
  encryptTransactionKey,
  generateRsaKeyPair,
  publicKeyPemFromX509,
  selfSignedCertificateB64,
  signA006,
} from './ebics/crypto.js'
import { verifyDocument } from './ebics/signature.js'
import { byLocalName, parseXml, textOf } from './ebics/xml.js'
import { seedDemoData } from './seed.js'

const HOST = 'MOCKBANK'
const PARTNER = 'MV126086'
const USER = 'VIETSJAN'

const client = {
  a006: generateRsaKeyPair(),
  x002: generateRsaKeyPair(),
  e002: generateRsaKeyPair(),
}

function x509Data(pair: { publicKeyPem: string; privateKeyPem: string }): string {
  const cert = selfSignedCertificateB64(pair.publicKeyPem, pair.privateKeyPem)
  return `<ds:X509Data><ds:X509Certificate>${cert}</ds:X509Certificate></ds:X509Data>`
}

function compress(xml: string): string {
  return deflateSync(Buffer.from(xml, 'utf8')).toString('base64')
}

function unsecured(orderType: 'INI' | 'HIA', orderData: string): string {
  return (
    `<ebicsUnsecuredRequest xmlns="urn:org:ebics:H005" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Version="H005" Revision="1">` +
    `<header authenticate="true"><static><HostID>${HOST}</HostID><PartnerID>${PARTNER}</PartnerID><UserID>${USER}</UserID>` +
    `<OrderDetails><OrderType>${orderType}</OrderType><SecurityMedium>0000</SecurityMedium></OrderDetails></static><mutable/></header>` +
    `<body><DataTransfer><OrderData>${compress(orderData)}</OrderData></DataTransfer></body></ebicsUnsecuredRequest>`
  )
}

function iniRequest(): string {
  const orderData =
    `<SignaturePubKeyOrderData xmlns="urn:org:ebics:H005" xmlns:ds="http://www.w3.org/2000/09/xmldsig#">` +
    `<SignaturePubKeyInfo>${x509Data(client.a006)}<SignatureVersion>A006</SignatureVersion></SignaturePubKeyInfo>` +
    `</SignaturePubKeyOrderData>`
  return unsecured('INI', orderData)
}

function hiaRequest(): string {
  const orderData =
    `<HIARequestOrderData xmlns="urn:org:ebics:H005" xmlns:ds="http://www.w3.org/2000/09/xmldsig#">` +
    `<AuthenticationPubKeyInfo>${x509Data(client.x002)}<AuthenticationVersion>X002</AuthenticationVersion></AuthenticationPubKeyInfo>` +
    `<EncryptionPubKeyInfo>${x509Data(client.e002)}<EncryptionVersion>E002</EncryptionVersion></EncryptionPubKeyInfo>` +
    `</HIARequestOrderData>`
  return unsecured('HIA', orderData)
}

function hpbRequest(): string {
  return (
    `<ebicsNoPubKeyDigestsRequest xmlns="urn:org:ebics:H005" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Version="H005" Revision="1">` +
    `<header authenticate="true"><static><HostID>${HOST}</HostID><PartnerID>${PARTNER}</PartnerID><UserID>${USER}</UserID>` +
    `<OrderDetails><OrderType>HPB</OrderType><SecurityMedium>0000</SecurityMedium></OrderDetails></static><mutable/></header><body/></ebicsNoPubKeyDigestsRequest>`
  )
}

function downloadInit(adminOrderType: string, orderParams = ''): string {
  return (
    `<ebicsRequest xmlns="urn:org:ebics:H005" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Version="H005" Revision="1">` +
    `<header authenticate="true"><static><HostID>${HOST}</HostID><PartnerID>${PARTNER}</PartnerID><UserID>${USER}</UserID>` +
    `<OrderDetails><AdminOrderType>${adminOrderType}</AdminOrderType>${orderParams}</OrderDetails><SecurityMedium>0000</SecurityMedium></static>` +
    `<mutable><TransactionPhase>Initialisation</TransactionPhase></mutable></header><body/></ebicsRequest>`
  )
}

function receipt(transactionId: string): string {
  return (
    `<ebicsRequest xmlns="urn:org:ebics:H005" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Version="H005" Revision="1">` +
    `<header authenticate="true"><static><HostID>${HOST}</HostID><TransactionID>${transactionId}</TransactionID></static>` +
    `<mutable><TransactionPhase>Receipt</TransactionPhase><ReceiptCode>0</ReceiptCode></mutable></header><body/></ebicsRequest>`
  )
}

const btdCamtParams =
  `<BTDOrderParams><Service><ServiceName>EOP</ServiceName><Scope>DE</Scope><Container containerType="ZIP"/><MsgName>camt.053</MsgName></Service></BTDOrderParams>`

function btuInit(transactionKeyB64: string, signatureDataB64: string): string {
  return (
    `<ebicsRequest xmlns="urn:org:ebics:H005" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Version="H005" Revision="1">` +
    `<header authenticate="true"><static><HostID>${HOST}</HostID><PartnerID>${PARTNER}</PartnerID><UserID>${USER}</UserID>` +
    `<OrderDetails><AdminOrderType>BTU</AdminOrderType><BTUOrderParams><Service><ServiceName>SCT</ServiceName><Scope>DE</Scope><MsgName>pain.001</MsgName></Service></BTUOrderParams></OrderDetails>` +
    `<NumSegments>1</NumSegments><SecurityMedium>0000</SecurityMedium></static>` +
    `<mutable><TransactionPhase>Initialisation</TransactionPhase></mutable></header>` +
    `<body><DataTransfer><DataEncryptionInfo authenticate="true"><EncryptionPubKeyDigest Version="E002" Algorithm="http://www.w3.org/2001/04/xmlenc#sha256">x</EncryptionPubKeyDigest>` +
    `<TransactionKey>${transactionKeyB64}</TransactionKey></DataEncryptionInfo><SignatureData>${signatureDataB64}</SignatureData></DataTransfer></body></ebicsRequest>`
  )
}

function userSignatureData(signature: Buffer): string {
  return (
    `<UserSignatureData xmlns="http://www.ebics.org/S002"><OrderSignatureData>` +
    `<SignatureVersion>A006</SignatureVersion><SignatureValue>${signature.toString('base64')}</SignatureValue>` +
    `<PartnerID>${PARTNER}</PartnerID><UserID>${USER}</UserID></OrderSignatureData></UserSignatureData>`
  )
}

function btuTransfer(transactionId: string, orderDataB64: string): string {
  return (
    `<ebicsRequest xmlns="urn:org:ebics:H005" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Version="H005" Revision="1">` +
    `<header authenticate="true"><static><HostID>${HOST}</HostID><TransactionID>${transactionId}</TransactionID></static>` +
    `<mutable><TransactionPhase>Transfer</TransactionPhase><SegmentNumber lastSegment="true">1</SegmentNumber></mutable></header>` +
    `<body><DataTransfer><OrderData>${orderDataB64}</OrderData></DataTransfer></body></ebicsRequest>`
  )
}

const painDocument =
  `<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03"><CstmrCdtTrfInitn>` +
  `<GrpHdr><MsgId>MSG-1</MsgId></GrpHdr><PmtInf><CdtTrfTxInf><PmtId><EndToEndId>E2E-1</EndToEndId></PmtId>` +
  `<Amt><InstdAmt Ccy="EUR">123.45</InstdAmt></Amt><Cdtr><Nm>ACME GmbH</Nm></Cdtr>` +
  `<CdtrAcct><Id><IBAN>DE89370400440532013000</IBAN></Id></CdtrAcct><RmtInf><Ustrd>Rechnung 2026-1</Ustrd></RmtInf>` +
  `</CdtTrfTxInf></PmtInf></CstmrCdtTrfInitn></Document>`

describe('EBICS handshake + flows (in-process)', () => {
  let app: FastifyInstance
  let store: Store
  let bankX002Pem = ''

  const post = async (xml: string) => {
    const res = await app.inject({ method: 'POST', url: config.ebicsPath, headers: { 'content-type': 'text/xml' }, payload: xml })
    return res.body
  }
  const decode = (responseXml: string) => {
    const doc = parseXml(responseXml)
    const orderData = Buffer.from(textOf(doc, 'OrderData').replace(/\s+/g, ''), 'base64')
    const txKey = Buffer.from(textOf(byLocalName(doc, 'DataEncryptionInfo')!, 'TransactionKey').replace(/\s+/g, ''), 'base64')
    return decryptOrderData(orderData, txKey, client.e002.privateKeyPem)
  }

  beforeAll(async () => {
    store = new Store(':memory:')
    ensureBankKeys(store)
    seedDemoData(store)
    app = await createApp(store)
  })

  afterAll(async () => {
    await app.close()
    store.close()
  })

  it('completes INI and HIA', async () => {
    expect(textOf(parseXml(await post(iniRequest())), 'ReturnCode')).toBe('000000')
    expect(textOf(parseXml(await post(hiaRequest())), 'ReturnCode')).toBe('000000')
    const participant = store.listParticipants()[0]!
    expect(participant.iniState).toBe('DONE')
    expect(participant.hiaState).toBe('DONE')
  })

  it('delivers bank keys via HPB that the client can decrypt', async () => {
    const decrypted = decode(await post(hpbRequest())).toString('utf8')
    const orderDoc = parseXml(decrypted)
    const authInfo = byLocalName(orderDoc, 'AuthenticationPubKeyInfo')!
    bankX002Pem = publicKeyPemFromX509(textOf(authInfo, 'X509Certificate'))
    expect(bankX002Pem).toContain('BEGIN PUBLIC KEY')
    expect(store.listParticipants()[0]!.hpbState).toBe('DELIVERED')
  })

  it('signs the HTD response with the bank X002 key the client trusts', async () => {
    const response = await post(downloadInit('HTD'))
    expect(verifyDocument(response, bankX002Pem)).toBe(true)
    const htd = decode(response).toString('utf8')
    expect(htd).toContain('HTDResponseOrderData')
    expect(htd).toContain('DE53201304000060279767')
    const transactionId = textOf(parseXml(response), 'TransactionID')
    expect(textOf(parseXml(await post(receipt(transactionId))), 'ReturnCode')).toBe('011000')
  })

  it('downloads a generated camt.053 statement and marks it fetched on receipt', async () => {
    const account = store.listAccounts()[0]!
    store.createStatement({
      accountId: account.id,
      iban: account.iban,
      fromDate: '2026-06-01',
      toDate: '2026-06-30',
      fileName: 'camt053.xml',
      content: '<Document>camt-statement-MARKER</Document>',
    })
    const response = await post(downloadInit('BTD', btdCamtParams))
    expect(verifyDocument(response, bankX002Pem)).toBe(true)
    const container = decode(response).toString('binary')
    expect(container).toContain('camt-statement-MARKER')
    const transactionId = textOf(parseXml(response), 'TransactionID')
    await post(receipt(transactionId))
    expect(store.listAvailableStatements()).toHaveLength(0)
  })

  it('returns no-data with a technically-OK header so the client treats it as an empty download', async () => {
    store.markStatementsFetched(store.listStatements().map((s) => s.id))
    const response = await post(downloadInit('BTD', btdCamtParams))
    const doc = parseXml(response)
    expect(verifyDocument(response, bankX002Pem)).toBe(true)
    expect(textOf(byLocalName(doc, 'mutable')!, 'ReturnCode')).toBe('000000')
    expect(textOf(byLocalName(doc, 'body')!, 'ReturnCode')).toBe('090005')
  })

  it('re-delivers already-fetched statements when a DateRange is sent (GRENKE-style dated read)', async () => {
    const account = store.listAccounts()[0]!
    store.createStatement({
      accountId: account.id,
      iban: account.iban,
      fromDate: '2026-06-01',
      toDate: '2026-06-30',
      fileName: 'camt053-dated.xml',
      content: '<Document>dated-statement-MARKER</Document>',
    })
    store.markStatementsFetched(store.listStatements().map((s) => s.id))

    expect(textOf(byLocalName(parseXml(await post(downloadInit('BTD', btdCamtParams))), 'body')!, 'ReturnCode')).toBe('090005')

    const datedParams =
      `<BTDOrderParams><Service><ServiceName>EOP</ServiceName><Scope>DE</Scope><Container containerType="ZIP"/><MsgName>camt.053</MsgName></Service>` +
      `<DateRange><Start>2026-06-01</Start><End>2026-06-30</End></DateRange></BTDOrderParams>`

    const response = await post(downloadInit('BTD', datedParams))
    expect(decode(response).toString('binary')).toContain('dated-statement-MARKER')
    await post(receipt(textOf(parseXml(response), 'TransactionID')))

    const again = await post(downloadInit('BTD', datedParams))
    expect(decode(again).toString('binary')).toContain('dated-statement-MARKER')
  })

  it('accepts a BTU upload, verifies the A006 signature and parses the pain.001', async () => {
    const tek = randomBytes(16)
    const orderData = aesEncryptDeflate(Buffer.from(painDocument, 'utf8'), tek)
    const transactionKey = encryptTransactionKey(tek, bankE002Pem(store))
    const signature = signA006(client.a006.privateKeyPem, Buffer.from(painDocument, 'utf8'))
    const signatureData = aesEncryptDeflate(Buffer.from(userSignatureData(signature), 'utf8'), tek)

    const initResponse = await post(btuInit(transactionKey.toString('base64'), signatureData.toString('base64')))
    expect(verifyDocument(initResponse, bankX002Pem)).toBe(true)
    const transactionId = textOf(parseXml(initResponse), 'TransactionID')
    const orderId = textOf(parseXml(initResponse), 'OrderID')
    expect(orderId).not.toBe('')

    const transferResponse = await post(btuTransfer(transactionId, orderData.toString('base64')))
    expect(textOf(parseXml(transferResponse), 'ReturnCode')).toBe('000000')

    const order = store.listOrders().find((o) => o.orderId === orderId)!
    expect(order.kind).toBe('CCT')
    expect(order.totalAmount).toBe('123.45')
    expect(order.signatureValid).toBe(true)
    const stored = store.getOrder(order.id)!
    expect(stored.items?.[0]?.name).toBe('ACME GmbH')
  })

  it('flags a BTU upload whose A006 signature is from a foreign key', async () => {
    const tek = randomBytes(16)
    const orderData = aesEncryptDeflate(Buffer.from(painDocument, 'utf8'), tek)
    const transactionKey = encryptTransactionKey(tek, bankE002Pem(store))
    const foreign = generateRsaKeyPair()
    const signature = signA006(foreign.privateKeyPem, Buffer.from(painDocument, 'utf8'))
    const signatureData = aesEncryptDeflate(Buffer.from(userSignatureData(signature), 'utf8'), tek)

    const initResponse = await post(btuInit(transactionKey.toString('base64'), signatureData.toString('base64')))
    const transactionId = textOf(parseXml(initResponse), 'TransactionID')
    const orderId = textOf(parseXml(initResponse), 'OrderID')
    await post(btuTransfer(transactionId, orderData.toString('base64')))

    const order = store.listOrders().find((o) => o.orderId === orderId)!
    expect(order.signatureValid).toBe(false)
  })
})

function bankE002Pem(store: Store): string {
  return store.getBankKey('E002')!.publicKeyPem
}
