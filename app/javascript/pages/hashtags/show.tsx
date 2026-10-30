import { Head } from '@inertiajs/react'
import { Hash } from 'lucide-react'
import type { ReactNode } from 'react'

import PostGrid from '@/components/posts/PostGrid'
import ShareButton from '@/components/ShareButton'
import { graphql, useConnection, usePageQuery } from '@/graphql'
import AppLayout from '@/layouts/AppLayout'
import { hashtagPath } from '@/lib/paths'

// Run by HashtagsController#show (render_preloaded) with the tag's name: the live posts it
// tags, newest first. The next pages are fetchMore with $after, on /graphql.
export const pageQuery = graphql(`
  query HashtagShowPage($name: String!, $after: String) {
    hashtag(name: $name) {
      id
      name
      postsCount
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
  }
`)

export default function Show() {
  const query = usePageQuery(pageQuery)
  const hashtag = query.data?.hashtag
  const posts = useConnection(query, (data) => data.hashtag?.posts)

  if (!hashtag) return <p className="text-muted-foreground">This hashtag is not available.</p>

  return (
    <>
      <Head title={`#${hashtag.name}`} />

      <div className="mx-auto max-w-233.75">
        <header className="flex items-center gap-6 pb-8 md:gap-16 md:px-8 md:pb-10">
          <span className="flex size-20 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-fuchsia-500 via-rose-500 to-amber-400 text-white md:size-36">
            <Hash className="size-9 md:size-16" />
          </span>

          <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="truncate text-xl font-semibold">#{hashtag.name}</h1>
              <ShareButton variant="button" path={hashtagPath(hashtag.name)} title={`#${hashtag.name}`} label="Share hashtag" />
            </div>
            <p className="text-sm">
              <span className="font-semibold">{hashtag.postsCount.toLocaleString('en-US')}</span> {hashtag.postsCount === 1 ? 'post' : 'posts'}
            </p>
          </div>
        </header>

        <div className="border-t pt-1">
          <PostGrid posts={posts} empty={<p className="py-20 text-center text-muted-foreground">No posts with #{hashtag.name} yet.</p>} />
        </div>
      </div>
    </>
  )
}

Show.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>
