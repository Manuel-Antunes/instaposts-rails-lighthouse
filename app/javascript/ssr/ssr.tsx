import { ApolloProvider } from '@apollo/client/react'
import { createInertiaApp } from '@inertiajs/react'

import { createApolloClient } from '@/lib/apollo'

// Server-side counterpart of entrypoints/inertia.tsx. In development the Vite dev server
// renders this through /__inertia_ssr; in production it is bundled by `bin/vite build --ssr`
// into public/vite-ssr/ssr.js and served by a Node process (see bin/docker-entrypoint).
createInertiaApp({
  pages: '../pages',

  title: (title) => title || 'InstaPosts',

  // withApp runs once per render: each request gets a client, and a cache, of its own,
  // so one user's data never reaches another's page.
  withApp: (app) => <ApolloProvider client={createApolloClient({ ssr: true })}>{app}</ApolloProvider>,
})
