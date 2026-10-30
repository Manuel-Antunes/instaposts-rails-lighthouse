import { MessageCircle } from 'lucide-react'

import LikeButton from '@/components/posts/LikeButton'
import LikesLine from '@/components/posts/LikesLine'
import ShareButton from '@/components/ShareButton'
import { type FragmentType, getFragmentData, graphql } from '@/graphql'

export const PostActions_PostFragment = graphql(`
  fragment PostActions_Post on Post {
    path
    name
    likesCount
    ...LikeButton_Post
  }
`)

/**
 * What a viewer does with a post, as Instagram lays it out: the heart, the speech bubble
 * (`onComment` takes them to the field to comment) and the paper plane, then how many
 * like it. Two elements in a row: the container spaces them.
 */
export default function PostActions({ post, onComment }: { post: FragmentType<typeof PostActions_PostFragment>; onComment: () => void }) {
  const actions = getFragmentData(PostActions_PostFragment, post)

  return (
    <>
      <div className="flex items-center gap-4">
        <LikeButton post={actions} />
        <button type="button" onClick={onComment} aria-label="Comment" className="-m-2 p-2">
          <MessageCircle className="size-6 -scale-x-100 hover:text-muted-foreground" />
        </button>
        <ShareButton path={actions.path} title={actions.name} />
      </div>
      <LikesLine count={actions.likesCount} />
    </>
  )
}
