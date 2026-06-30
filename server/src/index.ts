import { createApp } from './app.js'
import { config } from './config.js'
import { Store } from './db/store.js'
import { ensureBankKeys } from './ebics/bank.js'
import { seedDemoData } from './seed.js'

const store = new Store(config.dbPath)
ensureBankKeys(store)
if (process.env.EBICS_SEED === 'true') seedDemoData(store)

const app = await createApp(store)
await app.listen({ port: config.port, host: config.host })
console.log(`EBICS mock bank listening on http://${config.host}:${config.port}${config.ebicsPath}`)
