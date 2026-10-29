import { Form, Head } from '@inertiajs/react'
import type { ReactNode } from 'react'

import FieldError from '@/components/FieldError'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import AppLayout from '@/layouts/AppLayout'

// Reached from the emailed link; `token` is has_secure_password's reset token.
export default function Edit({ token }: { token: string }) {
  return (
    <>
      <Head title="Choose a new password" />

      <Card className="mx-auto max-w-sm">
        <CardHeader>
          <CardTitle>Choose a new password</CardTitle>
          <CardDescription>At least 8 characters.</CardDescription>
        </CardHeader>

        <CardContent>
          <Form action={`/passwords/${token}`} method="patch" className="space-y-4">
            {({ errors, processing }) => (
              <>
                <div className="space-y-2">
                  <Label htmlFor="password">New password</Label>
                  <Input id="password" name="password" type="password" autoComplete="new-password" required autoFocus />
                  <FieldError label="Password" messages={errors.password} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password_confirmation">Confirm it</Label>
                  <Input id="password_confirmation" name="password_confirmation" type="password" autoComplete="new-password" required />
                  <FieldError label="Password confirmation" messages={errors.password_confirmation} />
                </div>

                <Button type="submit" className="w-full" disabled={processing}>
                  {processing ? 'Saving…' : 'Save my new password'}
                </Button>
              </>
            )}
          </Form>
        </CardContent>
      </Card>
    </>
  )
}

Edit.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>
