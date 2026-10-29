import { Head } from '@inertiajs/react'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { Loader2 } from 'lucide-react'
import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react'

import FeedPost from '@/components/posts/FeedPost'
import { graphql, useConnection, usePageQuery } from '@/graphql'
import AppLayout from '@/layouts/AppLayout'

// Run by PostsController#index (render_preloaded): the first page. The next ones are
// fetchMore on /graphql, merged into the same list by Query.posts' field policy.
export const pageQuery = graphql(`
  query PostsFeedPage($after: String) {
    posts(first: 10, after: $after, orderBy: [{ column: CREATED_AT, order: DESC }, { column: ID, order: DESC }]) {
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

// What a post takes before it is measured, and the window the server renders for: the
// first posts, the same ones the browser's first render shows, so hydration matches.
const ESTIMATED_POST_HEIGHT = 820
const INITIAL_RECT = { width: 470, height: 1200 }

export default function Index() {
  const query = usePageQuery(pageQuery)
  const posts = useConnection(query, (data) => data.posts)

  const listRef = useRef<HTMLDivElement>(null)
  const [scrollMargin, setScrollMargin] = useState(0)
  useLayoutEffect(() => setScrollMargin(listRef.current?.offsetTop ?? 0), [])

  const virtualizer = useWindowVirtualizer({
    count: posts.nodes.length,
    estimateSize: () => ESTIMATED_POST_HEIGHT,
    overscan: 2,
    scrollMargin,
    initialRect: INITIAL_RECT,
    initialOffset: 0,
    getItemKey: (index) => posts.nodes[index].id,
  })
  const items = virtualizer.getVirtualItems()

  // Near the end of what is loaded, load the next page.
  const lastIndex = items[items.length - 1]?.index ?? -1
  const { hasNext, fetchNext } = posts
  useEffect(() => {
    if (hasNext && lastIndex >= posts.nodes.length - 3) void fetchNext()
  }, [hasNext, fetchNext, lastIndex, posts.nodes.length])

  return (
    <>
      <Head title="Feed" />

      <div className="mx-auto max-w-[470px]">
        {posts.nodes.length === 0 && <p className="py-16 text-center text-muted-foreground">No posts yet.</p>}

        <div ref={listRef} className="relative" style={{ height: virtualizer.getTotalSize() }}>
          {items.map((item) => (
            <div
              key={item.key}
              data-index={item.index}
              ref={virtualizer.measureElement}
              className="absolute top-0 left-0 w-full pb-4"
              style={{ transform: `translateY(${item.start - virtualizer.options.scrollMargin}px)` }}
            >
              <FeedPost post={posts.nodes[item.index]} />
            </div>
          ))}
        </div>

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
