import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { glob, readFile } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { generate as codegen } from '@graphql-codegen/cli'
import type { CodegenConfig } from '@graphql-codegen/cli'
import { buildSchema } from 'graphql'

import { buildMetadata, type Metadata } from './metadata.ts'
import { operationPagination, type OperationPagination, paginationModule, typePoliciesModule } from './pagination.ts'
import { scanModule } from './scan.ts'

export type Options = {
  // The project root: where codegen.ts and schema.graphql are, and Vite runs from.
  root: string
  sourceDir: string
  pagesDir: string
  generatedDir: string
  schema: string
}

export function resolveOptions(root = process.cwd()): Options {
  const sourceDir = resolve(root, 'app/javascript')
  return {
    root,
    sourceDir,
    pagesDir: join(sourceDir, 'pages'),
    generatedDir: join(sourceDir, 'graphql/generated'),
    schema: resolve(root, 'schema.graphql'),
  }
}

// Only rewrite what changed: an untouched file keeps Vite's HMR and vite_ruby's digest still.
// The folder is not committed, so a fresh clone does not have it yet.
function writeIfChanged(file: string, content: string) {
  if (existsSync(file) && readFileSync(file, 'utf8') === content) return false
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, content)
  return true
}

/**
 * GraphQL Code Generator, then the page → operation metadata, generated/type-policies.ts
 * and generated/pagination.ts. persisted-documents.json stays in memory: its documents
 * reach Rails through the Vite manifest (or /__inertia_graphql), never as a file.
 */
export async function generate(options: Options): Promise<{ metadata: Metadata; errors: string[]; written: string[] }> {
  const config = (await import(pathToFileURL(resolve(options.root, 'codegen.ts')).href)).default as CodegenConfig
  const outputs = await codegen({ ...config, cwd: options.root, silent: true, errorsOnly: true }, false)

  const written: string[] = []
  let persistedDocuments: Record<string, string> = {}
  for (const output of outputs) {
    const file = resolve(options.root, output.filename)
    if (basename(file) === 'persisted-documents.json') persistedDocuments = JSON.parse(output.content)
    else if (writeIfChanged(file, output.content)) written.push(file)
  }

  const files: string[] = []
  for await (const file of glob('**/*.{ts,tsx}', { cwd: options.sourceDir })) {
    const path = join(options.sourceDir, file)
    if (!path.startsWith(options.generatedDir)) files.push(path)
  }
  const modules = await Promise.all(files.sort().map(async (file) => scanModule(file, await readFile(file, 'utf8'))))
  const { metadata, errors } = buildMetadata({ pagesDir: options.pagesDir, modules, persistedDocuments })

  const schema = buildSchema(readFileSync(options.schema, 'utf8'))
  const pagination: Record<string, OperationPagination[]> = {}
  for (const [name, operation] of Object.entries(metadata.operations)) pagination[name] = operationPagination(schema, operation.document)

  for (const [name, content] of [
    ['type-policies.ts', typePoliciesModule(schema)],
    ['pagination.ts', paginationModule(pagination)],
  ]) {
    const file = join(options.generatedDir, name)
    if (writeIfChanged(file, content)) written.push(file)
  }

  return { metadata, errors, written }
}
