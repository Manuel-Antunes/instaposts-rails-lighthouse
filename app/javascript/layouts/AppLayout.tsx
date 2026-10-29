import { useApolloClient } from '@apollo/client/react'
import { Link, router, usePage } from '@inertiajs/react'
import type { ReactNode } from 'react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

export default function AppLayout({ children }: { children: ReactNode }) {
  const {
    props: { auth },
    flash,
  } = usePage()
  const apolloClient = useApolloClient()

  // Whatever Apollo cached belongs to the user who just left.
  const signOut = () => router.delete('/logout', { onSuccess: () => void apolloClient.clearStore() })

  return (
    <div className="min-h-screen bg-muted/30 text-foreground">
      <header className="border-b bg-background">
        <nav className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-lg font-semibold">
              Blog Rails
            </Link>
            {auth.user?.role === 'admin' && (
              <>
                <Link href="/admin/users" className="text-sm text-muted-foreground hover:text-foreground">
                  Admin
                </Link>
                <Link href="/admin/posts" className="text-sm text-muted-foreground hover:text-foreground">
                  Trash
                </Link>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 text-sm">
            {auth.user?.can_create_post && (
              <Button asChild size="sm">
                <Link href="/posts/new">New post</Link>
              </Button>
            )}

            {auth.user ? (
              <>
                <span className="text-muted-foreground">{auth.user.name}</span>
                <Button variant="ghost" size="sm" onClick={signOut}>
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/signup">Sign up</Link>
                </Button>
              </>
            )}
          </div>
        </nav>
      </header>

      {auth.user && !auth.user.confirmed && (
        <div className="border-b bg-amber-50 text-amber-900">
          <p className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-2 px-4 py-2 text-sm">
            Confirm your email to like and comment: we sent a link to {auth.user.email}.
            <button type="button" onClick={() => router.post('/confirmation')} className="font-semibold underline">
              Send it again
            </button>
          </p>
        </div>
      )}

      <main className="mx-auto max-w-4xl px-4 py-8">
        {flash.notice && (
          <Alert className="mb-4">
            <AlertDescription>{flash.notice}</AlertDescription>
          </Alert>
        )}
        {flash.alert && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{flash.alert}</AlertDescription>
          </Alert>
        )}
        {children}
      </main>
    </div>
  )
}
