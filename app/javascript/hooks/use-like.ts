import { useMutation } from '@apollo/client/react'
import { router } from '@inertiajs/react'
import { useCallback } from 'react'

import { type FragmentType, getFragmentData, graphql } from '@/graphql'
// The document of LikeButton's fragment (components/posts/LikeButton.tsx), the same one its
// graphql() returns: imported from codegen so the component and this hook don't import each other.
import { LikeButton_PostFragmentDoc } from '@/graphql/generated/graphql'
import { useAuth } from '@/hooks/use-auth'

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
export function useLike(postRef: FragmentType<typeof LikeButton_PostFragmentDoc>) {
  const post = getFragmentData(LikeButton_PostFragmentDoc, postRef)
  const { user } = useAuth()
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
