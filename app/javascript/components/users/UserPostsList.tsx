import type { OperationVariables } from '@apollo/client'
import { Camera, Loader2 } from 'lucide-react'
import { useState } from 'react'

import LoadMoreError from '@/components/LoadMoreError'
import PostPreviewDialog from '@/components/posts/PostPreviewDialog'
import PostThumbnail from '@/components/posts/PostThumbnail'
import { type ConnectionSource, type FragmentType, getFragmentData, graphql, useConnection } from '@/graphql'
import { useWindowVirtualList } from '@/hooks/use-window-virtual-list'

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
 * A user's posts as Instagram's grid: rows of three squares, only the ones in view in the
 * DOM, the next page fetched as the last rows come into view, and a click opens the post in
 * a preview over the page. The page gives its query's result: the next page is that query's
 * fetchMore, and the list is read from this component's fragment.
 */
export default function UserPostsList({ query }: { query: ConnectionSource<{ user?: FragmentType<typeof UserPostsList_UserFragment> | null }, OperationVariables> }) {
  const posts = useConnection(query, (data) => getFragmentData(UserPostsList_UserFragment, data.user)?.posts)
  const [previewing, setPreviewing] = useState<string | null>(null)

  const columns = 3
  const rowCount = Math.ceil(posts.nodes.length / columns)
  const { listRef, virtualizer, rows, totalSize, rowStyle } = useWindowVirtualList({
    count: rowCount,
    // What a row of squares takes before it is measured (a 935px column), and the window the
    // server renders for: the same first rows the browser's first render shows.
    estimateSize: 311,
    overscan: 3,
    initialRect: { width: 935, height: 1000 },
    getItemKey: (row) => posts.nodes[row * columns].id,
    hasNext: posts.hasNext,
    fetchNext: posts.fetchNext,
  })

  return (
    <div id="user-posts-list" className="border-t pt-1">
      {posts.nodes.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
          <Camera className="size-12" />
          <p className="text-xl font-semibold text-foreground">No posts yet</p>
        </div>
      )}

      <div ref={listRef} className="relative" style={{ height: totalSize }}>
        {rows.map((row) => (
          <div key={row.key} data-index={row.index} ref={virtualizer.measureElement} className="absolute top-0 left-0 grid w-full grid-cols-3 gap-1 pb-1" style={rowStyle(row)}>
            {posts.nodes.slice(row.index * columns, (row.index + 1) * columns).map((post) => (
              <PostThumbnail key={post.id} post={post} onOpen={() => setPreviewing(post.id)} />
            ))}
          </div>
        ))}
      </div>

      <LoadMoreError error={posts.error} onRetry={() => void posts.retryNext()} />
      {posts.loadingNext && (
        <div className="flex justify-center py-6 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" aria-label="Loading more posts" />
        </div>
      )}

      <PostPreviewDialog postId={previewing} onClose={() => setPreviewing(null)} />
    </div>
  )
}
