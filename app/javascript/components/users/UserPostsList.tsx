import type { OperationVariables } from '@apollo/client'
import { Camera } from 'lucide-react'

import PostGrid from '@/components/posts/PostGrid'
import { type ConnectionSource, type FragmentType, getFragmentData, graphql, useConnection } from '@/graphql'

// The grid's first page, with $after for the next ones (fetchMore, on /graphql): the
// operation that spreads this declares it.
export const UserPostsList_UserFragment = graphql(`
  fragment UserPostsList_User on User {
    posts(first: 18, after: $after, orderBy: [{ column: CREATED_AT, order: DESC }]) {
      edges {
        cursor
        node {
          id
          ...PostThumbnail_Post
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`)

/**
 * A user's posts as Instagram's grid (PostGrid). The page gives its query's result: the next
 * page is that query's fetchMore, and the list is read from this component's fragment.
 */
export default function UserPostsList({ query }: { query: ConnectionSource<{ user?: FragmentType<typeof UserPostsList_UserFragment> | null }, OperationVariables> }) {
  const posts = useConnection(query, (data) => getFragmentData(UserPostsList_UserFragment, data.user)?.posts)

  return (
    <div id="user-posts-list" className="border-t pt-1">
      <PostGrid
        posts={posts}
        empty={
          <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
            <Camera className="size-12" />
            <p className="text-xl font-semibold text-foreground">No posts yet</p>
          </div>
        }
      />
    </div>
  )
}
