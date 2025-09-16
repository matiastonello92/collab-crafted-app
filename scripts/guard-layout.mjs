import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = 'app'
const offenders = { html: [], body: [], globals: [] }

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry)
    const info = statSync(fullPath)

    if (info.isDirectory()) {
      walk(fullPath)
      continue
    }

    if (info.isFile() && fullPath.endsWith('.tsx')) {
      const contents = readFileSync(fullPath, 'utf8')
      if (fullPath !== 'app/layout.tsx') {
        if (/<html[\s>]/.test(contents)) offenders.html.push(fullPath)
        if (/<body[\s>]/.test(contents)) offenders.body.push(fullPath)
      }
      if (fullPath !== 'app/layout.tsx' && /globals\.css/.test(contents)) {
        offenders.globals.push(fullPath)
      }
    }
  }
}

walk(ROOT)

const errors = []
if (offenders.html.length) errors.push(`Found <html> in: ${offenders.html.join(', ')}`)
if (offenders.body.length) errors.push(`Found <body> in: ${offenders.body.join(', ')}`)
if (offenders.globals.length) errors.push(`Found globals.css import in: ${offenders.globals.join(', ')}`)

if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}

console.log('Layout guard passed ✅')
