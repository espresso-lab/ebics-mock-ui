import { resolve } from 'node:path'

export interface Config {
  port: number
  host: string
  dbPath: string
  hostId: string
  ebicsPath: string
  uiDir: string | undefined
}

export const config: Config = {
  port: Number(process.env.PORT ?? 8088),
  host: process.env.HOST ?? '0.0.0.0',
  dbPath: process.env.EBICS_MOCK_DB ?? resolve(process.cwd(), 'ebics-mock.sqlite'),
  hostId: process.env.EBICS_HOST_ID ?? 'MOCKBANK',
  ebicsPath: '/ebicsweb/ebicsweb',
  uiDir: process.env.EBICS_UI_DIR,
}
