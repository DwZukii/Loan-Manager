// scripts/stamp-version.js
// Runs automatically before every `npm run build`
// Writes the current UTC timestamp into public/version.json
// This triggers the in-app update notification for all connected users.

import { writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outPath = resolve(__dirname, '../public/version.json')

const version = new Date().toISOString() // e.g. "2024-07-01T15:42:00.000Z"

writeFileSync(outPath, JSON.stringify({ version }, null, 2))
console.log(`✅  version.json stamped → ${version}`)
