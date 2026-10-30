import { useState } from 'react'

import CommentEditForm from '@/components/comments/CommentEditForm'
import ConfirmAction from '@/components/ConfirmAction'
import RichText from '@/components/RichText'
import TimeAgo from '@/components/TimeAgo'
import AuthorAvatar from '@/components/users/AuthorAvatar'
import AuthorName from '@/components/users/AuthorName'
import { type FragmentType, getFragmentData, graphql } from '@/graphql'
import { useDeleteComment } from '@/hooks/use-comments'

export const CommentItem_CommentFragment = graphql(`
  fragment CommentItem_Comment on Comment {
    id
    body
    createdAt
    author {
      ...AuthorAvatar_User
      ...AuthorName_User
    }
    viewerCanUpdate
    viewerCanDelete
  }
`)

// A comment on the post's page: its author edits it, and its author, the post's author
// or an admin deletes it (CommentPolicy, through viewerCanUpdate/viewerCanDelete).
export default function CommentItem(props: { comment: FragmentType<typeof CommentItem_CommentFragment> }) {
  const comment = getFragmentData(CommentItem_CommentFragment, props.comment)
  const [editing, setEditing] = useState(false)
  const [deleteComment, { loading: deleting, error: deleteError }] = useDeleteComment()

  return (
    <li className="flex gap-3 py-2">
      <AuthorAvatar user={comment.author} />

      <div className="min-w-0 flex-1 text-sm">
        {editing ? (
          <CommentEditForm id={comment.id} body={comment.body} onDone={() => setEditing(false)} />
        ) : (
          <p className="wrap-break-word whitespace-pre-wrap">
            <AuthorName user={comment.author} /> <RichText text={comment.body} />
          </p>
        )}

        <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
          <TimeAgo iso={comment.createdAt} variant="short" />
          {comment.viewerCanUpdate && !editing && (
            <button type="button" onClick={() => setEditing(true)} className="font-semibold hover:text-foreground">
              Edit
            </button>
          )}
          {comment.viewerCanDelete && (
            <ConfirmAction
              label="Delete"
              confirmLabel="Delete comment?"
              cancelLabel="Keep"
              pending={deleting}
              onConfirm={() => deleteComment({ variables: { id: comment.id } }).catch(() => undefined)}
            />
          )}
        </div>

        {deleteError && <p className="mt-1 text-xs text-red-600">{deleteError.message}</p>}
      </div>
    </li>
  )
}
