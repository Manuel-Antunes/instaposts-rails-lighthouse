import { Head, Link } from '@inertiajs/react'
import type { ReactNode } from 'react'

import CommentItem from '@/components/comments/CommentItem'
import LoadMoreSentinel from '@/components/LoadMoreSentinel'
import PostDetail from '@/components/posts/PostDetail'
import { graphql, useConnection, usePageQuery } from '@/graphql'
import AppLayout from '@/layouts/AppLayout'

// Run by PostsController#show (render_preloaded) with the post's global id: the post and
// its first comments. More comments are fetchMore with $commentsAfter, on /graphql.
export const pageQuery = graphql(`
  query PostShowPage($id: ID!, $commentsAfter: String) {
    post(id: $id) {
      id
      name
      ...PostDetail_Post
      comments(first: 10, after: $commentsAfter) {
        edges {
          cursor
          node {
            id
            ...CommentItem_Comment
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
  const post = query.data?.post
  const comments = useConnection(query, (data) => data.post?.comments)

  return (
    <>
      <Head title={post?.name ?? 'Post not found'} />

      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← Feed
      </Link>

      {post ? (
        <div className="mt-4">
          <PostDetail post={post}>
            <ul>
              {comments.nodes.map((comment) => (
                <CommentItem key={comment.id} comment={comment} />
              ))}
            </ul>
            <LoadMoreSentinel enabled={comments.hasNext} loading={comments.loadingNext} onVisible={comments.fetchNext} />
          </PostDetail>
        </div>
      ) : (
        <p className="mt-4 text-muted-foreground">This post is not available.</p>
      )}
    </>
  )
}

Show.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>
