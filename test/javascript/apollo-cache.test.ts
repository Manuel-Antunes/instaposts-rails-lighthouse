// The cache behaviors the pages rely on, with the generated policies and a real InMemoryCache.
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { InMemoryCache } from '@apollo/client'
import { parse } from 'graphql'

import { addComment, removeComment } from '../../app/javascript/components/comments/cache.ts'
import possibleTypes from '../../app/javascript/graphql/generated/possible-types.ts'
import { typePolicies } from '../../app/javascript/graphql/generated/type-policies.ts'
import { pagePagination } from '../../app/javascript/graphql/page-pagination.ts'

const newCache = () => new InMemoryCache({ possibleTypes: possibleTypes.possibleTypes, typePolicies })

const FEED = parse(`
  query Feed($after: String) {
    posts(first: 2, after: $after) {
      __typename
      edges { __typename cursor node { __typename id name } }
      pageInfo { __typename hasNextPage endCursor }
    }
  }
`)

const page = (names: string[], start: number, hasNextPage: boolean) => ({
  posts: {
    __typename: 'PostConnection',
    edges: names.map((name, i) => ({ __typename: 'PostEdge', cursor: String(start + i), node: { __typename: 'Post', id: name, name } })),
    pageInfo: { __typename: 'PageInfo', hasNextPage, endCursor: String(start + names.length - 1) },
  },
})

const names = (cache: InMemoryCache) =>
  cache.readQuery<ReturnType<typeof page>>({ query: FEED, variables: {} })?.posts.edges.map((edge) => edge.node.name)

test('the pages of a connection merge into the list the first page is read with', () => {
  const cache = newCache()
  cache.writeQuery({ query: FEED, variables: {}, data: page(['a', 'b'], 1, true) })
  cache.writeQuery({ query: FEED, variables: { after: '2' }, data: page(['c', 'd'], 3, false) })

  assert.deepEqual(names(cache), ['a', 'b', 'c', 'd'])
  assert.equal(cache.readQuery<ReturnType<typeof page>>({ query: FEED, variables: {} })?.posts.pageInfo.hasNextPage, false)

  // A new visit's first page (usePageQuery with a new id) starts the list over.
  cache.writeQuery({ query: FEED, variables: {}, data: page(['z', 'a'], 1, true) })
  assert.deepEqual(names(cache), ['z', 'a'])
})

const COMMENTS = parse(`
  query Post($id: ID!) {
    post(id: $id) {
      __typename
      id
      oldest: comments(first: 10) {
        __typename
        edges { __typename cursor node { __typename id body } }
        pageInfo { __typename hasNextPage endCursor }
      }
      latest: comments(first: 2, orderBy: [{ column: CREATED_AT, order: DESC }]) {
        __typename
        edges { __typename cursor node { __typename id body } }
        pageInfo { __typename hasNextPage endCursor }
      }
    }
  }
`)

const comments = (bodies: string[], hasNextPage = false) => ({
  __typename: 'CommentConnection',
  edges: bodies.map((body, i) => ({ __typename: 'CommentEdge', cursor: String(i + 1), node: { __typename: 'Comment', id: body, body } })),
  pageInfo: { __typename: 'PageInfo', hasNextPage, endCursor: String(bodies.length) },
})

function commentsCache({ oldestHasNext = false } = {}) {
  const cache = newCache()
  cache.writeQuery({
    query: COMMENTS,
    variables: { id: 'p1' },
    data: { post: { __typename: 'Post', id: 'p1', oldest: comments(['c1', 'c2'], oldestHasNext), latest: comments(['c2', 'c1'], false) } },
  })
  return cache
}

function bodies(cache: InMemoryCache) {
  const post = cache.readQuery<{ post: { oldest: ReturnType<typeof comments>; latest: ReturnType<typeof comments> } }>({ query: COMMENTS, variables: { id: 'p1' } })?.post
  return { oldest: post?.oldest.edges.map((e) => e.node.body), latest: post?.latest.edges.map((e) => e.node.body) }
}

test('a new comment goes last in an oldest-first list, first in a newest-first one, keeping its size', () => {
  const cache = commentsCache()
  cache.writeFragment({ id: 'Comment:c3', fragment: parse('fragment C on Comment { __typename id body }'), data: { __typename: 'Comment', id: 'c3', body: 'c3' } })
  addComment(cache, 'p1', 'c3')

  assert.deepEqual(bodies(cache), { oldest: ['c1', 'c2', 'c3'], latest: ['c3', 'c2'] })
})

test('a new comment waits for the last page of a list whose end is not loaded', () => {
  const cache = commentsCache({ oldestHasNext: true })
  cache.writeFragment({ id: 'Comment:c3', fragment: parse('fragment C on Comment { __typename id body }'), data: { __typename: 'Comment', id: 'c3', body: 'c3' } })
  addComment(cache, 'p1', 'c3')

  assert.deepEqual(bodies(cache).oldest, ['c1', 'c2'])
})

test('a deleted comment leaves every list, and the cache', () => {
  const cache = commentsCache()
  removeComment(cache, 'p1', 'c2')

  assert.deepEqual(bodies(cache), { oldest: ['c1'], latest: ['c1'] })
  assert.equal(cache.extract()['Comment:c2'], undefined)
})

test('the pages of a PAGINATOR land at their offset', () => {
  const policy = pagePagination(['first'])
  const merge = policy.merge as unknown as (existing: unknown, incoming: unknown, options: { args: Record<string, unknown> }) => { data: string[] }
  const info = { currentPage: 1, hasMorePages: true }

  const first = merge(undefined, { data: ['a', 'b'], paginatorInfo: info }, { args: { first: 2 } })
  const second = merge(first, { data: ['c', 'd'], paginatorInfo: info }, { args: { first: 2, page: 2 } })
  assert.deepEqual(second.data, ['a', 'b', 'c', 'd'])
  assert.deepEqual(merge(second, { data: ['x', 'y'], paginatorInfo: info }, { args: { first: 2, page: 2 } }).data, ['a', 'b', 'x', 'y'])
  assert.deepEqual(merge(second, { data: ['n'], paginatorInfo: info }, { args: { first: 2 } }).data, ['n'])
})
