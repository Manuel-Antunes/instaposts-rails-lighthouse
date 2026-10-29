import { createHash } from 'node:crypto'

import type { CodegenConfig } from '@graphql-codegen/cli'
import { addTypenameSelectionDocumentTransform } from '@graphql-codegen/client-preset'

// Run by the inertia-graphql Vite plugin (vite/inertia-graphql) on every build and, in
// development, whenever a document or the schema changes; `npm run codegen` runs the same.
// Paths are relative to the project root, the directory vite_ruby runs Vite from.
const config: CodegenConfig = {
  // Written by Rails: bin/rails graphql:schema:dump, and on every reload in development.
  schema: 'schema.graphql',
  documents: ['app/javascript/**/*.{ts,tsx}', '!app/javascript/graphql/generated/**'],
  ignoreNoDocuments: true,
  generates: {
    'app/javascript/graphql/generated/': {
      preset: 'client',
      presetConfig: {
        // Components take FragmentType<typeof X_Fragment> props and read them with getFragmentData.
        fragmentMasking: { unmaskFunctionName: 'getFragmentData' },
        // Each operation's executable document (fragments included) and its SHA-256, in hex:
        // the hash in the browser's DocumentNode (__meta__.hash) and in the Vite manifest.
        // The plugin keeps persisted-documents.json in memory; it is never written.
        persistedDocuments: { hashAlgorithm: (document: string) => createHash('sha256').update(document).digest('hex') },
      },
      // The documents Rails runs must select __typename where Apollo's cache adds it,
      // or the preloaded result could not be written to the cache as it is.
      documentTransforms: [addTypenameSelectionDocumentTransform],
      config: {
        scalars: { DateTime: 'string', JSON: 'unknown' },
        enumsAsTypes: true,
        useTypeImports: true,
      },
    },
    // Which types implement each interface or union (Node: Post | User | Comment), so the
    // cache matches fragments on abstract types exactly.
    'app/javascript/graphql/generated/possible-types.ts': {
      plugins: ['fragment-matcher'],
      config: { module: 'es2015', apolloClientVersion: 3, useExplicitTyping: true },
    },
  },
}

export default config
