import { DOMParser, XMLSerializer } from '@xmldom/xmldom'
import xpath from 'xpath'

type AnyNode = ReturnType<DOMParser['parseFromString']>

export function parseXml(xml: string): AnyNode {
  return new DOMParser().parseFromString(xml, 'text/xml')
}

export function serialize(node: unknown): string {
  return new XMLSerializer().serializeToString(node as never)
}

export function selectNodes(node: unknown, expr: string): Node[] {
  return xpath.select(expr, node as never) as unknown as Node[]
}

export function selectFirst(node: unknown, expr: string): Node | undefined {
  const result = xpath.select1(expr, node as never) as unknown as Node | undefined
  return result ?? undefined
}

export function byLocalName(node: unknown, localName: string): Node | undefined {
  return selectFirst(node, `.//*[local-name()='${localName}']`)
}

export function textOf(node: unknown, localName: string): string {
  const found = byLocalName(node, localName)
  return found?.textContent?.trim() ?? ''
}

export function attrOf(node: Node, name: string): string {
  const el = node as unknown as Element
  return typeof el.getAttribute === 'function' ? (el.getAttribute(name) ?? '') : ''
}

export function rootLocalName(doc: unknown): string {
  const el = (doc as Document).documentElement
  return el ? el.localName || el.nodeName.replace(/^.*:/, '') : ''
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
