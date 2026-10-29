import type { OperationVariables } from '@apollo/client'
import { useCallback, useRef, useState } from 'react'

import { type OperationPagination, pagination } from './generated/pagination'

type Edges<TNode> = { edges?: ReadonlyArray<{ node?: TNode | null } | null> | null; pageInfo: { hasNextPage: boolean; endCursor?: string | null } }
type Pages<TNode> = { data: ReadonlyArray<TNode>; paginatorInfo: { currentPage: number; hasMorePages: boolean } }

export type Connection<TNode> = {
  nodes: TNode[]
  hasNext: boolean
  loadingNext: boolean
  // Loads the next page into the same list; nothing while one loads or at the end.
  fetchNext: () => Promise<void>
}

// What useConnection needs of a useQuery (or usePageQuery) result: the operation's name
// is on its ObservableQuery.
type QueryResult<TData, TVariables> = {
  data?: TData
  observable: { queryName?: string }
  fetchMore: (options: { variables: Partial<TVariables> }) => Promise<unknown>
}

function entryFor(operation: string, path?: readonly string[]): OperationPagination {
  const entries = pagination[operation] ?? []
  const entry = path ? entries.find((candidate) => candidate.path.join('.') === path.join('.')) : entries.length === 1 ? entries[0] : undefined
  if (entry) return entry

  throw new Error(
    entries.length === 0
      ? `${operation} has no paginated field whose page argument is a variable`
      : `${operation} paginates ${entries.map((e) => e.path.join('.')).join(' and ')}: pass the path of the list`,
  )
}

/**
 * A paginated list of a query's result, and the way to its next page: fetchMore with the
 * variable the field's page argument takes (after for a CONNECTION, page for a PAGINATOR),
 * known from the build (generated/pagination.ts). The pages merge in the cache through
 * the field's generated policy (generated/type-policies.ts).
 *
 *   const query = usePageQuery(pageQuery)
 *   const posts = useConnection(query, (data) => data.posts)
 */
export function useConnection<TData, TVariables extends OperationVariables, TNode>(
  result: QueryResult<TData, TVariables>,
  select: (data: TData) => Edges<TNode> | Pages<TNode> | null | undefined,
  options: { path?: readonly string[] } = {},
): Connection<TNode> {
  const entry = entryFor(result.observable.queryName ?? '', options.path)
  const list = result.data ? select(result.data) : null

  let nodes: TNode[] = []
  let hasNext = false
  let next: unknown = null
  if (list && 'pageInfo' in list) {
    nodes = (list.edges ?? []).flatMap((edge) => (edge?.node ? [edge.node] : []))
    hasNext = list.pageInfo.hasNextPage && !!list.pageInfo.endCursor
    next = list.pageInfo.endCursor
  } else if (list) {
    nodes = [...list.data]
    hasNext = list.paginatorInfo.hasMorePages
    next = list.paginatorInfo.currentPage + 1
  }

  const [loadingNext, setLoadingNext] = useState(false)
  const loading = useRef(false)
  const { fetchMore } = result
  const variable = entry.variable

  const fetchNext = useCallback(async () => {
    if (loading.current || !hasNext) return
    loading.current = true
    setLoadingNext(true)
    try {
      await fetchMore({ variables: { [variable]: next } as Partial<TVariables> })
    } finally {
      loading.current = false
      setLoadingNext(false)
    }
  }, [fetchMore, hasNext, next, variable])

  return { nodes, hasNext, loadingNext, fetchNext }
}
