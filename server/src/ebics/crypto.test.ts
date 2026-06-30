import { describe, expect, it } from 'vitest'
import {
  decryptOrderData,
  ebicsPublicKeyDigest,
  encryptOrderData,
  generateRsaKeyPair,
  signA006,
  verifyA006,
} from './crypto.js'

describe('crypto', () => {
  it('round-trips order data through compress + encrypt + decrypt', () => {
    const recipient = generateRsaKeyPair()
    const plaintext = Buffer.from('<Document>große Überweisung — äöü</Document>'.repeat(50), 'utf8')

    const { orderData, transactionKey } = encryptOrderData(plaintext, recipient.publicKeyPem)
    const decrypted = decryptOrderData(orderData, transactionKey, recipient.privateKeyPem)

    expect(decrypted.equals(plaintext)).toBe(true)
  })

  it('encrypts to a different ciphertext each time (random transaction key)', () => {
    const recipient = generateRsaKeyPair()
    const plaintext = Buffer.from('camt.053', 'utf8')
    const a = encryptOrderData(plaintext, recipient.publicKeyPem)
    const b = encryptOrderData(plaintext, recipient.publicKeyPem)
    expect(a.orderData.equals(b.orderData)).toBe(false)
    expect(decryptOrderData(a.orderData, a.transactionKey, recipient.privateKeyPem).toString()).toBe('camt.053')
    expect(decryptOrderData(b.orderData, b.transactionKey, recipient.privateKeyPem).toString()).toBe('camt.053')
  })

  it('signs and verifies an A006 signature (PSS double-hash)', () => {
    const signer = generateRsaKeyPair()
    const data = Buffer.from('pain.001 order data', 'utf8')
    const signature = signA006(signer.privateKeyPem, data)
    expect(verifyA006(signer.publicKeyPem, data, signature)).toBe(true)
  })

  it('rejects an A006 signature over tampered data', () => {
    const signer = generateRsaKeyPair()
    const signature = signA006(signer.privateKeyPem, Buffer.from('original', 'utf8'))
    expect(verifyA006(signer.publicKeyPem, Buffer.from('tampered', 'utf8'), signature)).toBe(false)
  })

  it('rejects an A006 signature from a foreign key', () => {
    const signer = generateRsaKeyPair()
    const attacker = generateRsaKeyPair()
    const data = Buffer.from('data', 'utf8')
    const signature = signA006(attacker.privateKeyPem, data)
    expect(verifyA006(signer.publicKeyPem, data, signature)).toBe(false)
  })

  it('produces a stable 32-byte EBICS public key digest', () => {
    const key = generateRsaKeyPair()
    const a = ebicsPublicKeyDigest(key.publicKeyPem)
    const b = ebicsPublicKeyDigest(key.publicKeyPem)
    expect(a.length).toBe(32)
    expect(a.equals(b)).toBe(true)
  })
})
