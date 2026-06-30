import type { Account } from '@ebics-mock/shared'
import { escapeXml } from './xml.js'

const ROOT_NS = `xmlns="urn:org:ebics:H005" xmlns:ds="http://www.w3.org/2000/09/xmldsig#"`

interface ServiceDef {
  serviceName: string
  scope?: string
  msgName: string
  msgVersion?: string
  container?: string
}

export interface OrderCatalogEntry {
  adminOrderType: 'BTD' | 'BTU' | 'HTD' | 'HAC' | 'HAA' | 'HPD' | 'HKD' | 'PTK' | 'HVU' | 'HVD' | 'HVZ' | 'HVT' | 'HVE' | 'HVS'
  service?: ServiceDef
  description: string
  authLevel?: 'E' | 'A' | 'B' | 'T'
}

export const ORDER_CATALOG: OrderCatalogEntry[] = [
  { adminOrderType: 'BTD', service: { serviceName: 'EOP', scope: 'DE', msgName: 'camt.053', container: 'ZIP' }, description: 'Tagesauszüge (camt.053)' },
  { adminOrderType: 'BTU', service: { serviceName: 'SCT', scope: 'DE', msgName: 'pain.001' }, description: 'SEPA-Überweisung', authLevel: 'E' },
  { adminOrderType: 'BTU', service: { serviceName: 'SDD', scope: 'DE', msgName: 'pain.008' }, description: 'SEPA-Lastschrift', authLevel: 'E' },
  { adminOrderType: 'HAC', description: 'Kundenprotokoll abholen' },
  { adminOrderType: 'HTD', description: 'Kunden- und Teilnehmerdaten' },
  { adminOrderType: 'PTK', description: 'Protokolldatei' },
  { adminOrderType: 'HVU', description: 'VEU-Übersicht' },
  { adminOrderType: 'HVD', description: 'VEU-Status' },
  { adminOrderType: 'HVE', description: 'VEU-Unterschrift hinzufügen', authLevel: 'T' },
  { adminOrderType: 'HVS', description: 'VEU-Storno', authLevel: 'T' },
]

function pubKeyInfo(tag: string, versionTag: string, version: string, certificateB64: string): string {
  return (
    `<${tag}><ds:X509Data><ds:X509Certificate>${certificateB64}</ds:X509Certificate></ds:X509Data>` +
    `<${versionTag}>${version}</${versionTag}></${tag}>`
  )
}

export function buildHpbResponseOrderData(hostId: string, x002CertB64: string, e002CertB64: string): string {
  return (
    `<HPBResponseOrderData ${ROOT_NS}>` +
    pubKeyInfo('AuthenticationPubKeyInfo', 'AuthenticationVersion', 'X002', x002CertB64) +
    pubKeyInfo('EncryptionPubKeyInfo', 'EncryptionVersion', 'E002', e002CertB64) +
    `<HostID>${hostId}</HostID>` +
    `</HPBResponseOrderData>`
  )
}

function serviceXml(service: ServiceDef): string {
  const version = service.msgVersion ? ` version="${service.msgVersion}"` : ''
  return (
    `<Service><ServiceName>${service.serviceName}</ServiceName>` +
    (service.scope ? `<Scope>${service.scope}</Scope>` : '') +
    (service.container ? `<Container containerType="${service.container}"/>` : '') +
    `<MsgName${version}>${service.msgName}</MsgName></Service>`
  )
}

function orderInfoXml(entry: OrderCatalogEntry): string {
  return (
    `<OrderInfo><AdminOrderType>${entry.adminOrderType}</AdminOrderType>` +
    (entry.service ? serviceXml(entry.service) : '') +
    `<Description>${escapeXml(entry.description)}</Description><NumSigRequired>${entry.authLevel ? 1 : 0}</NumSigRequired></OrderInfo>`
  )
}

function permissionXml(entry: OrderCatalogEntry): string {
  const level = entry.authLevel ? ` AuthorisationLevel="${entry.authLevel}"` : ''
  return (
    `<Permission${level}><AdminOrderType>${entry.adminOrderType}</AdminOrderType>` +
    (entry.service ? serviceXml(entry.service) : '') +
    `</Permission>`
  )
}

function accountInfoXml(account: Account, index: number): string {
  return (
    `<AccountInfo ID="A${index + 1}" Currency="${account.currency}" Description="${escapeXml(account.name)}">` +
    `<AccountNumber international="true">${account.iban}</AccountNumber>` +
    (account.bic ? `<BankCode international="true">${account.bic}</BankCode>` : '') +
    `<AccountHolder>${escapeXml(account.name)}</AccountHolder></AccountInfo>`
  )
}

export interface HtdContext {
  hostId: string
  partnerId: string
  userId: string
  userName: string
  partnerName: string
  accounts: Account[]
}

export function buildHtdResponseOrderData(ctx: HtdContext): string {
  const accounts = ctx.accounts.map(accountInfoXml).join('')
  const orderInfos = ORDER_CATALOG.map(orderInfoXml).join('')
  const permissions = ORDER_CATALOG.map(permissionXml).join('')
  return (
    `<HTDResponseOrderData ${ROOT_NS}>` +
    `<PartnerInfo>` +
    `<AddressInfo><Name>${escapeXml(ctx.partnerName)}</Name></AddressInfo>` +
    `<BankInfo><HostID>${ctx.hostId}</HostID></BankInfo>` +
    accounts +
    orderInfos +
    `</PartnerInfo>` +
    `<UserInfo><UserID Status="1">${ctx.userId}</UserID><Name>${escapeXml(ctx.userName)}</Name>` +
    permissions +
    `</UserInfo>` +
    `</HTDResponseOrderData>`
  )
}

export function buildHaaResponseOrderData(): string {
  const services = ORDER_CATALOG.filter((entry) => entry.adminOrderType === 'BTD' && entry.service)
    .map((entry) => serviceXml(entry.service as ServiceDef))
    .join('')
  return `<HAAResponseOrderData ${ROOT_NS}>${services}</HAAResponseOrderData>`
}
