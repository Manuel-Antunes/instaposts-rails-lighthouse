import { Form, Head, Link } from '@inertiajs/react'
import type { ReactNode } from 'react'

import OAuthButtons, { type Provider } from '@/components/OAuthButtons'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import AppLayout from '@/layouts/AppLayout'

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
          <Form action="/login" method="post" className="space-y-4">
            {({ processing }) => (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
                </div>

                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link href="/passwords/new" className="text-xs text-muted-foreground hover:text-foreground hover:underline">
                      Forgot your password?
                    </Link>
                  </div>
                  <Input id="password" name="password" type="password" autoComplete="current-password" required />
                </div>

                <Button type="submit" className="w-full" disabled={processing}>
                  {processing ? 'Signing in…' : 'Sign in'}
                </Button>
              </>
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
