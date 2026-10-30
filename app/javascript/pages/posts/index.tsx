import { Head } from '@inertiajs/react'
import { Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'

import LoadMoreError from '@/components/LoadMoreError'
import FeedPost from '@/components/posts/FeedPost'
import { graphql, useConnection, usePageQuery } from '@/graphql'
import { useWindowVirtualList } from '@/hooks/use-window-virtual-list'
import AppLayout from '@/layouts/AppLayout'

// Run by PostsController#index (render_preloaded): the first page. The next ones are
// fetchMore on /graphql, merged into the same list by Query.posts' field policy.
export const pageQuery = graphql(`
  query PostsFeedPage($after: String) {
    posts(first: 10, after: $after, orderBy: [{ column: CREATED_AT, order: DESC }]) {
      edges {
        cursor
        node {
          id
          ...FeedPost_Post
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`)

export default function Index() {
  const query = usePageQuery(pageQuery)
  const posts = useConnection(query, (data) => data.posts)
  const { listRef, virtualizer, rows, totalSize, rowStyle } = useWindowVirtualList({
    count: posts.nodes.length,
    // What a post takes before it is measured, and the window the server renders for: the
    // first posts, the same ones the browser's first render shows, so hydration matches.
    estimateSize: 820,
    initialRect: { width: 470, height: 1200 },
    getItemKey: (index) => posts.nodes[index].id,
    hasNext: posts.hasNext,
    fetchNext: posts.fetchNext,
    loadAhead: 5,
  })

  return (
    <>
      <Head title="Feed" />

      <div className="mx-auto max-w-117.5">
        {posts.nodes.length === 0 && <p className="py-16 text-center text-muted-foreground">No posts yet.</p>}

        <div ref={listRef} className="relative" style={{ height: totalSize }}>
          {rows.map((row) => (
            <div key={row.key} data-index={row.index} ref={virtualizer.measureElement} className="absolute top-0 left-0 w-full pb-4" style={rowStyle(row)}>
              <FeedPost post={posts.nodes[row.index]} />
            </div>
          ))}
        </div>

        <LoadMoreError error={posts.error} onRetry={() => void posts.retryNext()} />
        {posts.loadingNext && (
          <div className="flex justify-center py-6 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" aria-label="Loading more posts" />
          </div>
        )}
        {!posts.hasNext && posts.nodes.length > 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">You're all caught up.</p>
        )}
      </div>
    </>
  )
}

Index.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>
