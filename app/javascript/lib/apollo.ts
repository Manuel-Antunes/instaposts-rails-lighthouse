import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client'

// Inertia refreshes this cookie on every page response, so unlike the <meta> tag
// it never goes stale after signing in or out. Rails checks it as the CSRF token.
function xsrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}

export const apolloClient = new ApolloClient({
  link: new HttpLink({
    uri: '/graphql',
    credentials: 'same-origin',
    fetch: (uri, options) =>
      fetch(uri, { ...options, headers: { ...options?.headers, 'X-XSRF-TOKEN': xsrfToken() } }),
  }),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          // Connections: "load more" appends the next page to the cached one.
          users: {
            keyArgs: false,
            merge(existing, incoming, { args }) {
              if (!args?.after || !existing) return incoming
              return { ...incoming, edges: [...existing.edges, ...incoming.edges] }
            },
          },
        },
      },
    },
  }),
})
