// npm run codegen: what the Vite plugin does when a build starts, without Vite.
import { relative } from 'node:path'

import { generate, resolveOptions } from './generate.ts'

const options = resolveOptions()
const { metadata, errors, written } = await generate(options)

for (const file of written) console.log(`wrote ${relative(options.root, file)}`)
if (errors.length > 0) {
  console.error(errors.join('\n'))
  process.exit(1)
}

const pages = Object.entries(metadata.pages).filter(([, operation]) => operation)
console.log(`${Object.keys(metadata.operations).length} operations; pageQuery of ${pages.map(([page, op]) => `${page} (${op})`).join(', ')}`)
