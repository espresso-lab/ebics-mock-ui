import {
  constants,
  createCipheriv,
  createDecipheriv,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  randomBytes,
  sign as signRaw,
  verify as verifyRaw,
  createHash,
  type KeyObject,
} from 'node:crypto'
import { deflateSync, inflateSync } from 'node:zlib'
import forge from 'node-forge'

const ZERO_IV = Buffer.alloc(16, 0)

export interface RsaKeyPair {
  publicKeyPem: string
  privateKeyPem: string
}

export function generateRsaKeyPair(modulusLength = 2048): RsaKeyPair {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  })
  return { publicKeyPem: publicKey, privateKeyPem: privateKey }
}

export function publicKeyFromPem(pem: string): KeyObject {
  return createPublicKey(pem)
}

export function privateKeyFromPem(pem: string): KeyObject {
  return createPrivateKey(pem)
}

function stripLeadingZeroHex(hex: string): string {
  const trimmed = hex.replace(/^0+/, '')
  return trimmed.length === 0 ? '0' : trimmed
}

export function publicKeyModulusExponent(key: KeyObject): { modulus: Buffer; exponent: Buffer } {
  const jwk = key.export({ format: 'jwk' })
  if (!jwk.n || !jwk.e) throw new Error('not an RSA public key')
  return {
    modulus: Buffer.from(jwk.n, 'base64url'),
    exponent: Buffer.from(jwk.e, 'base64url'),
  }
}

export function ebicsPublicKeyDigest(pem: string): Buffer {
  const { modulus, exponent } = publicKeyModulusExponent(publicKeyFromPem(pem))
  const e = stripLeadingZeroHex(exponent.toString('hex'))
  const m = stripLeadingZeroHex(modulus.toString('hex'))
  return createHash('sha256').update(`${e} ${m}`, 'ascii').digest()
}

function removeOsSpecificChars(data: Buffer): Buffer {
  return Buffer.from(data.filter((b) => b !== 0x0d && b !== 0x0a && b !== 0x1a))
}

export function signA006(privateKeyPem: string, data: Buffer): Buffer {
  const digest = createHash('sha256').update(removeOsSpecificChars(data)).digest()
  return signRaw('sha256', digest, {
    key: privateKeyFromPem(privateKeyPem),
    padding: constants.RSA_PKCS1_PSS_PADDING,
    saltLength: 32,
  })
}

export function verifyA006(publicKeyPem: string, data: Buffer, signature: Buffer): boolean {
  const digest = createHash('sha256').update(removeOsSpecificChars(data)).digest()
  return verifyRaw(
    'sha256',
    digest,
    {
      key: publicKeyFromPem(publicKeyPem),
      padding: constants.RSA_PKCS1_PSS_PADDING,
      saltLength: 32,
    },
    signature,
  )
}

export interface EncryptedOrderData {
  orderData: Buffer
  transactionKey: Buffer
  pubKeyDigest: Buffer
}

function rsaEncryptPkcs1(data: Buffer, publicKeyPem: string): Buffer {
  const key = forge.pki.publicKeyFromPem(publicKeyPem)
  const encrypted = key.encrypt(data.toString('binary'), 'RSAES-PKCS1-V1_5')
  return Buffer.from(encrypted, 'binary')
}

function rsaDecryptPkcs1(data: Buffer, privateKeyPem: string): Buffer {
  const key = forge.pki.privateKeyFromPem(privateKeyPem)
  const decrypted = key.decrypt(data.toString('binary'), 'RSAES-PKCS1-V1_5')
  return Buffer.from(decrypted, 'binary')
}

export function aesEncryptDeflate(plaintext: Buffer, transactionKey: Buffer): Buffer {
  const compressed = deflateSync(plaintext)
  const cipher = createCipheriv('aes-128-cbc', transactionKey, ZERO_IV)
  return Buffer.concat([cipher.update(compressed), cipher.final()])
}

export function encryptTransactionKey(transactionKey: Buffer, recipientPublicKeyPem: string): Buffer {
  return rsaEncryptPkcs1(transactionKey, recipientPublicKeyPem)
}

export function encryptOrderData(plaintext: Buffer, recipientPublicKeyPem: string): EncryptedOrderData {
  const tek = randomBytes(16)
  return {
    orderData: aesEncryptDeflate(plaintext, tek),
    transactionKey: encryptTransactionKey(tek, recipientPublicKeyPem),
    pubKeyDigest: ebicsPublicKeyDigest(recipientPublicKeyPem),
  }
}

export function decryptTransactionKey(encryptedTransactionKey: Buffer, recipientPrivateKeyPem: string): Buffer {
  return rsaDecryptPkcs1(encryptedTransactionKey, recipientPrivateKeyPem)
}

export function aesDecryptInflate(orderData: Buffer, transactionKey: Buffer): Buffer {
  const decipher = createDecipheriv('aes-128-cbc', transactionKey, ZERO_IV)
  decipher.setAutoPadding(false)
  const padded = Buffer.concat([decipher.update(orderData), decipher.final()])
  const padLength = padded[padded.length - 1] ?? 0
  const compressed = padLength > 0 && padLength <= 16 ? padded.subarray(0, padded.length - padLength) : padded
  return inflateSync(compressed)
}

export function decryptOrderData(
  orderData: Buffer,
  transactionKey: Buffer,
  recipientPrivateKeyPem: string,
): Buffer {
  return aesDecryptInflate(orderData, decryptTransactionKey(transactionKey, recipientPrivateKeyPem))
}

export function sha256(data: Buffer): Buffer {
  return createHash('sha256').update(data).digest()
}

export interface ModExpBase64 {
  modulus: string
  exponent: string
}

export function modExpBase64(publicKeyPem: string): ModExpBase64 {
  const { modulus, exponent } = publicKeyModulusExponent(publicKeyFromPem(publicKeyPem))
  return { modulus: modulus.toString('base64'), exponent: exponent.toString('base64') }
}

export function publicKeyPemFromModExp(modulusBase64: string, exponentBase64: string): string {
  const n = new forge.jsbn.BigInteger(Buffer.from(modulusBase64, 'base64').toString('hex') || '0', 16)
  const e = new forge.jsbn.BigInteger(Buffer.from(exponentBase64, 'base64').toString('hex') || '0', 16)
  return forge.pki.publicKeyToPem(forge.pki.setRsaPublicKey(n, e))
}

export function selfSignedCertificateB64(publicKeyPem: string, privateKeyPem: string): string {
  const cert = forge.pki.createCertificate()
  cert.publicKey = forge.pki.publicKeyFromPem(publicKeyPem)
  cert.serialNumber = '01'
  cert.validity.notBefore = new Date('2020-01-01T00:00:00Z')
  cert.validity.notAfter = new Date('2040-01-01T00:00:00Z')
  const attrs = [{ name: 'commonName', value: 'EBICS Mock Bank' }]
  cert.setSubject(attrs)
  cert.setIssuer(attrs)
  cert.sign(forge.pki.privateKeyFromPem(privateKeyPem), forge.md.sha256.create())
  return forge.util.encode64(forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes())
}

export function publicKeyPemFromX509(certBase64: string): string {
  const der = forge.util.decode64(certBase64.replace(/\s+/g, ''))
  const cert = forge.pki.certificateFromAsn1(forge.asn1.fromDer(der))
  return forge.pki.publicKeyToPem(cert.publicKey)
}
