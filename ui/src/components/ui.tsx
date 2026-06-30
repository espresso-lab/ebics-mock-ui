import { Badge, Code, Text, Tooltip } from '@mantine/core'

const INIT_COLOR: Record<string, string> = { NEW: 'gray', RECEIVED: 'yellow', DONE: 'teal', PENDING: 'yellow', DELIVERED: 'teal' }

export function StateBadge({ value }: { value: string }) {
  return (
    <Badge color={INIT_COLOR[value] ?? 'gray'} variant="light" size="sm">
      {value}
    </Badge>
  )
}

const ORDER_STATUS_COLOR: Record<string, string> = {
  RECEIVED: 'blue',
  PENDING_VEU: 'yellow',
  BOOKED: 'teal',
  REJECTED: 'red',
  OPEN: 'yellow',
  SIGNED: 'teal',
  CANCELLED: 'red',
  AVAILABLE: 'blue',
  FETCHED: 'gray',
}

export function StatusBadge({ value }: { value: string }) {
  return (
    <Badge color={ORDER_STATUS_COLOR[value] ?? 'gray'} variant="light" size="sm">
      {value}
    </Badge>
  )
}

export function ReturnCodeBadge({ code }: { code: string | null }) {
  if (!code) return null
  const ok = code === '000000' || code === '011000'
  const neutral = code === '090005'
  return (
    <Badge color={ok ? 'teal' : neutral ? 'gray' : 'red'} variant="light" size="sm" ff="monospace">
      {code}
    </Badge>
  )
}

export function SignatureBadge({ value }: { value: boolean | null }) {
  if (value === null) return <Badge color="gray" variant="light" size="sm">n/v</Badge>
  return (
    <Badge color={value ? 'teal' : 'red'} variant="light" size="sm">
      {value ? 'gültig' : 'ungültig'}
    </Badge>
  )
}

export function Money({ amount, currency }: { amount: string; currency: string }) {
  const value = Number(amount).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return (
    <Text size="sm" ta="right" ff="monospace">
      {value} {currency}
    </Text>
  )
}

export function Mono({ value, max = 18 }: { value: string | null; max?: number }) {
  if (!value) return <Text size="sm" c="dimmed">—</Text>
  const short = value.length > max ? `${value.slice(0, max)}…` : value
  return (
    <Tooltip label={value} multiline disabled={value.length <= max}>
      <Code>{short}</Code>
    </Tooltip>
  )
}

export function fmtDateTime(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('de-DE')
}
