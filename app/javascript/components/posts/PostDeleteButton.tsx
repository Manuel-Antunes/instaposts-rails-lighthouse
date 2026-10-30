import { router } from '@inertiajs/react'

import ConfirmAction from '@/components/ConfirmAction'
import { type FragmentType, getFragmentData, graphql } from '@/graphql'
import { useDeletePost } from '@/hooks/use-posts'

export const PostDeleteButton_PostFragment = graphql(`
  fragment PostDeleteButton_Post on Post {
    id
    viewerCanDelete
  }
`)

/**
 * "Delete", asked twice, for whoever may (PostPolicy#destroy?: the author or an admin):
 * the post goes to the trash and the user to the feed. Nothing for anyone else.
 */
export default function PostDeleteButton({ post }: { post: FragmentType<typeof PostDeleteButton_PostFragment> }) {
  const { id, viewerCanDelete } = getFragmentData(PostDeleteButton_PostFragment, post)
  const [deletePost, { loading, error }] = useDeletePost(id)

  if (!viewerCanDelete) return null

  const moveToTrash = async () => {
    const result = await deletePost({ variables: { id } }).catch(() => null)
    if (result?.data?.deletePost) router.visit('/')
  }

  return (
    <>
      <span className="ml-auto flex gap-3 text-xs">
        <ConfirmAction label="Delete" confirmLabel="Move to trash?" cancelLabel="Keep" pending={loading} onConfirm={moveToTrash} />
      </span>
      {error && <p className="basis-full text-xs text-red-600">{error.message}</p>}
    </>
  )
}
