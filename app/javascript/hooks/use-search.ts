import { useQuery } from '@apollo/client/react'
import { useEffect, useState } from 'react'

import { graphql } from '@/graphql'

// Query.search: people, hashtags and posts in one ranked list (Lighthouse's @search on the
// SearchResult union, through pg_search's multisearch). Each row reads its own fragment; the
// box reads where each result leads, for the keyboard.
const SEARCH_BOX = graphql(`
  query SearchBox($term: String!) {
    search(term: $term, first: 8) {
      data {
        __typename
        ... on User {
          id
          username
          ...AccountRow_User
        }
        ... on Hashtag {
          id
          name
          ...HashtagRow_Hashtag
        }
        ... on Post {
          id
          path
          ...PostRow_Post
        }
      }
      paginatorInfo {
        total
      }
    }
  }
`)

/**
 * What the search box shows for `term` while it is open: asked once the typing pauses, the
 * last results kept meanwhile. Nothing for a blank term.
 */
export function useSearchBox(term: string, open: boolean) {
  const trimmed = term.trim()
  const [settled, setSettled] = useState(trimmed)
  useEffect(() => {
    const timer = setTimeout(() => setSettled(trimmed), 200)
    return () => clearTimeout(timer)
  }, [trimmed])

  const query = useQuery(SEARCH_BOX, { variables: { term: settled }, skip: !open || settled === '' })
  const search = (query.data ?? query.previousData)?.search

  return {
    results: trimmed === '' ? [] : (search?.data ?? []),
    total: search?.paginatorInfo.total ?? 0,
    loading: trimmed !== '' && (query.loading || settled !== trimmed),
    error: query.error,
  }
}
