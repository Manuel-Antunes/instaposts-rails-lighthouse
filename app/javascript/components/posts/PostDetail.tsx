import { useMutation } from '@apollo/client/react'
import { router } from '@inertiajs/react'
import { MessageCircle } from 'lucide-react'
import { type ReactNode, useRef, useState } from 'react'

import CommentForm from '@/components/comments/CommentForm'
import LikeButton, { useLike } from '@/components/posts/LikeButton'
import LikesLine from '@/components/posts/LikesLine'
import PostMedia from '@/components/posts/PostMedia'
import UserAvatar from '@/components/UserAvatar'
import { type FragmentType, getFragmentData, graphql } from '@/graphql'
import { timeAgo } from '@/lib/time'

export const PostDetail_PostFragment = graphql(`
  fragment PostDetail_Post on Post {
    id
    name
    content
    createdAt
    likesCount
    commentsCount
    viewerCanDelete
    author {
      id
      name
      avatarUrl
    }
    ...LikeButton_Post
  }
`)

// To the trash (Mutations::DeletePost, a discard): admins restore it or delete it for good.
const DELETE_POST = graphql(`
  mutation DeletePost($id: ID!) {
    deletePost(id: $id) {
      id
      deletedAt
    }
  }
`)

// A post on its own page, as Instagram lays one out: the square on the left, and on the
// right the author, the caption, the comments (children), the actions and a field to comment.
export default function PostDetail(props: { post: FragmentType<typeof PostDetail_PostFragment>; children: ReactNode }) {
  const post = getFragmentData(PostDetail_PostFragment, props.post)
  const like = useLike(post)
  const commentInput = useRef<HTMLInputElement>(null)
  const author = post.author?.name ?? 'Unknown author'
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deletePost, { loading: deleting, error: deleteError }] = useMutation(DELETE_POST, {
    // Out of every cached list (the feed); the feed's next visit asks Rails again anyway.
    update(cache) {
      cache.evict({ id: cache.identify({ __typename: 'Post', id: post.id }) })
      cache.gc()
    },
  })
  const moveToTrash = async () => {
    const result = await deletePost({ variables: { id: post.id } }).catch(() => null)
    if (result?.data?.deletePost) router.visit('/')
  }

  return (
    <article className="overflow-hidden border bg-background md:grid md:grid-cols-[minmax(0,1fr)_340px] md:rounded-lg">
      <PostMedia id={post.id} title={post.name} onDoubleTap={() => like.set(true)} className="md:aspect-auto md:min-h-[540px]" />

      <div className="flex max-h-[640px] flex-col md:border-l">
        <header className="flex items-center gap-3 border-b px-4 py-3">
          <UserAvatar name={author} src={post.author?.avatarUrl} />
          <span className="text-sm font-semibold">{author}</span>
          {post.viewerCanDelete && (
            <span className="ml-auto flex gap-3 text-xs font-semibold">
              {confirmingDelete ? (
                <>
                  <button type="button" disabled={deleting} onClick={moveToTrash} className="text-red-600">
                    Move to trash?
                  </button>
                  <button type="button" onClick={() => setConfirmingDelete(false)} className="text-muted-foreground">
                    Keep
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => setConfirmingDelete(true)} className="text-muted-foreground hover:text-foreground">
                  Delete
                </button>
              )}
            </span>
          )}
        </header>
        {deleteError && <p className="px-4 pt-2 text-xs text-red-600">{deleteError.message}</p>}

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <div className="flex gap-3 pb-3">
            <UserAvatar name={author} src={post.author?.avatarUrl} />
            <p className="min-w-0 text-sm break-words whitespace-pre-wrap">
              <span className="font-semibold">{author}</span> {post.content}
            </p>
          </div>
          {props.children}
        </div>

        <div className="space-y-1.5 border-t px-4 pt-3 pb-3">
          <div className="flex items-center gap-4">
            <LikeButton post={post} />
            <button type="button" onClick={() => commentInput.current?.focus()} aria-label="Comment" className="-m-2 p-2">
              <MessageCircle className="size-6 -scale-x-100 hover:text-muted-foreground" />
            </button>
          </div>
          <LikesLine count={post.likesCount} />
          <time dateTime={post.createdAt} suppressHydrationWarning className="block text-[10px] tracking-wide text-muted-foreground uppercase">
            {timeAgo(post.createdAt)}
          </time>
        </div>

        <CommentForm postId={post.id} inputRef={commentInput} className="border-t px-4 py-3" />
      </div>
    </article>
  )
}
