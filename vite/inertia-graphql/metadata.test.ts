import assert from 'node:assert/strict'
import { test } from 'node:test'

import { buildMetadata, componentFor } from './metadata.ts'
import { scanModule } from './scan.ts'

const PAGES = '/app/javascript/pages'

const persisted = {
  aaa: 'query PostShowPage($id: ID!, $after: String, $first: Int! = 10) { post(id: $id) { id } }',
  bbb: 'mutation LikePost($id: ID!) { likePost(id: $id) { id } }',
}

function build(files: Record<string, string>, persistedDocuments: Record<string, string> = persisted) {
  const modules = Object.entries(files).map(([file, code]) => scanModule(file, code))
  return buildMetadata({ pagesDir: PAGES, modules, persistedDocuments })
}

test('the component of a page is its path under pages/, without extension', () => {
  assert.equal(componentFor(PAGES, `${PAGES}/posts/show.tsx`), 'posts/show')
  assert.equal(componentFor(PAGES, `${PAGES}/admin/users/index.tsx`), 'admin/users/index')
})

test('maps each page to its pageQuery, and each operation to its document and variables', () => {
  const { metadata, errors } = build({
    [`${PAGES}/posts/show.tsx`]: 'export const pageQuery = graphql(`query PostShowPage($id: ID!) { post(id: $id) { id } }`)',
    [`${PAGES}/posts/new.tsx`]: 'export default function New() {}',
    '/app/javascript/components/Like.tsx': 'const LIKE = graphql(`mutation LikePost($id: ID!) { likePost(id: $id) { id } }`)',
  })

  assert.deepEqual(errors, [])
  assert.deepEqual(metadata.pages, { 'posts/show': 'PostShowPage', 'posts/new': null })
  assert.deepEqual(metadata.operations.PostShowPage, {
    type: 'query',
    sha256: 'aaa',
    document: persisted.aaa,
    variables: [
      { name: 'id', type: 'ID!', required: true },
      { name: 'after', type: 'String', required: false },
      { name: 'first', type: 'Int!', required: false },
    ],
  })
  assert.deepEqual(metadata.moduleOperations.get('/app/javascript/components/Like.tsx'), ['LikePost'])
  assert.equal(metadata.pageComponents.get(`${PAGES}/posts/show.tsx`), 'posts/show')
})

test('a page has at most one pageQuery, and it is a query codegen produced', () => {
  const twice = build({
    [`${PAGES}/a.tsx`]: 'export const pageQuery = graphql(`query A { a }`)\nexport const pageQuery = graphql(`query B { b }`)',
  })
  assert.deepEqual(twice.errors, [`${PAGES}/a.tsx: a page has at most one pageQuery`])

  const mutation = build({ [`${PAGES}/a.tsx`]: 'export const pageQuery = graphql(`mutation LikePost($id: ID!) { likePost(id: $id) { id } }`)' })
  assert.deepEqual(mutation.errors, [`${PAGES}/a.tsx:1: pageQuery must be a query, not a mutation`])

  const missing = build({ [`${PAGES}/a.tsx`]: 'export const pageQuery = graphql(`query Gone { a }`)' })
  assert.deepEqual(missing.errors, [`${PAGES}/a.tsx:1: GraphQL Code Generator produced no document for Gone`])
  assert.equal(missing.metadata.pages.a, null)
})

test('a fragment name is declared once', () => {
  const { errors } = build({
    '/app/javascript/components/A.tsx': 'export const A = graphql(`fragment Card_Post on Post { id }`)',
    '/app/javascript/components/B.tsx': 'export const B = graphql(`fragment Card_Post on Post { name }`)',
  })
  assert.deepEqual(errors, ['/app/javascript/components/B.tsx:1: fragment Card_Post is already declared in /app/javascript/components/A.tsx:1'])
})
