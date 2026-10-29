import { useMutation } from '@apollo/client/react'
import { useState } from 'react'

import UserAvatar from '@/components/UserAvatar'
import { removeComment } from '@/components/comments/cache'
import { type FragmentType, getFragmentData, graphql } from '@/graphql'
import { shortTimeAgo } from '@/lib/time'

export const CommentItem_CommentFragment = graphql(`
  fragment CommentItem_Comment on Comment {
    id
    body
    createdAt
    author {
      id
      name
      avatarUrl
    }
    viewerCanUpdate
    viewerCanDelete
  }
`)

const UPDATE_COMMENT = graphql(`
  mutation UpdateComment($id: ID!, $body: String!) {
    updateComment(input: { id: $id, body: $body }) {
      id
      body
    }
  }
`)

const DELETE_COMMENT = graphql(`
  mutation DeleteComment($id: ID!) {
    deleteComment(id: $id) {
      id
      post {
        id
        commentsCount
      }
    }
  }
`)

// A comment on the post's page: its author edits it, and its author, the post's author
// or an admin deletes it (CommentPolicy, through viewerCanUpdate/viewerCanDelete).
export default function CommentItem(props: { comment: FragmentType<typeof CommentItem_CommentFragment> }) {
  const comment = getFragmentData(CommentItem_CommentFragment, props.comment)
  const [editing, setEditing] = useState(false)
  const [body, setBody] = useState(comment.body)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const [update, { loading: saving, error: updateError }] = useMutation(UPDATE_COMMENT)
  const [destroy, { loading: deleting, error: deleteError }] = useMutation(DELETE_COMMENT, {
    update(cache, { data }) {
      const deleted = data?.deleteComment
      if (deleted) removeComment(cache, deleted.post.id, deleted.id)
    },
  })

  const save = async () => {
    const result = await update({ variables: { id: comment.id, body } }).catch(() => null)
    if (result?.data?.updateComment) setEditing(false)
  }

  return (
    <li className="flex gap-3 py-2">
      <UserAvatar name={comment.author.name} src={comment.author.avatarUrl} />

      <div className="min-w-0 flex-1 text-sm">
        {editing ? (
          <div className="space-y-2">
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              aria-label="Edit comment"
              rows={2}
              autoFocus
              className="w-full rounded-md border px-2 py-1 text-sm"
            />
            <div className="flex gap-3 text-xs font-semibold">
              <button type="button" onClick={save} disabled={saving || !body.trim()} className="text-sky-600 disabled:opacity-50">
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false)
                  setBody(comment.body)
                }}
                className="text-muted-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="break-words whitespace-pre-wrap">
            <span className="font-semibold">{comment.author.name}</span> {comment.body}
          </p>
        )}

        <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
          <time dateTime={comment.createdAt} suppressHydrationWarning>
            {shortTimeAgo(comment.createdAt)}
          </time>
          {comment.viewerCanUpdate && !editing && (
            <button type="button" onClick={() => setEditing(true)} className="font-semibold hover:text-foreground">
              Edit
            </button>
          )}
          {comment.viewerCanDelete &&
            (confirmingDelete ? (
              <>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => destroy({ variables: { id: comment.id } }).catch(() => undefined)}
                  className="font-semibold text-red-600"
                >
                  Delete comment?
                </button>
                <button type="button" onClick={() => setConfirmingDelete(false)} className="font-semibold hover:text-foreground">
                  Keep
                </button>
              </>
            ) : (
              <button type="button" onClick={() => setConfirmingDelete(true)} className="font-semibold hover:text-foreground">
                Delete
              </button>
            ))}
        </div>

        {(updateError ?? deleteError) && <p className="mt-1 text-xs text-red-600">{(updateError ?? deleteError)?.message}</p>}
      </div>
    </li>
  )
}
