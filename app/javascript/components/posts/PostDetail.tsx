import { type ReactNode, useRef } from 'react'

import CommentForm from '@/components/comments/CommentForm'
import PostActions from '@/components/posts/PostActions'
import PostCaption from '@/components/posts/PostCaption'
import PostDeleteButton from '@/components/posts/PostDeleteButton'
import PostMedia from '@/components/posts/PostMedia'
import TimeAgo from '@/components/TimeAgo'
import AuthorAvatar from '@/components/users/AuthorAvatar'
import AuthorName from '@/components/users/AuthorName'
import { type FragmentType, getFragmentData, graphql } from '@/graphql'

export const PostDetail_PostFragment = graphql(`
  fragment PostDetail_Post on Post {
    id
    createdAt
    author {
      ...AuthorAvatar_User
      ...AuthorName_User
    }
    ...PostMedia_Post
    ...PostActions_Post
    ...PostCaption_Post
    ...PostDeleteButton_Post
  }
`)

// A post on its own page, as Instagram lays one out: the square on the left, and on the
// right the author, the caption, the comments (children), the actions and a field to comment.
export default function PostDetail(props: { post: FragmentType<typeof PostDetail_PostFragment>; children: ReactNode }) {
  const post = getFragmentData(PostDetail_PostFragment, props.post)
  const commentInput = useRef<HTMLInputElement>(null)

  return (
    <article className="overflow-hidden border bg-background md:grid md:grid-cols-[minmax(0,1fr)_340px] md:rounded-lg">
      <PostMedia post={post} className="md:aspect-auto md:min-h-135" />

      <div className="flex max-h-160 flex-col md:border-l">
        <header className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
          <AuthorAvatar user={post.author} />
          <AuthorName user={post.author} className="text-sm" />
          <PostDeleteButton post={post} />
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <div className="flex gap-3 pb-3">
            <AuthorAvatar user={post.author} />
            <PostCaption post={post} />
          </div>
          {props.children}
        </div>

        <div className="space-y-1.5 border-t px-4 pt-3 pb-3">
          <PostActions post={post} onComment={() => commentInput.current?.focus()} />
          <TimeAgo iso={post.createdAt} className="block text-[10px] tracking-wide text-muted-foreground uppercase" />
        </div>

        <CommentForm postId={post.id} inputRef={commentInput} className="border-t px-4 py-3" />
      </div>
    </article>
  )
}
