import { aesDecryptInflate, verifyA006 } from './crypto.js'
import { byLocalName, parseXml, textOf } from './xml.js'

/**
 * Verifies the bank-technical electronic signature (ES, A006) over the uploaded order data.
 * Returns true/false when an A006 signature is present and checkable, or null when the
 * signature is absent or cannot be evaluated (then the order is stored as "not verified").
 */
export function verifyOrderSignature(
  encryptedSignatureData: Buffer,
  transactionKey: Buffer,
  orderData: Buffer,
  signerA006Pem: string,
): boolean | null {
  let xml: string
  try {
    xml = aesDecryptInflate(encryptedSignatureData, transactionKey).toString('utf8')
  } catch {
    return null
  }

  const orderSignature = byLocalName(parseXml(xml), 'OrderSignatureData')
  if (!orderSignature) return null
  if (textOf(orderSignature, 'SignatureVersion') !== 'A006') return null
  const value = textOf(orderSignature, 'SignatureValue').replace(/\s+/g, '')
  if (!value) return null

  try {
    return verifyA006(signerA006Pem, orderData, Buffer.from(value, 'base64'))
  } catch {
    return null
  }
}
