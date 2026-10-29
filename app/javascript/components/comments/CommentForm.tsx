import { CombinedGraphQLErrors } from '@apollo/client'
import { useMutation } from '@apollo/client/react'
import { Link, usePage } from '@inertiajs/react'
import { type FormEvent, type RefObject, useState } from 'react'

import { addComment } from '@/components/comments/cache'
import { graphql } from '@/graphql'
import { cn } from '@/lib/utils'

const CREATE_COMMENT = graphql(`
  mutation CreateComment($postId: ID!, $body: String!) {
    createComment(input: { postId: $postId, body: $body }) {
      id
      ...CommentItem_Comment
      ...CommentLine_Comment
      post {
        id
        commentsCount
      }
    }
  }
`)

// The message of a validation error (Lighthouse's extensions.validation), else the error's.
function messageOf(error: unknown) {
  if (CombinedGraphQLErrors.is(error)) {
    const validation = error.errors[0]?.extensions?.validation as Record<string, string[]> | undefined
    return validation ? Object.values(validation).flat().join(' ') : error.message
  }
  return error instanceof Error ? error.message : 'Could not post the comment.'
}

/**
 * "Add a comment…": the new comment appears in the post's cached lists of comments
 * (addComment) and its count goes up, wherever they are shown.
 */
export default function CommentForm({ postId, inputRef, className }: { postId: string; inputRef?: RefObject<HTMLInputElement | null>; className?: string }) {
  const user = usePage().props.auth.user
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [create, { loading }] = useMutation(CREATE_COMMENT, {
    update(cache, { data }) {
      const comment = data?.createComment
      if (comment) addComment(cache, comment.post.id, comment.id)
    },
  })

  if (user && !user.confirmed) {
    return <p className={cn('text-sm text-muted-foreground', className)}>Confirm your email to comment.</p>
  }
  if (!user) {
    return (
      <p className={cn('text-sm text-muted-foreground', className)}>
        <Link href="/login" className="font-semibold text-foreground">
          Log in
        </Link>{' '}
        to like or comment.
      </p>
    )
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!body.trim() || loading) return

    setError(null)
    try {
      await create({ variables: { postId, body } })
      setBody('')
    } catch (e) {
      setError(messageOf(e))
    }
  }

  return (
    <form onSubmit={submit} className={cn('text-sm', className)}>
      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Add a comment…"
          aria-label="Add a comment"
          maxLength={2200}
          className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm placeholder:text-muted-foreground focus:ring-0"
        />
        <button type="submit" disabled={!body.trim() || loading} className="font-semibold text-sky-600 hover:text-sky-800 disabled:opacity-40">
          Post
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </form>
  )
}
