import assert from 'node:assert/strict'
import { test } from 'node:test'

import { scanModule } from './scan.ts'

test('finds the graphql() documents of a module, and their export names', () => {
  const code = `
    import { graphql } from '@/graphql'
    export const pageQuery = graphql(\`
      query PostShowPage($id: ID!) { post(id: $id) { id ...Card_Post } }
    \`)
    export const Card_PostFragment = graphql(\`fragment Card_Post on Post { id name }\`)
    const LIKE = graphql(\`mutation LikePost($id: ID!) { likePost(id: $id) { id } }\`)
    export default function Page() { return <div>{LIKE ? 'x' : 'y'}</div> }
  `
  const { documents, errors } = scanModule('/app/pages/posts/show.tsx', code)

  assert.deepEqual(errors, [])
  assert.deepEqual(
    documents.map((d) => [d.exportName, d.operations, d.fragments]),
    [
      ['pageQuery', [{ name: 'PostShowPage', type: 'query' }], []],
      ['Card_PostFragment', [], ['Card_Post']],
      [null, [{ name: 'LikePost', type: 'mutation' }], []],
    ],
  )
  assert.equal(documents[0].line, 3)
})

test('rejects interpolation, anything but a template literal, and unnamed operations', () => {
  const code = `
    const field = 'name'
    export const a = graphql(\`query A { \${field} }\`)
    export const b = graphql('query B { name }')
    export const c = graphql(\`{ name }\`)
  `
  const { documents, errors } = scanModule('/app/x.ts', code)

  assert.deepEqual(documents, [])
  assert.deepEqual(errors, [
    '/app/x.ts:3: graphql() documents must be static, without ${} interpolation',
    '/app/x.ts:4: graphql() takes a template literal',
    '/app/x.ts:5: every operation needs a name',
  ])
})

test('reports a GraphQL syntax error on its line', () => {
  const { errors } = scanModule('/app/x.ts', 'export const q = graphql(`\n  query Q {\n    name(\n  }\n`)')
  assert.equal(errors.length, 1)
  assert.match(errors[0], /^\/app\/x\.ts:4: Syntax Error/)
})

test('a module without graphql() is not parsed', () => {
  assert.deepEqual(scanModule('/app/x.ts', 'this is not even TypeScript ('), { file: '/app/x.ts', documents: [], errors: [] })
})
