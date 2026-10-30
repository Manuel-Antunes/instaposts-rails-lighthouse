import { Controller } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { useUpdateComment } from '@/hooks/use-comments'
import { useZodForm } from '@/hooks/use-zod-form'
import { commentSchema } from '@/schemas/comment'

/** The text of a comment, to edit in place: Save sends it, Cancel gives the text back. */
export default function CommentEditForm({ id, body, onDone }: { id: string; body: string; onDone: () => void }) {
  const { form, submit } = useZodForm(commentSchema, { defaultValues: { body } })
  const [updateComment] = useUpdateComment()

  const onSubmit = submit(async (values) => {
    await updateComment({ variables: { id, body: values.body } })
    onDone()
  })

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <Controller
        name="body"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={`edit-${id}`} className="sr-only">
              Edit comment
            </FieldLabel>
            <Textarea {...field} id={`edit-${id}`} rows={2} autoFocus aria-invalid={fieldState.invalid} />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <FieldError errors={[form.formState.errors.root?.server]} />

      <div className="flex gap-1 text-xs font-semibold">
        <Button type="submit" size="xs" variant="ghost" className="text-sky-600" disabled={form.formState.isSubmitting}>
          Save
        </Button>
        <Button type="button" size="xs" variant="ghost" className="text-muted-foreground" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
