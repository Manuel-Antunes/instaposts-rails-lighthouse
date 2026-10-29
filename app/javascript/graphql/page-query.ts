import type { ApolloClient, OperationVariables, TypedDocumentNode } from '@apollo/client'
import { useApolloClient, useQuery } from '@apollo/client/react'
import { usePage } from '@inertiajs/react'
import { getOperationAST, type GraphQLFormattedError } from 'graphql'
import { useLayoutEffect, useRef } from 'react'

// The `page_query` prop render_preloaded sends (PageQueries::Preloader): the page's
// operation, run by Rails as the signed-in user.
export type PageQuery = {
  // New for every run: the browser writes each result to its cache once.
  id: string
  operation: string
  sha256: string
  variables: Record<string, unknown>
  data: Record<string, unknown> | null
  errors: GraphQLFormattedError[] | null
}

// The page queries this browser wrote to its cache. As long-lived as the cache: there is
// one client for the visit (entrypoints/inertia.tsx), while the page component is mounted
// again when Inertia goes back in history. The server renders each request once, with a
// client of its own: it always writes, and remembers nothing.
const written = new Set<string>()
const isServer = typeof window === 'undefined'

function write(client: ApolloClient, query: TypedDocumentNode<any, any>, pageQuery: PageQuery, broadcast: boolean) {
  if (pageQuery.data) client.cache.writeQuery({ query, variables: pageQuery.variables, data: pageQuery.data, broadcast })
}

/**
 * The page's pageQuery, preloaded by Rails. The result is written to Apollo's cache
 * during this render, before the query reads it, so the first render, on the server
 * and in the browser, has the data and nothing is fetched.
 *
 * A result is written once: going back to the page in Inertia's history brings the
 * same `id`, and what fetchMore added since (more pages of a list) stays in the cache.
 * A new visit brings a new id, and its fresh result.
 *
 * Errors Rails got next to the data (a field the user may not see) come back as
 * `preloadErrors`; the data has null where they happened.
 */
export function usePageQuery<TData, TVariables extends OperationVariables>(query: TypedDocumentNode<TData, TVariables>) {
  const pageQuery = usePage<{ page_query: PageQuery | null }>().props.page_query
  const client = useApolloClient()
  const operation = getOperationAST(query)?.name?.value

  if (!pageQuery || pageQuery.operation !== operation) {
    throw new Error(
      `${operation ?? 'This query'} was not preloaded for this page` +
        (pageQuery ? ` (it got ${pageQuery.operation}).` : '. Render the page with render_preloaded.'),
    )
  }

  // The id this render wrote, still to broadcast.
  const fresh = useRef<string | null>(null)
  if (isServer || !written.has(pageQuery.id)) {
    if (!isServer) written.add(pageQuery.id)
    // Not broadcast: other components must not update while this one renders.
    write(client, query, pageQuery, false)
    fresh.current = pageQuery.id
  }

  // Once mounted, write it again, broadcast, for queries already watching it (a reload
  // of page_query on the same page). Before paint, so the DOM shows the new result.
  useLayoutEffect(() => {
    if (fresh.current !== pageQuery.id) return
    fresh.current = null
    write(client, query, pageQuery, true)
  }, [client, query, pageQuery])

  const result = useQuery(query, {
    variables: pageQuery.variables as TVariables,
    fetchPolicy: 'cache-first',
  } as useQuery.Options<TData, TVariables>)

  return { ...result, preloadErrors: pageQuery.errors ?? [] }
}
