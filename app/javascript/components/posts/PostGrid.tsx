import { Loader2 } from 'lucide-react'
import { type ReactNode, useState } from 'react'

import LoadMoreError from '@/components/LoadMoreError'
import PostPreviewDialog from '@/components/posts/PostPreviewDialog'
import PostThumbnail, { type PostThumbnail_PostFragment } from '@/components/posts/PostThumbnail'
import type { Connection, FragmentType } from '@/graphql'
import { useWindowVirtualList } from '@/hooks/use-window-virtual-list'

/**
 * Posts as Instagram's grid: rows of three squares, only the ones in view in the DOM, the
 * next page fetched as the last rows come into view, and a click opens the post in a preview
 * over the page. A profile, a hashtag's page and the search results show their posts so;
 * `empty` is what shows when there are none.
 */
export default function PostGrid({ posts, empty }: { posts: Connection<FragmentType<typeof PostThumbnail_PostFragment> & { id: string }>; empty: ReactNode }) {
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
    <>
      {posts.nodes.length === 0 && empty}

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
    </>
  )
}
