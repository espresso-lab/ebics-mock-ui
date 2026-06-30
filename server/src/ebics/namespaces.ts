export const NS = {
  H005: 'urn:org:ebics:H005',
  H000: 'http://www.ebics.org/H000',
  DS: 'http://www.w3.org/2000/09/xmldsig#',
  XSI: 'http://www.w3.org/2001/XMLSchema-instance',
} as const

export const ALGO = {
  C14N: 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
  RSA_SHA256: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
  SHA256: 'http://www.w3.org/2001/04/xmlenc#sha256',
} as const

export const RETURN = {
  OK: '000000',
  DOWNLOAD_POSTPROCESS_DONE: '011000',
  DOWNLOAD_POSTPROCESS_SKIPPED: '011001',
  NO_DOWNLOAD_DATA: '090005',
  AUTHENTICATION_FAILED: '061001',
  INVALID_REQUEST: '061002',
  INTERNAL_ERROR: '061099',
  INVALID_USER_OR_USER_STATE: '091002',
  TX_UNKNOWN: '091101',
} as const

export const RETURN_TEXT: Record<string, string> = {
  '000000': '[EBICS_OK] OK',
  '011000': '[EBICS_DOWNLOAD_POSTPROCESS_DONE] positive Quittung erhalten',
  '011001': '[EBICS_DOWNLOAD_POSTPROCESS_SKIPPED] negative Quittung erhalten',
  '090005': '[EBICS_NO_DOWNLOAD_DATA_AVAILABLE] keine Daten verfügbar',
  '061001': '[EBICS_AUTHENTICATION_FAILED] Authentifikationssignatur fehlerhaft',
  '061002': '[EBICS_INVALID_REQUEST] Nachricht nicht EBICS-konform',
  '061099': '[EBICS_INTERNAL_ERROR] interner EBICS-Fehler',
  '091002': '[EBICS_INVALID_USER_OR_USER_STATE] Teilnehmer unbekannt oder Zustand unzulässig',
  '091101': '[EBICS_TX_UNKNOWN_TXID] Transaktions-ID ungültig',
}
