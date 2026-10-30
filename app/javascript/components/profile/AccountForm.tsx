import { Form } from '@inertiajs/react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { railsErrors } from '@/lib/errors'

/**
 * Email and password: a form Inertia sends to Users::RegistrationsController#update (Devise)
 * with Rails' CSRF token, and whose errors come back as Inertia's. Devise asks for the
 * current password, unless the user only signs in with a provider and has none.
 */
export default function AccountForm({ email, hasPassword, unconfirmedEmail }: { email: string; hasPassword: boolean; unconfirmedEmail: string | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
        <CardDescription>
          {hasPassword ? 'Change your email or password. Confirm with your current password.' : 'Change your email, or set a password to sign in with it too.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {unconfirmedEmail && (
          <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">Waiting for you to confirm {unconfirmedEmail}: we sent the link there.</p>
        )}

        <Form action="/account" method="patch" resetOnSuccess={['user[password]', 'user[password_confirmation]', 'user[current_password]']}>
          {({ errors, processing }) => (
            <FieldGroup>
              <Field data-invalid={!!errors.email}>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input id="email" name="user[email]" type="email" defaultValue={email} autoComplete="email" required aria-invalid={!!errors.email} />
                <FieldError errors={railsErrors('Email', errors.email)} />
              </Field>

              <Field data-invalid={!!errors.password}>
                <FieldLabel htmlFor="password">New password</FieldLabel>
                <Input id="password" name="user[password]" type="password" autoComplete="new-password" placeholder="Leave blank to keep it" aria-invalid={!!errors.password} />
                <FieldError errors={railsErrors('Password', errors.password)} />
              </Field>

              <Field data-invalid={!!errors.password_confirmation}>
                <FieldLabel htmlFor="password_confirmation">Confirm the new password</FieldLabel>
                <Input id="password_confirmation" name="user[password_confirmation]" type="password" autoComplete="new-password" aria-invalid={!!errors.password_confirmation} />
                <FieldError errors={railsErrors('Password confirmation', errors.password_confirmation)} />
              </Field>

              {hasPassword && (
                <Field data-invalid={!!errors.current_password}>
                  <FieldLabel htmlFor="current_password">Current password</FieldLabel>
                  <Input id="current_password" name="user[current_password]" type="password" autoComplete="current-password" required aria-invalid={!!errors.current_password} />
                  <FieldError errors={railsErrors('Current password', errors.current_password)} />
                </Field>
              )}

              <Button type="submit" disabled={processing}>
                {processing ? 'Saving…' : 'Save account'}
              </Button>
            </FieldGroup>
          )}
        </Form>
      </CardContent>
    </Card>
  )
}
