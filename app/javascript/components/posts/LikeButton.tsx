import { useMutation } from '@apollo/client/react'
import { router, usePage } from '@inertiajs/react'
import { Heart } from 'lucide-react'
import { useCallback } from 'react'

import { type FragmentType, getFragmentData, graphql } from '@/graphql'
import { cn } from '@/lib/utils'

export const LikeButton_PostFragment = graphql(`
  fragment LikeButton_Post on Post {
    id
    likesCount
    viewerHasLiked
  }
`)

const LIKE_POST = graphql(`
  mutation LikePost($id: ID!) {
    likePost(id: $id) {
      id
      likesCount
      viewerHasLiked
    }
  }
`)

const UNLIKE_POST = graphql(`
  mutation UnlikePost($id: ID!) {
    unlikePost(id: $id) {
      id
      likesCount
      viewerHasLiked
    }
  }
`)

/**
 * Like and unlike the post, optimistically: the heart and the count change at once, and
 * every view of the post with them (the Post is one object in Apollo's cache). Guests go
 * to the login page; users who have not confirmed their email cannot like yet.
 */
export function useLike(postRef: FragmentType<typeof LikeButton_PostFragment>) {
  const post = getFragmentData(LikeButton_PostFragment, postRef)
  const user = usePage().props.auth.user
  const [like] = useMutation(LIKE_POST)
  const [unlike] = useMutation(UNLIKE_POST)

  const set = useCallback(
    (liked: boolean) => {
      if (!user) return router.visit('/login')
      // Unconfirmed: the server would refuse (PostPolicy#like?); the banner says why.
      if (!user.confirmed || liked === post.viewerHasLiked) return

      const optimistic = {
        __typename: 'Post' as const,
        id: post.id,
        likesCount: post.likesCount + (liked ? 1 : -1),
        viewerHasLiked: liked,
      }
      const variables = { id: post.id }
      void (liked
        ? like({ variables, optimisticResponse: { __typename: 'Mutation', likePost: optimistic } })
        : unlike({ variables, optimisticResponse: { __typename: 'Mutation', unlikePost: optimistic } })
      ).catch(() => undefined)
    },
    [user, post.id, post.likesCount, post.viewerHasLiked, like, unlike],
  )

  return { liked: post.viewerHasLiked, set, toggle: () => set(!post.viewerHasLiked) }
}

export default function LikeButton({ post }: { post: FragmentType<typeof LikeButton_PostFragment> }) {
  const { liked, toggle } = useLike(post)

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={liked}
      aria-label={liked ? 'Unlike' : 'Like'}
      className="-m-2 p-2 transition-transform active:scale-90"
    >
      <Heart className={cn('size-6', liked ? 'fill-red-500 text-red-500' : 'hover:text-muted-foreground')} />
    </button>
  )
}
