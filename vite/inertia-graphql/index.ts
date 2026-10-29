import { basename, relative, sep } from 'node:path'

import type { Plugin, ResolvedConfig } from 'vite'

import { generate, type Options, resolveOptions } from './generate.ts'
import { devPayload, METADATA_VERSION, type Metadata } from './metadata.ts'

const DEV_ENDPOINT = '/__inertia_graphql'
const MANIFEST = '.vite/manifest.json'

/**
 * Inertia pages × GraphQL operations, for PageQueries in Rails.
 *
 * - Runs GraphQL Code Generator (codegen.ts) when the build starts and, in development,
 *   whenever a module of app/javascript or schema.graphql changes.
 * - Finds each page's `export const pageQuery = graphql(...)`.
 * - Build: adds to the Vite manifest, on each page's entry,
 *   `inertia: { component, pageQuery }` and, on each chunk declaring operations,
 *   `graphql: { version, operations }` with their executable documents.
 * - Development: serves the same at /__inertia_graphql.
 */
export default function inertiaGraphql(options: Options = resolveOptions()): Plugin {
  let config: ResolvedConfig
  let metadata: Metadata | null = null
  let running: Promise<void> = Promise.resolve()

  const relativeToRoot = (file: string) => relative(options.root, file)

  // Serialized: a change during a run waits for it, then runs again. Resolves to the
  // errors, after keeping the metadata of a run without any.
  const regenerate = () => {
    const run = running.then(async () => {
      try {
        const result = await generate(options)
        for (const file of result.written) config.logger.info(`[inertia-graphql] wrote ${relativeToRoot(file)}`, { timestamp: true })
        if (result.errors.length === 0) metadata = result.metadata
        return result.errors.map((error) => error.replaceAll(options.root + sep, ''))
      } catch (error) {
        return [(error as Error).message]
      }
    })
    running = run.then(() => undefined)
    return run
  }
  const report = (errors: string[]) => {
    if (errors.length > 0) config.logger.error(`[inertia-graphql]\n${errors.join('\n')}`, { timestamp: true })
  }

  return {
    name: 'inertia-graphql',

    configResolved(resolved) {
      config = resolved
    },

    async buildStart() {
      const errors = await regenerate()
      if (errors.length > 0 && config.command === 'build') this.error(`[inertia-graphql]\n${errors.join('\n')}`)
      report(errors)
    },

    configureServer(server) {
      server.watcher.add(options.schema)

      let timer: ReturnType<typeof setTimeout> | undefined
      const onChange = (file: string) => {
        const relevant =
          file === options.schema ||
          (file.startsWith(options.sourceDir + sep) && !file.startsWith(options.generatedDir) && /\.tsx?$/.test(file))
        if (!relevant) return

        clearTimeout(timer)
        timer = setTimeout(() => void regenerate().then(report), 150)
      }
      server.watcher.on('change', onChange)
      server.watcher.on('add', onChange)
      server.watcher.on('unlink', onChange)

      server.middlewares.use(DEV_ENDPOINT, (req, res, next) => {
        if (req.method !== 'GET') return next()

        // Answer with what the latest regeneration produced, once it is done.
        running.then(() => {
          res.setHeader('Content-Type', 'application/json')
          if (metadata) {
            res.end(JSON.stringify(devPayload(metadata)))
          } else {
            res.statusCode = 503
            res.end(JSON.stringify({ error: 'The GraphQL documents have errors; see the Vite log.' }))
          }
        })
      })
    },

    generateBundle: {
      order: 'post',
      handler(_, bundle) {
        const asset = bundle[MANIFEST]
        if (!asset || asset.type !== 'asset' || !metadata) return

        const manifest = JSON.parse(asset.source.toString())
        for (const chunk of Object.values(bundle)) {
          if (chunk.type !== 'chunk') continue

          // The key Vite gives the chunk in the manifest: its source, or _<file name>.
          const key = chunk.facadeModuleId ? relative(config.root, chunk.facadeModuleId).split(sep).join('/') : `_${basename(chunk.fileName)}`
          const entry = manifest[key]
          if (!entry) continue

          const operations: Metadata['operations'] = {}
          for (const id of chunk.moduleIds) {
            for (const name of metadata.moduleOperations.get(id.split('?')[0]) ?? []) {
              const operation = metadata.operations[name]
              if (operation) operations[name] = operation
            }
          }

          const component = chunk.facadeModuleId ? metadata.pageComponents.get(chunk.facadeModuleId) : undefined
          if (component) entry.inertia = { component, pageQuery: metadata.pages[component] }
          if (component || Object.keys(operations).length > 0) entry.graphql = { version: METADATA_VERSION, operations }
        }
        asset.source = JSON.stringify(manifest, null, 2)
      },
    },
  }
}
