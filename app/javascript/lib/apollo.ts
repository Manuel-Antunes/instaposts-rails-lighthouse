import { ApolloClient, ApolloLink, InMemoryCache } from '@apollo/client'
import UploadHttpLink from 'apollo-upload-client/UploadHttpLink.mjs'
import { Observable } from 'rxjs'

import possibleTypes from '@/graphql/generated/possible-types'
import { typePolicies } from '@/graphql/generated/type-policies'

export function createApolloClient({ ssr }: { ssr: boolean }) {
  // While rendering on the server, what a page shows was preloaded by Rails (usePageQuery).
  // A query that was not stays loading, as it starts in the browser: no network there.
  // In the browser, an HttpLink that sends operations whose variables hold a File as a
  // multipart request (the GraphQL multipart request spec), which Lighthouse reads as the
  // Upload scalar.
  const link = ssr
    ? new ApolloLink(() => new Observable(() => {}))
    : new UploadHttpLink({
        uri: '/graphql',
        credentials: 'same-origin',
        fetch: (uri, options) => {
          // Inertia refreshes this cookie on every page response, so unlike the <meta> tag
          // it never goes stale after signing in or out. Rails checks it as the CSRF token.
          const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/)
          const token = match ? decodeURIComponent(match[1]) : ''
          return fetch(uri, { ...options, headers: { ...options?.headers, 'X-XSRF-TOKEN': token } })
        },
      })

  return new ApolloClient({
    ssrMode: ssr,
    link,
    // Both generated from schema.graphql: which types implement Node, and how the pages
    // of each list Lighthouse paginates merge.
    cache: new InMemoryCache({ possibleTypes: possibleTypes.possibleTypes, typePolicies }),
  })
}
