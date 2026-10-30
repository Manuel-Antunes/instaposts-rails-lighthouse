import { Link } from '@inertiajs/react'
import { useRef } from 'react'

import CommentForm from '@/components/comments/CommentForm'
import CommentLine from '@/components/comments/CommentLine'
import PostActions from '@/components/posts/PostActions'
import PostCaption from '@/components/posts/PostCaption'
import PostMedia from '@/components/posts/PostMedia'
import TimeAgo from '@/components/TimeAgo'
import AuthorAvatar from '@/components/users/AuthorAvatar'
import AuthorName from '@/components/users/AuthorName'
import { type FragmentType, getFragmentData, graphql } from '@/graphql'

export const FeedPost_PostFragment = graphql(`
  fragment FeedPost_Post on Post {
    id
    path
    createdAt
    commentsCount
    author {
      ...AuthorAvatar_User
      ...AuthorName_User
    }
    ...PostMedia_Post
    ...PostActions_Post
    ...PostCaption_Post
    latestComments: comments(first: 2, orderBy: [{ column: CREATED_AT, order: DESC }]) {
      edges {
        node {
          id
          ...CommentLine_Comment
        }
      }
    }
  }
`)

// A post in the feed, as Instagram shows one: author, square, actions, likes, caption,
// the latest comments and a field to add one.
export default function FeedPost(props: { post: FragmentType<typeof FeedPost_PostFragment> }) {
  const post = getFragmentData(FeedPost_PostFragment, props.post)
  const commentInput = useRef<HTMLInputElement>(null)
  // Newest first from the server, shown oldest first as under a post.
  const comments = [...(post.latestComments.edges ?? [])].reverse()

  return (
    <article className="border-b bg-background pb-3 sm:rounded-lg sm:border">
      <header className="flex items-center gap-3 px-3 py-2.5">
        <AuthorAvatar user={post.author} className="ring-2 ring-pink-500 ring-offset-2" />
        <p className="text-sm">
          <AuthorName user={post.author} />
          <span className="text-muted-foreground">
            {' · '}
            <TimeAgo iso={post.createdAt} variant="short" />
          </span>
        </p>
      </header>

      <PostMedia post={post} />

      <div className="space-y-1.5 px-3 pt-3">
        <PostActions post={post} onComment={() => commentInput.current?.focus()} />
        <PostCaption post={post} clamp />

        {post.commentsCount > comments.length && (
          <Link href={post.path} className="block text-sm text-muted-foreground">
            View all {post.commentsCount} comments
          </Link>
        )}
        {comments.map((edge) => edge?.node && <CommentLine key={edge.node.id} comment={edge.node} />)}

        <Link href={post.path} className="block text-[10px] tracking-wide text-muted-foreground uppercase">
          <TimeAgo iso={post.createdAt} />
        </Link>

        <CommentForm postId={post.id} inputRef={commentInput} className="border-t pt-3" />
      </div>
    </article>
  )
}
