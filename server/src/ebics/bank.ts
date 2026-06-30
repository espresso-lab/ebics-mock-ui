import type { Store } from '../db/store.js'
import { ebicsPublicKeyDigest, generateRsaKeyPair } from './crypto.js'

export function ensureBankKeys(store: Store): void {
  for (const type of ['X002', 'E002'] as const) {
    if (store.getBankKey(type)) continue
    const { publicKeyPem, privateKeyPem } = generateRsaKeyPair()
    store.upsertBankKey(type, publicKeyPem, privateKeyPem, ebicsPublicKeyDigest(publicKeyPem).toString('hex'))
  }
}

export function requireBankKey(store: Store, type: 'X002' | 'E002') {
  const key = store.getBankKey(type)
  if (!key) throw new Error(`bank key ${type} not initialised`)
  return key
}
