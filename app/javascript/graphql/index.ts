// `graphql()` declares a document inline; GraphQL Code Generator types it, and the
// inertia-graphql Vite plugin (vite/inertia-graphql) finds each page's
// `export const pageQuery`. Documents must be static template literals: no interpolation.
export { type Connection, type ConnectionSource, useConnection } from './connection'
export { type FragmentType, getFragmentData, makeFragmentData } from './generated/fragment-masking'
export { graphql } from './generated/gql'
export { type PageQuery, usePageQuery } from './page-query'
