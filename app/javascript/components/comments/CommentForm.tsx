import { Link } from '@inertiajs/react'
import { type RefObject, useId } from 'react'
import { Controller } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/use-auth'
import { useCreateComment } from '@/hooks/use-comments'
import { useZodForm } from '@/hooks/use-zod-form'
import { cn } from '@/lib/utils'
import { COMMENT_MAX_LENGTH, commentSchema } from '@/schemas/comment'

/**
 * "Add a comment…": the new comment appears in the post's cached lists of comments and
 * its count goes up, wherever they are shown. Guests are asked to sign in, and users who
 * have not confirmed their email to confirm it.
 */
export default function CommentForm({ postId, inputRef, className }: { postId: string; inputRef?: RefObject<HTMLInputElement | null>; className?: string }) {
  const { user } = useAuth()
  const id = useId()
  const { form, submit } = useZodForm(commentSchema, { defaultValues: { body: '' } })
  const [createComment] = useCreateComment()

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

  const onSubmit = submit(async (values) => {
    await createComment({ variables: { postId, body: values.body } })
    form.reset()
  })

  return (
    <form onSubmit={onSubmit} className={cn('text-sm', className)}>
      <Controller
        name="body"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <div className="flex items-center gap-3">
              <FieldLabel htmlFor={id} className="sr-only">
                Add a comment
              </FieldLabel>
              <Input
                {...field}
                ref={(element) => {
                  field.ref(element)
                  if (inputRef) inputRef.current = element
                }}
                id={id}
                placeholder="Add a comment…"
                maxLength={COMMENT_MAX_LENGTH}
                autoComplete="off"
                aria-invalid={fieldState.invalid}
                className="h-auto border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 dark:bg-transparent"
              />
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="px-1 font-semibold text-sky-600 hover:bg-transparent hover:text-sky-800"
                disabled={!field.value.trim() || form.formState.isSubmitting}
              >
                Post
              </Button>
            </div>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <FieldError errors={[form.formState.errors.root?.server]} />
    </form>
  )
}
