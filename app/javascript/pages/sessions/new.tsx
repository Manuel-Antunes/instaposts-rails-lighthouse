import { Form, Head, Link } from '@inertiajs/react'
import type { ReactNode } from 'react'

import OAuthButtons, { type Provider } from '@/components/OAuthButtons'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import AppLayout from '@/layouts/AppLayout'

// Inertia's Form posts to Devise with Rails' CSRF token; a wrong password comes back as a
// flash message, shown by the layout.
export default function New({ providers }: { providers: Provider[] }) {
  return (
    <>
      <Head title="Sign in" />

      <Card className="mx-auto max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Use your email and password, or an account you already have.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Form action="/login" method="post">
            {({ processing }) => (
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input id="email" name="user[email]" type="email" autoComplete="email" required autoFocus />
                </Field>

                <Field>
                  <div className="flex items-baseline justify-between">
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <Link href="/password/new" className="text-xs text-muted-foreground hover:text-foreground hover:underline">
                      Forgot your password?
                    </Link>
                  </div>
                  <Input id="password" name="user[password]" type="password" autoComplete="current-password" required />
                </Field>

                <Field orientation="horizontal">
                  <input id="remember_me" type="checkbox" name="user[remember_me]" value="1" className="rounded border-input" />
                  <FieldLabel htmlFor="remember_me" className="font-normal text-muted-foreground">
                    Remember me
                  </FieldLabel>
                </Field>

                <Button type="submit" className="w-full" disabled={processing}>
                  {processing ? 'Signing in…' : 'Sign in'}
                </Button>
              </FieldGroup>
            )}
          </Form>

          {providers.length > 0 && (
            <>
              <p className="text-center text-xs text-muted-foreground">or</p>
              <OAuthButtons providers={providers} />
            </>
          )}
        </CardContent>

        <CardFooter className="justify-center text-sm text-muted-foreground">
          No account yet?&nbsp;
          <Link href="/signup" className="font-medium text-foreground hover:underline">
            Sign up
          </Link>
        </CardFooter>
      </Card>
    </>
  )
}

New.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>
