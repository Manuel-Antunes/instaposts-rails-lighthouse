import { Form, Head, Link } from '@inertiajs/react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import AppLayout from '@/layouts/AppLayout'

// Inertia's Form posts to Devise with Rails' CSRF token. Devise's paranoid mode answers the
// same whether the email has an account or not, in a flash message.
export default function New() {
  return (
    <>
      <Head title="Confirm your email" />

      <Card className="mx-auto max-w-sm">
        <CardHeader>
          <CardTitle>Confirm your email</CardTitle>
          <CardDescription>We will email you the confirmation link again.</CardDescription>
        </CardHeader>

        <CardContent>
          <Form action="/confirmation" method="post">
            {({ processing }) => (
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input id="email" name="user[email]" type="email" autoComplete="email" required autoFocus />
                </Field>

                <Button type="submit" className="w-full" disabled={processing}>
                  {processing ? 'Sending…' : 'Send it again'}
                </Button>
              </FieldGroup>
            )}
          </Form>
        </CardContent>

        <CardFooter className="justify-center text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-foreground hover:underline">
            Back to sign in
          </Link>
        </CardFooter>
      </Card>
    </>
  )
}

New.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>
