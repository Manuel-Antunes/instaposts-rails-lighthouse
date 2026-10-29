import type { FieldPolicy } from '@apollo/client'

type Paginator = { __typename?: string; data: unknown[]; paginatorInfo: Record<string, unknown> }

/**
 * The field policy of a PAGINATOR or SIMPLE list (Lighthouse's `first` + `page`): each
 * page lands at its offset in one list, which keeps the latest paginatorInfo. Without
 * `page`, or on page 1, the list starts over.
 */
export function pagePagination(keyArgs: string[]): FieldPolicy<Paginator> {
  return {
    keyArgs,
    merge(existing, incoming, { args }) {
      const page = Number(args?.page ?? 1)
      if (!existing || page <= 1) return incoming

      const first = Number(args?.first ?? incoming.data.length)
      const data = existing.data.slice(0, (page - 1) * first)
      return { ...incoming, data: [...data, ...incoming.data] }
    },
  }
}
