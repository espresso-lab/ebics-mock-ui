import { describe, expect, it } from 'vitest'
import { generateRsaKeyPair } from './crypto.js'
import { AUTH_SIGNATURE_SKELETON, signDocument, verifyDocument } from './signature.js'

const doc = (phase: string) =>
  `<ebicsResponse xmlns="urn:org:ebics:H005" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Version="H005" Revision="1">` +
  `<header authenticate="true"><static HostID="MOCKBANK"></static>` +
  `<mutable><TransactionPhase>${phase}</TransactionPhase></mutable></header>` +
  AUTH_SIGNATURE_SKELETON +
  `<body><ReturnCode>000000</ReturnCode></body></ebicsResponse>`

describe('AuthSignature', () => {
  it('signs and verifies a response with the bank X002 key', () => {
    const bank = generateRsaKeyPair()
    const signed = signDocument(doc('Initialisation'), bank.privateKeyPem)
    expect(signed).toContain('<ds:DigestValue>')
    expect(verifyDocument(signed, bank.publicKeyPem)).toBe(true)
  })

  it('fails verification when the authenticated header is tampered with', () => {
    const bank = generateRsaKeyPair()
    const signed = signDocument(doc('Initialisation'), bank.privateKeyPem)
    const tampered = signed.replace('MOCKBANK', 'ATTACKER')
    expect(verifyDocument(tampered, bank.publicKeyPem)).toBe(false)
  })

  it('fails verification with a foreign public key', () => {
    const bank = generateRsaKeyPair()
    const attacker = generateRsaKeyPair()
    const signed = signDocument(doc('Initialisation'), bank.privateKeyPem)
    expect(verifyDocument(signed, attacker.publicKeyPem)).toBe(false)
  })

  it('emits the EBICS xpointer reference URI', () => {
    const bank = generateRsaKeyPair()
    const signed = signDocument(doc('Transfer'), bank.privateKeyPem)
    expect(signed).toContain("URI=\"#xpointer(//*[@authenticate='true'])\"")
  })
})
