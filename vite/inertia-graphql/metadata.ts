import { relative, sep } from 'node:path'

import { type OperationDefinitionNode, parse, print } from 'graphql'

import type { ScannedModule } from './scan.ts'

// The contract with Rails (PageQueries::Manifest). Bump it, there and here, on any change.
export const METADATA_VERSION = 1

export type OperationMetadata = {
  type: 'query' | 'mutation' | 'subscription'
  sha256: string
  // Executable: the operation, every fragment it spreads, __typename where Apollo adds it.
  document: string
  variables: { name: string; type: string; required: boolean }[]
}

export type Metadata = {
  // Inertia component (posts/show) → the operation it preloads, or null.
  pages: Record<string, string | null>
  operations: Record<string, OperationMetadata>
  // Module file → the operations it declares, for the chunk that bundles it.
  moduleOperations: Map<string, string[]>
  // Page module file → its Inertia component.
  pageComponents: Map<string, string>
}

const PAGE_EXTENSION = /\.(tsx|jsx|ts|js)$/

// pages/posts/show.tsx → posts/show: what Inertia's resolver maps back to the file, and
// what inertia_rails' component_path_resolver names (controller_path/action).
export function componentFor(pagesDir: string, file: string) {
  return relative(pagesDir, file).split(sep).join('/').replace(PAGE_EXTENSION, '')
}

function variablesOf(operation: OperationDefinitionNode): OperationMetadata['variables'] {
  return (operation.variableDefinitions ?? []).map((definition) => ({
    name: definition.variable.name.value,
    type: print(definition.type),
    required: definition.type.kind === 'NonNullType' && !definition.defaultValue,
  }))
}

/**
 * Each page's pageQuery and each operation's executable document, from the modules'
 * graphql() calls and codegen's persisted documents (sha256 → document).
 */
export function buildMetadata(options: {
  pagesDir: string
  modules: ScannedModule[]
  persistedDocuments: Record<string, string>
}): { metadata: Metadata; errors: string[] } {
  const errors = options.modules.flatMap((module) => module.errors)
  const metadata: Metadata = { pages: {}, operations: {}, moduleOperations: new Map(), pageComponents: new Map() }

  for (const [sha256, document] of Object.entries(options.persistedDocuments)) {
    const operation = parse(document).definitions.find((d): d is OperationDefinitionNode => d.kind === 'OperationDefinition')
    if (!operation?.name) continue
    metadata.operations[operation.name.value] = { type: operation.operation, sha256, document, variables: variablesOf(operation) }
  }

  const fragmentFiles = new Map<string, string>()
  for (const module of options.modules) {
    const declared = module.documents.flatMap((document) => document.operations.map((operation) => operation.name))
    if (declared.length > 0) metadata.moduleOperations.set(module.file, declared)

    for (const document of module.documents) {
      for (const fragment of document.fragments) {
        const other = fragmentFiles.get(fragment)
        if (other) errors.push(`${module.file}:${document.line}: fragment ${fragment} is already declared in ${other}`)
        else fragmentFiles.set(fragment, `${module.file}:${document.line}`)
      }
    }

    if (!module.file.startsWith(options.pagesDir + sep) || !PAGE_EXTENSION.test(module.file)) continue
    const component = componentFor(options.pagesDir, module.file)
    metadata.pageComponents.set(module.file, component)
    metadata.pages[component] = null

    const pageQueries = module.documents.filter((document) => document.exportName === 'pageQuery')
    if (pageQueries.length === 0) continue
    if (pageQueries.length > 1) {
      errors.push(`${module.file}: a page has at most one pageQuery`)
      continue
    }

    const [pageQuery] = pageQueries
    const where = `${module.file}:${pageQuery.line}`
    if (pageQuery.operations.length !== 1 || pageQuery.fragments.length > 0) {
      errors.push(`${where}: pageQuery must be exactly one operation, without fragment definitions`)
      continue
    }
    const [operation] = pageQuery.operations
    if (operation.type !== 'query') {
      errors.push(`${where}: pageQuery must be a query, not a ${operation.type}`)
      continue
    }
    if (!metadata.operations[operation.name]) {
      errors.push(`${where}: GraphQL Code Generator produced no document for ${operation.name}`)
      continue
    }
    metadata.pages[component] = operation.name
  }

  return { metadata, errors }
}

// What /__inertia_graphql answers and Rails reads: the manifest's data, by page.
export function devPayload(metadata: Metadata) {
  return { version: METADATA_VERSION, pages: metadata.pages, operations: metadata.operations }
}
