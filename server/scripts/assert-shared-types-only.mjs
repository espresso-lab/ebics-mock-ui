import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dist = fileURLToPath(new URL('../dist', import.meta.url))
const offenders = []

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) walk(path)
    else if (path.endsWith('.js') && readFileSync(path, 'utf8').includes('@ebics-mock/shared')) offenders.push(path)
  }
}

walk(dist)

if (offenders.length > 0) {
  console.error('@ebics-mock/shared is types-only: the runtime image ships no copy of it. Runtime imports found in:')
  for (const path of offenders) console.error(`  ${path}`)
  process.exit(1)
}
