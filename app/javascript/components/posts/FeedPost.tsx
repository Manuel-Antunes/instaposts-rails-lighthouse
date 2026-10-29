import { Link } from '@inertiajs/react'
import { MessageCircle } from 'lucide-react'
import { useRef, useState } from 'react'

import CommentForm from '@/components/comments/CommentForm'
import CommentLine from '@/components/comments/CommentLine'
import LikeButton, { useLike } from '@/components/posts/LikeButton'
import LikesLine from '@/components/posts/LikesLine'
import PostMedia from '@/components/posts/PostMedia'
import UserAvatar from '@/components/UserAvatar'
import { type FragmentType, getFragmentData, graphql } from '@/graphql'
import { shortTimeAgo, timeAgo } from '@/lib/time'

export const FeedPost_PostFragment = graphql(`
  fragment FeedPost_Post on Post {
    id
    path
    name
    content
    createdAt
    likesCount
    commentsCount
    author {
      id
      name
      avatarUrl
    }
    ...LikeButton_Post
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
  const like = useLike(post)
  const commentInput = useRef<HTMLInputElement>(null)
  const [expanded, setExpanded] = useState(false)
  const href = post.path
  const author = post.author?.name ?? 'Unknown author'
  // Newest first from the server, shown oldest first as under a post.
  const comments = [...(post.latestComments.edges ?? [])].reverse()

  return (
    <article className="border-b bg-background pb-3 sm:rounded-lg sm:border">
      <header className="flex items-center gap-3 px-3 py-2.5">
        <UserAvatar name={author} src={post.author?.avatarUrl} className="ring-2 ring-pink-500 ring-offset-2" />
        <p className="text-sm">
          <span className="font-semibold">{author}</span>
          <span className="text-muted-foreground">
            {' · '}
            <time dateTime={post.createdAt} suppressHydrationWarning>
              {shortTimeAgo(post.createdAt)}
            </time>
          </span>
        </p>
      </header>

      <PostMedia id={post.id} title={post.name} onDoubleTap={() => like.set(true)} />

      <div className="space-y-1.5 px-3 pt-3">
        <div className="flex items-center gap-4">
          <LikeButton post={post} />
          <button type="button" onClick={() => commentInput.current?.focus()} aria-label="Comment" className="-m-2 p-2">
            <MessageCircle className="size-6 -scale-x-100 hover:text-muted-foreground" />
          </button>
        </div>

        <LikesLine count={post.likesCount} />

        <p className={expanded ? 'text-sm whitespace-pre-wrap' : 'line-clamp-2 text-sm'}>
          <span className="font-semibold">{author}</span> {post.content}
        </p>
        {!expanded && post.content.length > 120 && (
          <button type="button" onClick={() => setExpanded(true)} className="text-sm text-muted-foreground">
            more
          </button>
        )}

        {post.commentsCount > comments.length && (
          <Link href={href} className="block text-sm text-muted-foreground">
            View all {post.commentsCount} comments
          </Link>
        )}
        {comments.map((edge) => edge?.node && <CommentLine key={edge.node.id} comment={edge.node} />)}

        <Link href={href} className="block text-[10px] tracking-wide text-muted-foreground uppercase">
          <time dateTime={post.createdAt} suppressHydrationWarning>
            {timeAgo(post.createdAt)}
          </time>
        </Link>

        <CommentForm postId={post.id} inputRef={commentInput} className="border-t pt-3" />
      </div>
    </article>
  )
}
