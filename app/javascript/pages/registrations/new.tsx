import { Form, Head, Link } from '@inertiajs/react'
import type { ReactNode } from 'react'

import FieldError from '@/components/FieldError'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import AppLayout from '@/layouts/AppLayout'

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
          <Form action="/signup" method="post" className="space-y-4">
            {({ errors, processing }) => (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" autoComplete="name" required autoFocus />
                  <FieldError label="Name" messages={errors.name} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" autoComplete="email" required />
                  <FieldError label="Email" messages={errors.email} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" name="password" type="password" autoComplete="new-password" required />
                  <FieldError label="Password" messages={errors.password} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password_confirmation">Confirm password</Label>
                  <Input
                    id="password_confirmation"
                    name="password_confirmation"
                    type="password"
                    autoComplete="new-password"
                    required
                  />
                  <FieldError label="Password confirmation" messages={errors.password_confirmation} />
                </div>

                <Button type="submit" className="w-full" disabled={processing}>
                  {processing ? 'Creating account…' : 'Sign up'}
                </Button>
              </>
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
