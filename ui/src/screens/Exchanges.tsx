import { DataTable, type Field } from '@espresso-lab/mantine-data-table'
import { Code, ScrollArea, SimpleGrid, Stack, Text } from '@mantine/core'
import { listField } from '../components/fields'
import { Mono, ReturnCodeBadge, fmtDateTime } from '../components/ui'
import type { Exchange } from '../types'

function prettyXml(xml: string): string {
  const withBreaks = xml.replace(/>\s*</g, '>\n<')
  let depth = 0
  return withBreaks
    .split('\n')
    .map((line) => {
      if (/^<\/.+>/.test(line)) depth = Math.max(0, depth - 1)
      const indented = `${'  '.repeat(depth)}${line}`
      if (/^<[^!?/][^>]*[^/]>$/.test(line) && !/<\/.+>/.test(line)) depth += 1
      return indented
    })
    .join('\n')
}

function XmlPanel({ title, xml }: { title: string; xml: string }) {
  return (
    <Stack gap={4}>
      <Text size="xs" fw={600} c="dimmed">{title}</Text>
      <ScrollArea h={320} type="auto">
        <Code block style={{ fontSize: 11 }}>{prettyXml(xml)}</Code>
      </ScrollArea>
    </Stack>
  )
}

const fields: Field<Exchange>[] = [
  listField('createdAt', { accessor: 'createdAt', title: 'Zeitpunkt', sortable: true, render: (e) => fmtDateTime(e.createdAt) }),
  listField('rootElement', { accessor: 'rootElement', title: 'Request', render: (e) => <Code>{e.rootElement}</Code> }),
  listField('orderType', { accessor: 'orderType', title: 'Auftragsart' }),
  listField('phase', { accessor: 'phase', title: 'Phase' }),
  listField('returnCode', { accessor: 'returnCode', title: 'ReturnCode', render: (e) => <ReturnCodeBadge code={e.returnCode} /> }),
  listField('transactionId', { accessor: 'transactionId', title: 'Transaktion', render: (e) => <Mono value={e.transactionId} max={14} /> }),
]

export function Exchanges() {
  return (
    <DataTable<Exchange>
      title="Verkehr (Roh-XML)"
      titleHint="Jeder EBICS-Request/Response im Klartext — das wichtigste Werkzeug beim Debuggen gegen den banking-service."
      queryKey={['exchanges']}
      apiPath="/api/exchanges"
      fields={fields}
      mobileCards
      autoPoll={5000}
      defaultSort={{ field: 'createdAt', direction: 'desc' }}
      rowExpansion={{
        content: (record) => (
          <SimpleGrid cols={{ base: 1, md: 2 }} p="sm" spacing="md">
            <XmlPanel title="REQUEST" xml={record.requestXml} />
            <XmlPanel title="RESPONSE" xml={record.responseXml} />
          </SimpleGrid>
        ),
      }}
    />
  )
}
