import ConfirmAction from '@/components/ConfirmAction'
import TimeAgo from '@/components/TimeAgo'
import { Button } from '@/components/ui/button'
import { TableCell, TableRow } from '@/components/ui/table'
import AuthorName from '@/components/users/AuthorName'
import { type FragmentType, getFragmentData, graphql } from '@/graphql'
import { useForceDeletePost, useRestorePost } from '@/hooks/use-posts'

export const TrashRow_PostFragment = graphql(`
  fragment TrashRow_Post on Post {
    id
    name
    deletedAt
    author {
      ...AuthorName_User
    }
  }
`)

/** A post of the trash: admins bring it back to the feed, or delete it for good. */
export default function TrashRow(props: { post: FragmentType<typeof TrashRow_PostFragment> }) {
  const post = getFragmentData(TrashRow_PostFragment, props.post)
  const [restore, { loading: restoring, error: restoreError }] = useRestorePost(post.id)
  const [forceDelete, { loading: deleting, error: deleteError }] = useForceDeletePost(post.id)
  const error = restoreError ?? deleteError

  return (
    <TableRow>
      <TableCell className="font-medium">{post.name}</TableCell>
      <TableCell>
        <AuthorName user={post.author} className="font-normal" />
      </TableCell>
      <TableCell className="text-muted-foreground">
        {post.deletedAt && <TimeAgo iso={post.deletedAt} />}
      </TableCell>
      <TableCell className="space-x-2 text-right">
        <Button size="sm" variant="outline" disabled={restoring} onClick={() => restore({ variables: { id: post.id } }).catch(() => undefined)}>
          Restore
        </Button>
        <ConfirmAction
          variant="button"
          label="Delete for good"
          confirmLabel="Delete for good?"
          pending={deleting}
          onConfirm={() => forceDelete({ variables: { id: post.id } }).catch(() => undefined)}
        />
        {error && <p className="text-xs text-destructive">{error.message}</p>}
      </TableCell>
    </TableRow>
  )
}
