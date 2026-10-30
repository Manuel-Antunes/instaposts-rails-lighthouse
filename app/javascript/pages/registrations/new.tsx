import { Form, Head, Link } from '@inertiajs/react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { railsErrors } from '@/lib/errors'
import AppLayout from '@/layouts/AppLayout'

// Inertia's Form posts to Devise with Rails' CSRF token; Rails' validation errors come
// back as Inertia's, per field.
export default function New() {
  return (
    <>
      <Head title="Sign up" />

      <Card className="mx-auto max-w-sm">
        <CardHeader>
          <CardTitle>Create your account</CardTitle>
          <CardDescription>Passwords need at least 8 characters.</CardDescription>
        </CardHeader>

        <CardContent>
          <Form action="/signup" method="post">
            {({ errors, processing }) => (
              <FieldGroup>
                <Field data-invalid={!!errors.name}>
                  <FieldLabel htmlFor="name">Name</FieldLabel>
                  <Input id="name" name="user[name]" autoComplete="name" required autoFocus aria-invalid={!!errors.name} />
                  <FieldError errors={railsErrors('Name', errors.name)} />
                </Field>

                <Field data-invalid={!!errors.username}>
                  <FieldLabel htmlFor="username">Username</FieldLabel>
                  <Input id="username" name="user[username]" autoCapitalize="none" autoComplete="username" spellCheck={false} placeholder="optional" aria-invalid={!!errors.username} />
                  <FieldDescription>Your page will be /@username. Leave it blank to get one from your email.</FieldDescription>
                  <FieldError errors={railsErrors('Username', errors.username)} />
                </Field>

                <Field data-invalid={!!errors.email}>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input id="email" name="user[email]" type="email" autoComplete="email" required aria-invalid={!!errors.email} />
                  <FieldError errors={railsErrors('Email', errors.email)} />
                </Field>

                <Field data-invalid={!!errors.password}>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input id="password" name="user[password]" type="password" autoComplete="new-password" required aria-invalid={!!errors.password} />
                  <FieldError errors={railsErrors('Password', errors.password)} />
                </Field>

                <Field data-invalid={!!errors.password_confirmation}>
                  <FieldLabel htmlFor="password_confirmation">Confirm password</FieldLabel>
                  <Input
                    id="password_confirmation"
                    name="user[password_confirmation]"
                    type="password"
                    autoComplete="new-password"
                    required
                    aria-invalid={!!errors.password_confirmation}
                  />
                  <FieldError errors={railsErrors('Password confirmation', errors.password_confirmation)} />
                </Field>

                <Button type="submit" className="w-full" disabled={processing}>
                  {processing ? 'Creating account…' : 'Sign up'}
                </Button>
              </FieldGroup>
            )}
          </Form>
        </CardContent>

        <CardFooter className="justify-center text-sm text-muted-foreground">
          Already have an account?&nbsp;
          <Link href="/login" className="font-medium text-foreground hover:underline">
            Sign in
          </Link>
        </CardFooter>
      </Card>
    </>
  )
}

New.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>
