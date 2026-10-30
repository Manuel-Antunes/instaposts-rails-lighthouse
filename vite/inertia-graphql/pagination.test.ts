import assert from 'node:assert/strict'
import { test } from 'node:test'

import { buildSchema } from 'graphql'

import { operationPagination, paginatedFields, paginationModule, typePoliciesModule } from './pagination.ts'

// The shapes Lighthouse rewrites @paginate / @hasMany(type:) fields into.
const schema = buildSchema(`
  type PageInfo { hasNextPage: Boolean! endCursor: String }
  type PaginatorInfo { currentPage: Int! hasMorePages: Boolean! }
  type SimplePaginatorInfo { currentPage: Int! hasMorePages: Boolean! }
  type PostEdge { cursor: String! node: Post! }
  type PostConnection { edges: [PostEdge!]! pageInfo: PageInfo! }
  type CommentPaginator { data: [Comment!]! paginatorInfo: PaginatorInfo! }
  type TagSimplePaginator { data: [String!]! paginatorInfo: SimplePaginatorInfo! }
  type Comment { id: ID! }
  type Post {
    id: ID!
    comments(first: Int!, page: Int): CommentPaginator!
    tags(first: Int!, page: Int): TagSimplePaginator!
  }
  type Query {
    posts(first: Int!, after: String, orderBy: String): PostConnection!
    post(id: ID!): Post
    latest(first: Int!): [Post!]!
  }
`)

test('finds the fields Lighthouse paginates, and what tells their lists apart', () => {
  assert.deepEqual(paginatedFields(schema), {
    Post: {
      comments: { type: 'PAGINATOR', pageArgument: 'page', keyArgs: ['first'] },
      tags: { type: 'SIMPLE', pageArgument: 'page', keyArgs: ['first'] },
    },
    Query: { posts: { type: 'CONNECTION', pageArgument: 'after', keyArgs: ['first', 'orderBy'] } },
  })
})

test('an operation paginates the fields whose page argument is a variable, through fragments and aliases', () => {
  const document = `
    fragment Comments on Post { replies: comments(first: 5, page: $commentsPage) { data { id } } }
    query Page($after: String, $commentsPage: Int) {
      feed: posts(first: 10, after: $after) { edges { node { id ...Comments } } }
      post(id: "1") { tags(first: 3, page: 2) { data } }
    }
  `
  assert.deepEqual(operationPagination(schema, document), [
    { path: ['feed'], type: 'CONNECTION', variable: 'after' },
    { path: ['feed', 'edges', 'node', 'replies'], type: 'PAGINATOR', variable: 'commentsPage' },
  ])
})

test('generates a field policy for each paginated field', () => {
  const module = typePoliciesModule(schema)
  assert.match(module, /import \{ relayStylePagination \} from '@apollo\/client\/utilities'/)
  assert.match(module, /import \{ pagePagination \} from '..\/page-pagination\.ts'/)
  assert.match(module, /posts: relayStylePagination\(\['first', 'orderBy'\]\)/)
  assert.match(module, /comments: pagePagination\(\['first'\]\)/)
})

test('generates the pagination of each operation that has some', () => {
  const module = paginationModule({ Page: [{ path: ['feed'], type: 'CONNECTION', variable: 'after' }], Other: [] })
  assert.match(module, /Page: \[\{ path: \['feed'\], type: 'CONNECTION', variable: 'after' \}\],/)
  assert.doesNotMatch(module, /Other/)
})
