import react from '@vitejs/plugin-react'
import inertia from '@inertiajs/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import RubyPlugin from 'vite-plugin-ruby'

import inertiaGraphql from './vite/inertia-graphql/index.ts'

export default defineConfig(({ command }) => ({
  plugins: [
    tailwindcss(),
    RubyPlugin(),
    inertia({ ssr: 'ssr/ssr.tsx' }),
    // Codegen, and each page's pageQuery in the manifest for Rails (PageQueries).
    inertiaGraphql(),
    react(),
  ],
  // The production image only ships Node, not node_modules, so the SSR bundle has to be self-contained.
  // Not in dev: the dev server loads React from node_modules (it is CommonJS and can't be inlined).
  ssr: { noExternal: command === 'build' ? true : undefined },
}))
