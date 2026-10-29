import { ApolloClient, ApolloLink, HttpLink, InMemoryCache } from '@apollo/client'
import { Observable } from 'rxjs'

import possibleTypes from '@/graphql/generated/possible-types'
import { typePolicies } from '@/graphql/generated/type-policies'

// Inertia refreshes this cookie on every page response, so unlike the <meta> tag
// it never goes stale after signing in or out. Rails checks it as the CSRF token.
function xsrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}

const http = new HttpLink({
  uri: '/graphql',
  credentials: 'same-origin',
  fetch: (uri, options) => fetch(uri, { ...options, headers: { ...options?.headers, 'X-XSRF-TOKEN': xsrfToken() } }),
})

// While rendering on the server, what a page shows was preloaded by Rails
// (usePageQuery). A query that was not stays loading, as it starts in the browser.
const noNetwork = new ApolloLink(() => new Observable(() => {}))

export function createApolloClient({ ssr }: { ssr: boolean }) {
  return new ApolloClient({
    ssrMode: ssr,
    link: ssr ? noNetwork : http,
    // Both generated from schema.graphql: which types implement Node, and how the pages
    // of each list Lighthouse paginates merge.
    cache: new InMemoryCache({ possibleTypes: possibleTypes.possibleTypes, typePolicies }),
  })
}
