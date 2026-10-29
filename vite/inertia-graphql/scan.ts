import { type DocumentNode, GraphQLError, parse } from 'graphql'
import { parseSync } from 'vite'

// One `graphql(`...`)` call of a module.
export type ScannedDocument = {
  // The name it is exported as (`pageQuery`, `PostCard_PostFragment`), when it is.
  exportName: string | null
  line: number
  document: DocumentNode
  operations: { name: string; type: 'query' | 'mutation' | 'subscription' }[]
  fragments: string[]
}

export type ScannedModule = {
  file: string
  documents: ScannedDocument[]
  errors: string[]
}

type Node = { type: string; start: number; end: number; [key: string]: unknown }

const isNode = (value: unknown): value is Node =>
  typeof value === 'object' && value !== null && typeof (value as Node).type === 'string'

// Visits every node below `node`, with its parent.
function walk(node: Node, visit: (node: Node, parent: Node | null) => void, parent: Node | null = null) {
  visit(node, parent)
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const child of value) if (isNode(child)) walk(child, visit, node)
    } else if (isNode(value)) {
      walk(value, visit, node)
    }
  }
}

function lineOf(code: string, offset: number) {
  let line = 1
  for (let i = 0; i < offset && i < code.length; i++) if (code.charCodeAt(i) === 10) line++
  return line
}

/**
 * The `graphql(`...`)` calls of a module, found in its syntax tree. Each must take one
 * static template literal, as GraphQL Code Generator needs too; anything else is an error.
 */
export function scanModule(file: string, code: string): ScannedModule {
  const result: ScannedModule = { file, documents: [], errors: [] }
  if (!code.includes('graphql(')) return result

  const parsed = parseSync(file, code, { lang: file.endsWith('x') ? 'tsx' : 'ts' })
  if (parsed.errors.length > 0) {
    result.errors.push(`${file}: ${parsed.errors[0].message}`)
    return result
  }

  // `export const name = graphql(...)`: the declarator, then the export around its declaration.
  const exportedDeclarators = new Map<Node, string>()
  walk(parsed.program as unknown as Node, (node) => {
    if (node.type !== 'ExportNamedDeclaration' || !isNode(node.declaration)) return
    const declaration = node.declaration
    if (declaration.type !== 'VariableDeclaration') return
    for (const declarator of declaration.declarations as Node[]) {
      const id = declarator.id as Node & { name?: string }
      if (id.type === 'Identifier' && id.name) exportedDeclarators.set(declarator, id.name)
    }
  })

  walk(parsed.program as unknown as Node, (node, parent) => {
    if (node.type !== 'CallExpression') return
    const callee = node.callee as Node & { name?: string }
    if (callee.type !== 'Identifier' || callee.name !== 'graphql') return

    const line = lineOf(code, node.start)
    const where = `${file}:${line}`
    const [argument] = node.arguments as Node[]
    if (!argument || argument.type !== 'TemplateLiteral') {
      result.errors.push(`${where}: graphql() takes a template literal`)
      return
    }
    if ((argument.expressions as Node[]).length > 0) {
      result.errors.push(`${where}: graphql() documents must be static, without \${} interpolation`)
      return
    }

    const source = (argument.quasis as { value: { cooked: string } }[])[0].value.cooked
    let document: DocumentNode
    try {
      document = parse(source)
    } catch (error) {
      const location = error instanceof GraphQLError && error.locations?.[0]
      result.errors.push(`${location ? `${file}:${line + location.line - 1}` : where}: ${(error as Error).message}`)
      return
    }

    const exportName = parent?.type === 'VariableDeclarator' && parent.init === node ? (exportedDeclarators.get(parent) ?? null) : null
    const operations: ScannedDocument['operations'] = []
    const fragments: string[] = []
    for (const definition of document.definitions) {
      if (definition.kind === 'OperationDefinition') {
        if (!definition.name) {
          result.errors.push(`${where}: every operation needs a name`)
          return
        }
        operations.push({ name: definition.name.value, type: definition.operation })
      } else if (definition.kind === 'FragmentDefinition') {
        fragments.push(definition.name.value)
      }
    }
    result.documents.push({ exportName, line, document, operations, fragments })
  })

  return result
}
