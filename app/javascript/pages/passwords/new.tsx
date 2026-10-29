import { Form, Head, Link } from '@inertiajs/react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import AppLayout from '@/layouts/AppLayout'

export default function New() {
  return (
    <>
      <Head title="Forgot your password?" />

      <Card className="mx-auto max-w-sm">
        <CardHeader>
          <CardTitle>Forgot your password?</CardTitle>
          <CardDescription>We will email you a link to choose a new one.</CardDescription>
        </CardHeader>

        <CardContent>
          <Form action="/passwords" method="post" className="space-y-4">
            {({ processing }) => (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
                </div>

                <Button type="submit" className="w-full" disabled={processing}>
                  {processing ? 'Sending…' : 'Send me the link'}
                </Button>
              </>
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
