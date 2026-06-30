import { randomBytes } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import type { Account, Booking, CreditDebit } from '@ebics-mock/shared'
import type { Store } from '../db/store.js'
import { generateCamt053 } from '../ebics/camt.js'
import { parseCamtBookings } from '../ebics/camtImport.js'
import { ebicsPublicKeyDigest, generateRsaKeyPair } from '../ebics/crypto.js'

function signed(booking: Booking): number {
  return booking.creditDebit === 'CRDT' ? Number(booking.amount) : -Number(booking.amount)
}

function creditDebitOf(value: unknown): CreditDebit {
  return value === 'DBIT' ? 'DBIT' : 'CRDT'
}

function moneyOf(value: unknown): string {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric.toFixed(2) : '0.00'
}

export function registerAdminRoutes(app: FastifyInstance, store: Store): void {
  app.get('/api/health', () => ({ status: 'ok', hostId: process.env.EBICS_HOST_ID ?? 'MOCKBANK' }))

  app.get('/api/participants', () => store.listParticipants())
  app.get('/api/participants/:id/keys', (req) =>
    store.listParticipantKeys((req.params as { id: string }).id).map((k) => ({ id: `${k.participantId}-${k.type}`, ...k })),
  )
  app.get('/api/participants/:id/accounts', (req) => store.listParticipantAccountIds((req.params as { id: string }).id))
  app.put('/api/participants/:id/accounts', (req) => {
    const id = (req.params as { id: string }).id
    const body = (req.body ?? {}) as { accountIds?: string[] }
    store.setParticipantAccounts(id, Array.isArray(body.accountIds) ? body.accountIds : [])
    return store.listParticipantAccountIds(id)
  })
  app.get('/api/bank-keys', () => store.listBankKeys().map((k) => ({ id: k.type, ...k })))

  app.post('/api/participants', (req, reply) => {
    const body = (req.body ?? {}) as { hostId?: string; partnerId?: string; userId?: string }
    if (!body.partnerId || !body.userId) return reply.code(400).send({ error: 'partnerId and userId are required' })
    const hostId = body.hostId || process.env.EBICS_HOST_ID || 'MOCKBANK'
    return store.findOrCreateParticipant(hostId, body.partnerId, body.userId)
  })

  app.post('/api/participants/simulate', (req) => {
    const body = (req.body ?? {}) as { hostId?: string; partnerId?: string; userId?: string }
    const suffix = randomBytes(3).toString('hex').toUpperCase()
    const hostId = body.hostId || process.env.EBICS_HOST_ID || 'MOCKBANK'
    const participant = store.findOrCreateParticipant(hostId, body.partnerId || `MV${suffix}`, body.userId || `USER${suffix}`)
    for (const type of ['A006', 'X002', 'E002'] as const) {
      const { publicKeyPem } = generateRsaKeyPair()
      store.setParticipantKey(participant.id, type, publicKeyPem, ebicsPublicKeyDigest(publicKeyPem).toString('hex'))
    }
    store.setUserName(participant.id, 'Test-Teilnehmer')
    store.setInitState(participant.id, 'ini_state', 'DONE')
    store.setInitState(participant.id, 'hia_state', 'DONE')
    store.setHpbState(participant.id, 'DELIVERED')
    store.setParticipantActivated(participant.id, true)
    return store.getParticipant(participant.id)
  })

  app.put('/api/participants/:id/activation', (req, reply) => {
    const id = (req.params as { id: string }).id
    if (!store.getParticipant(id)) return reply.code(404).send({ error: 'participant not found' })
    const body = (req.body ?? {}) as { active?: boolean }
    store.setParticipantActivated(id, Boolean(body.active))
    return store.getParticipant(id)
  })

  app.get('/api/accounts', () => store.listAccounts())
  app.post('/api/accounts', (req, reply) => {
    const body = req.body as { iban?: string; bic?: string; currency?: string; name?: string; balance?: string; partnerId?: string }
    if (!body.iban || !body.iban.trim()) return reply.code(400).send({ error: 'iban is required' })
    return store.createAccount({
      partnerId: body.partnerId ?? 'MV126086',
      iban: body.iban.trim(),
      bic: body.bic ?? '',
      currency: body.currency ?? 'EUR',
      name: body.name ?? '',
      balance: moneyOf(body.balance ?? '0.00'),
    })
  })
  app.get('/api/accounts/:id', (req, reply) => {
    const account = store.getAccount((req.params as { id: string }).id)
    return account ?? reply.code(404).send({ error: 'account not found' })
  })
  app.put('/api/accounts/:id', (req, reply) => {
    const updated = store.updateAccount((req.params as { id: string }).id, req.body as Partial<Account>)
    return updated ?? reply.code(404).send({ error: 'account not found' })
  })
  app.get('/api/accounts/:id/bookings', (req) => store.listBookings((req.params as { id: string }).id))
  app.post('/api/accounts/:id/bookings', (req, reply) => {
    const id = (req.params as { id: string }).id
    const account = store.getAccount(id)
    if (!account) return reply.code(404).send({ error: 'account not found' })
    const b = req.body as Partial<Booking>
    return store.createBooking({
      accountId: id,
      bookDate: b.bookDate ?? new Date().toISOString().slice(0, 10),
      valueDate: b.valueDate ?? b.bookDate ?? new Date().toISOString().slice(0, 10),
      amount: moneyOf(b.amount),
      currency: b.currency ?? account.currency,
      creditDebit: creditDebitOf(b.creditDebit),
      remittance: b.remittance ?? '',
      counterpartyName: b.counterpartyName ?? '',
      counterpartyIban: b.counterpartyIban ?? '',
    })
  })

  app.get('/api/accounts/:accountId/bookings/:id', (req, reply) => {
    const booking = store.getBooking((req.params as { id: string }).id)
    return booking ?? reply.code(404).send({ error: 'booking not found' })
  })
  app.put('/api/accounts/:accountId/bookings/:id', (req, reply) => {
    const body = req.body as Partial<Booking>
    const patch: Partial<Booking> = { ...body }
    if (body.creditDebit !== undefined) patch.creditDebit = creditDebitOf(body.creditDebit)
    if (body.amount !== undefined) patch.amount = moneyOf(body.amount)
    const updated = store.updateBooking((req.params as { id: string }).id, patch)
    return updated ?? reply.code(404).send({ error: 'booking not found' })
  })

  app.post('/api/accounts/:id/import-camt', (req, reply) => {
    const id = (req.params as { id: string }).id
    const account = store.getAccount(id)
    if (!account) return reply.code(404).send({ error: 'account not found' })
    const body = req.body
    const xml = typeof body === 'string' ? body : ((body as { content?: string })?.content ?? '')
    if (!xml.trim()) return reply.code(400).send({ error: 'no camt content' })
    let bookings
    try {
      bookings = parseCamtBookings(xml)
    } catch {
      return reply.code(400).send({ error: 'invalid camt xml' })
    }
    for (const b of bookings) {
      store.createBooking({
        accountId: id,
        bookDate: b.bookDate || new Date().toISOString().slice(0, 10),
        valueDate: b.valueDate || b.bookDate || new Date().toISOString().slice(0, 10),
        amount: b.amount,
        currency: b.currency || account.currency,
        creditDebit: b.creditDebit,
        remittance: b.remittance,
        counterpartyName: b.counterpartyName,
        counterpartyIban: b.counterpartyIban,
      })
    }
    return { imported: bookings.length }
  })

  app.get('/api/orders', () => store.listOrders())
  app.get('/api/orders/:id', (req, reply) => {
    const order = store.getOrder((req.params as { id: string }).id)
    return order ?? reply.code(404).send({ error: 'order not found' })
  })

  app.get('/api/statements', () => store.listStatements())
  app.post('/api/accounts/:id/statements', (req, reply) => {
    const id = (req.params as { id: string }).id
    const account = store.getAccount(id)
    if (!account) return reply.code(404).send({ error: 'account not found' })
    const body = req.body as { fromDate?: string; toDate?: string }
    const all = store.listBookings(id)
    const dates = all.map((b) => b.bookDate).filter(Boolean).sort()
    const fromDate = body.fromDate ?? dates[0] ?? '2026-01-01'
    const toDate = body.toDate ?? dates[dates.length - 1] ?? new Date().toISOString().slice(0, 10)
    const inRange = all.filter((b) => b.bookDate >= fromDate && b.bookDate <= toDate)
    const opening = all.filter((b) => b.bookDate < fromDate).reduce((s, b) => s + signed(b), 0)
    const closing = opening + inRange.reduce((s, b) => s + signed(b), 0)
    const msgId = `MSG-${account.iban}-${toDate}`
    const camt = generateCamt053({
      msgId,
      statementId: msgId,
      account,
      fromDate,
      toDate,
      openingBalance: opening.toFixed(2),
      closingBalance: closing.toFixed(2),
      createdAt: new Date().toISOString(),
      bookings: inRange,
    })
    return store.createStatement({
      accountId: id,
      iban: account.iban,
      fromDate,
      toDate,
      fileName: `camt053_${account.iban}_${fromDate}_${toDate}.xml`,
      content: camt,
    })
  })
  app.get('/api/statements/:id/content', (req, reply) => {
    const content = store.getStatementContent((req.params as { id: string }).id)
    if (content === undefined) return reply.code(404).send({ error: 'statement not found' })
    return reply.header('Content-Type', 'application/xml').send(content)
  })

  app.get('/api/protocol', () => store.listProtocol())
  app.get('/api/exchanges', () => store.listExchanges())

  app.get('/api/veu', () => store.listOpenVeu())
  app.post('/api/veu', (req, reply) => {
    const body = req.body as { orderId: string; signaturesRequired?: number }
    const order = store.listOrders().find((o) => o.orderId === body.orderId)
    if (!order) return reply.code(404).send({ error: 'order not found' })
    store.setOrderStatus(order.id, 'PENDING_VEU')
    return store.createVeu({
      orderId: order.orderId,
      participantId: order.participantId,
      kind: order.kind,
      totalAmount: order.totalAmount,
      currency: order.currency,
      signaturesRequired: body.signaturesRequired ?? 2,
    })
  })

  const del = (path: string, remove: (id: string) => void) =>
    app.delete(path, (req, reply) => {
      remove((req.params as { id: string }).id)
      return reply.code(204).send()
    })

  del('/api/participants/:id', (id) => store.deleteParticipant(id))
  del('/api/accounts/:id', (id) => store.deleteAccount(id))
  del('/api/accounts/:accountId/bookings/:id', (id) => store.deleteBooking(id))
  del('/api/orders/:id', (id) => store.deleteOrder(id))
  del('/api/statements/:id', (id) => store.deleteStatement(id))
  del('/api/veu/:id', (id) => store.deleteVeu(id))
}
