import { existsSync } from 'node:fs'
import cors from '@fastify/cors'
import fastifyStatic from '@fastify/static'
import Fastify, { type FastifyInstance } from 'fastify'
import { config } from './config.js'
import type { Store } from './db/store.js'
import { handleEbics } from './ebics/router.js'
import { registerAdminRoutes } from './rest/admin.js'

export async function createApp(store: Store): Promise<FastifyInstance> {
  const app = Fastify({ logger: false })
  await app.register(cors, { origin: true })

  app.addContentTypeParser(
    ['text/xml', 'application/xml', 'text/plain', 'application/octet-stream'],
    { parseAs: 'string' },
    (_req, body, done) => done(null, body),
  )

  app.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
    const text = typeof body === 'string' ? body.trim() : ''
    if (!text) return done(null, undefined)
    try {
      done(null, JSON.parse(text))
    } catch (error) {
      done(error as Error, undefined)
    }
  })

  app.post(config.ebicsPath, async (req, reply) => {
    const xml = typeof req.body === 'string' ? req.body : ''
    const { xml: response } = handleEbics(store, xml)
    return reply.header('Content-Type', 'text/xml; charset=UTF-8').send(response)
  })

  registerAdminRoutes(app, store)

  if (config.uiDir && existsSync(config.uiDir)) {
    await app.register(fastifyStatic, { root: config.uiDir })
    app.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith('/api') || req.url.startsWith(config.ebicsPath)) {
        return reply.code(404).send({ error: 'not found' })
      }
      return reply.sendFile('index.html')
    })
  }

  return app
}
