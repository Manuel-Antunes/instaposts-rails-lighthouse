import { zodResolver } from '@hookform/resolvers/zod'
import { type FieldValues, type Resolver, useForm, type UseFormProps } from 'react-hook-form'
import type { z } from 'zod'

import { setServerErrors, type ServerErrorOptions } from '@/lib/errors'

/**
 * A React Hook Form validated by a zod schema (the types come from the schema: what the
 * fields hold, and what `submit` hands over once it passes), and a `submit` that also
 * puts the errors a mutation throws into the form (setServerErrors).
 *
 *   const { form, submit } = useZodForm(commentSchema, { defaultValues: { body: '' } })
 *   <form onSubmit={submit(async ({ body }) => { await createComment(body) })}>
 */
export function useZodForm<S extends z.ZodType<FieldValues, FieldValues>>(
  schema: S,
  options: Omit<UseFormProps<z.input<S>, unknown, z.output<S>>, 'resolver'> & { serverErrors?: ServerErrorOptions } = {},
) {
  const { serverErrors, ...formOptions } = options
  // The resolver can't infer through the generic: it is the schema's, typed by it.
  const resolver = zodResolver(schema) as unknown as Resolver<z.input<S>, unknown, z.output<S>>
  const form = useForm<z.input<S>, unknown, z.output<S>>({ resolver, ...formOptions })

  const submit = (onValid: (values: z.output<S>) => unknown) =>
    form.handleSubmit(async (values) => {
      try {
        await onValid(values)
      } catch (error) {
        setServerErrors(form, error, serverErrors)
      }
    })

  return { form, submit }
}
