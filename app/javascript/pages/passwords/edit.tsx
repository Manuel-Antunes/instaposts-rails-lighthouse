import { Form, Head } from '@inertiajs/react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { railsErrors } from '@/lib/errors'
import AppLayout from '@/layouts/AppLayout'

// Reached from the emailed link, with Devise's reset token. Inertia's Form patches it back
// with Rails' CSRF token.
export default function Edit({ reset_password_token }: { reset_password_token: string }) {
  return (
    <>
      <Head title="Choose a new password" />

      <Card className="mx-auto max-w-sm">
        <CardHeader>
          <CardTitle>Choose a new password</CardTitle>
          <CardDescription>At least 8 characters.</CardDescription>
        </CardHeader>

        <CardContent>
          <Form action="/password" method="patch">
            {({ errors, processing }) => (
              <FieldGroup>
                <input type="hidden" name="user[reset_password_token]" value={reset_password_token} />

                <Field data-invalid={!!errors.password}>
                  <FieldLabel htmlFor="password">New password</FieldLabel>
                  <Input id="password" name="user[password]" type="password" autoComplete="new-password" required autoFocus aria-invalid={!!errors.password} />
                  <FieldError errors={railsErrors('Password', errors.password)} />
                </Field>

                <Field data-invalid={!!errors.password_confirmation}>
                  <FieldLabel htmlFor="password_confirmation">Confirm it</FieldLabel>
                  <Input id="password_confirmation" name="user[password_confirmation]" type="password" autoComplete="new-password" required aria-invalid={!!errors.password_confirmation} />
                  <FieldError errors={railsErrors('Password confirmation', errors.password_confirmation)} />
                </Field>

                <Button type="submit" className="w-full" disabled={processing}>
                  {processing ? 'Saving…' : 'Save my new password'}
                </Button>
              </FieldGroup>
            )}
          </Form>
        </CardContent>
      </Card>
    </>
  )
}

Edit.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>
