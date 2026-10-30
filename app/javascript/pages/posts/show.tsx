import { Head, Link } from '@inertiajs/react'
import type { ReactNode } from 'react'

import PostWithComments from '@/components/posts/PostWithComments'
import { graphql, usePageQuery } from '@/graphql'
import AppLayout from '@/layouts/AppLayout'

// Run by PostsController#show (render_preloaded) with the post's global id: the post and
// its first comments, which PostWithComments reads. More comments are fetchMore with
// $commentsAfter, on /graphql.
export const pageQuery = graphql(`
  query PostShowPage($id: ID!, $commentsAfter: String) {
    post(id: $id) {
      id
      name
      ...PostWithComments_Post
    }
  }
`)

export default function Show() {
  const query = usePageQuery(pageQuery)
  const post = query.data?.post

  return (
    <>
      <Head title={post?.name ?? 'Post not found'} />

      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← Feed
      </Link>

      {post ? (
        <div className="mt-4">
          <PostWithComments query={query} />
        </div>
      ) : (
        <p className="mt-4 text-muted-foreground">This post is not available.</p>
      )}
    </>
  )
}

Show.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>
