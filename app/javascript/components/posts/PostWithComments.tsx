import type { OperationVariables } from '@apollo/client'

import CommentItem from '@/components/comments/CommentItem'
import LoadMoreError from '@/components/LoadMoreError'
import LoadMoreSentinel from '@/components/LoadMoreSentinel'
import PostDetail from '@/components/posts/PostDetail'
import { type ConnectionSource, type FragmentType, getFragmentData, graphql, useConnection } from '@/graphql'

// The post, and its first comments, with $commentsAfter for the next ones (fetchMore, on
// /graphql): the operation that spreads this declares it.
export const PostWithComments_PostFragment = graphql(`
  fragment PostWithComments_Post on Post {
    id
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
`)

/**
 * A post as Instagram lays it out, with its comments: on the post's own page and in the
 * preview over a profile's grid. The page, or the preview, gives its query's result: the
 * next comments are that query's fetchMore, and the post and the comments are read from this
 * component's fragment.
 */
export default function PostWithComments({ query }: { query: ConnectionSource<{ post?: FragmentType<typeof PostWithComments_PostFragment> | null }, OperationVariables> }) {
  const post = getFragmentData(PostWithComments_PostFragment, query.data?.post)
  const comments = useConnection(query, (data) => getFragmentData(PostWithComments_PostFragment, data.post)?.comments)

  if (!post) return null

  return (
    <PostDetail post={post}>
      <ul>
        {comments.nodes.map((comment) => (
          <CommentItem key={comment.id} comment={comment} />
        ))}
      </ul>
      <LoadMoreSentinel enabled={comments.hasNext} loading={comments.loadingNext} onVisible={comments.fetchNext} />
      <LoadMoreError error={comments.error} onRetry={() => void comments.retryNext()} />
    </PostDetail>
  )
}
