import { createHash, createSign, createVerify } from 'node:crypto'
import { C14nCanonicalization } from 'xml-crypto'
import { ALGO } from './namespaces.js'
import { parseXml, selectFirst, selectNodes, serialize } from './xml.js'

const XPOINTER = "#xpointer(//*[@authenticate='true'])"

export const AUTH_SIGNATURE_SKELETON = `<AuthSignature><ds:SignedInfo><ds:CanonicalizationMethod Algorithm="${ALGO.C14N}"></ds:CanonicalizationMethod><ds:SignatureMethod Algorithm="${ALGO.RSA_SHA256}"></ds:SignatureMethod><ds:Reference URI="${XPOINTER}"><ds:Transforms><ds:Transform Algorithm="${ALGO.C14N}"></ds:Transform></ds:Transforms><ds:DigestMethod Algorithm="${ALGO.SHA256}"></ds:DigestMethod><ds:DigestValue></ds:DigestValue></ds:Reference></ds:SignedInfo><ds:SignatureValue></ds:SignatureValue></AuthSignature>`

function canonicalize(node: Node): string {
  const canonicalizer = new C14nCanonicalization()
  return canonicalizer.process(node as never, {}) as string
}

function setText(node: Node, value: string): void {
  while (node.firstChild) node.removeChild(node.firstChild)
  node.appendChild(node.ownerDocument!.createTextNode(value))
}

function digestAuthenticatedNodes(doc: unknown): string {
  const nodes = selectNodes(doc, "//*[@authenticate='true']")
  const canon = nodes.map((node) => canonicalize(node)).join('')
  return createHash('sha256').update(canon, 'utf8').digest('base64')
}

export function signDocument(xml: string, privateKeyPem: string): string {
  const doc = parseXml(xml)

  const digestValue = selectFirst(doc, "//*[local-name()='DigestValue']")
  const signedInfo = selectFirst(doc, "//*[local-name()='SignedInfo']")
  const signatureValue = selectFirst(doc, "//*[local-name()='SignatureValue']")
  if (!digestValue || !signedInfo || !signatureValue) {
    throw new Error('AuthSignature skeleton missing — embed AUTH_SIGNATURE_SKELETON before signing')
  }

  setText(digestValue, digestAuthenticatedNodes(doc))

  const signedInfoCanon = canonicalize(signedInfo)
  const signature = createSign('RSA-SHA256').update(signedInfoCanon, 'utf8').sign(privateKeyPem)
  setText(signatureValue, signature.toString('base64'))

  return serialize(doc)
}

export function verifyDocument(xml: string, publicKeyPem: string): boolean {
  const doc = parseXml(xml)
  const digestValue = selectFirst(doc, "//*[local-name()='DigestValue']")
  const signedInfo = selectFirst(doc, "//*[local-name()='SignedInfo']")
  const signatureValue = selectFirst(doc, "//*[local-name()='SignatureValue']")
  if (!digestValue || !signedInfo || !signatureValue) return false

  const expectedDigest = digestAuthenticatedNodes(doc)
  if (digestValue.textContent?.trim() !== expectedDigest) return false

  const signedInfoCanon = canonicalize(signedInfo)
  const signature = Buffer.from(signatureValue.textContent?.trim() ?? '', 'base64')
  return createVerify('RSA-SHA256').update(signedInfoCanon, 'utf8').verify(publicKeyPem, signature)
}
