import { CombinedGraphQLErrors } from '@apollo/client'
import type { FieldValues, UseFormReturn } from 'react-hook-form'

/**
 * Lighthouse's validation errors, by argument path (`input.name`, `assets[1].file`), as the
 * messages of the model that did not save; null when the error is anything else.
 */
export function validationErrors(error: unknown): Record<string, string[]> | null {
  if (!CombinedGraphQLErrors.is(error)) return null

  const validation = error.errors.find((e) => e.extensions?.validation)?.extensions?.validation
  return validation ? (validation as Record<string, string[]>) : null
}

/** What to tell the user about an error from /graphql, or from the network. */
export function errorMessage(error: unknown, fallback = 'Something went wrong. Try again.'): string {
  const validation = validationErrors(error)
  if (validation) return Object.values(validation).flat().join(' ')

  return error instanceof Error && error.message ? error.message : fallback
}

export type ServerErrorOptions = {
  // The form field a server error belongs to, when the name differs: `{ assets: 'media' }`.
  fields?: Record<string, string>
  fallback?: string
}

/**
 * Put an error of a mutation into a React Hook Form: a validation message goes under the
 * field it names (`input.name` is `name`), and anything else, or a field the form does not
 * have, goes to `errors.root.server`, which the form shows above its button.
 */
export function setServerErrors<T extends FieldValues>(form: UseFormReturn<T, unknown, FieldValues>, error: unknown, options: ServerErrorOptions = {}) {
  const fields = Object.keys(form.getValues())
  const rest: string[] = []

  for (const [path, messages] of Object.entries(validationErrors(error) ?? {})) {
    const key = path.replace(/^input\./, '').split(/[.[]/)[0]
    const field = options.fields?.[key] ?? key
    if (fields.includes(field)) form.setError(field as never, { type: 'server', message: messages.join(' ') })
    else rest.push(...messages)
  }

  const message = rest.length > 0 ? rest.join(' ') : validationErrors(error) ? null : errorMessage(error, options.fallback)
  if (message) form.setError('root.server', { type: 'server', message })
}

/**
 * Rails' messages for a field, from Inertia's `errors` ("has already been taken"), as the
 * `FieldError` of shadcn takes them: with the field's name in front.
 */
export function railsErrors(label: string, messages?: string | string[]): { message: string }[] {
  const list = Array.isArray(messages) ? messages : messages ? [messages] : []
  return list.map((message) => ({ message: `${label} ${message}` }))
}
