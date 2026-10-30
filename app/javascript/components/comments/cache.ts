import type { ApolloCache, Reference } from '@apollo/client'

type Edge = { __typename?: string; cursor?: string; node: Reference }
type CommentList = { edges: Edge[]; pageInfo?: { hasNextPage?: boolean } }

/**
 * Put a comment just created into each cached list of its post's comments: first in a
 * newest-first list (the feed's latest comments), last in an oldest-first one. A list
 * whose end is not loaded yet is left alone: the server will send the comment with the
 * last page, and adding it here too would show it twice.
 */
export function addComment(cache: ApolloCache, postId: string, commentId: string) {
  // The arguments in a stored field's name: comments:{"first":2,"orderBy":[...]}.
  const argsOf = (storeFieldName: string): { first?: number; orderBy?: { order?: string }[] } => {
    const colon = storeFieldName.indexOf(':')
    return colon === -1 ? {} : JSON.parse(storeFieldName.slice(colon + 1))
  }

  cache.modify<{ comments: CommentList }>({
    id: cache.identify({ __typename: 'Post', id: postId }),
    fields: {
      comments(existing, { storeFieldName, toReference }) {
        const list = existing as CommentList | undefined
        const node = toReference({ __typename: 'Comment', id: commentId })
        if (!list?.edges || !node) return existing

        const edge: Edge = { __typename: 'CommentEdge', cursor: '', node }
        const args = argsOf(storeFieldName)
        if (args.orderBy?.[0]?.order === 'DESC') {
          return { ...list, edges: [edge, ...list.edges].slice(0, args.first ?? list.edges.length + 1) }
        }
        if (list.pageInfo?.hasNextPage) return existing
        return { ...list, edges: [...list.edges, edge] }
      },
    },
  })
}

// Take a deleted comment out of every cached list of its post's comments, and out of the cache.
export function removeComment(cache: ApolloCache, postId: string, commentId: string) {
  cache.modify<{ comments: CommentList }>({
    id: cache.identify({ __typename: 'Post', id: postId }),
    fields: {
      comments(existing, { readField }) {
        const list = existing as CommentList | undefined
        if (!list?.edges) return existing
        return { ...list, edges: list.edges.filter((edge) => readField('id', edge.node) !== commentId) }
      },
    },
  })
  cache.evict({ id: cache.identify({ __typename: 'Comment', id: commentId }) })
  cache.gc()
}
