import { Link, usePage } from '@inertiajs/react'
import { Search } from 'lucide-react'
import type { ReactNode } from 'react'

import SearchBox from '@/components/search/SearchBox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import UserAvatar from '@/components/UserAvatar'
import { useAuth } from '@/hooks/use-auth'

export default function AppLayout({ children }: { children: ReactNode }) {
  const { flash } = usePage()
  const { user, signOut, resendConfirmation } = useAuth()

  return (
    <div className="min-h-screen bg-muted/30 text-foreground">
      <header className="border-b bg-background">
        <nav className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-lg font-semibold">
              InstaPosts
            </Link>
            {user?.role === 'admin' && (
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

          <SearchBox className="hidden w-full max-w-64 sm:block" />

          <div className="flex items-center gap-3 text-sm">
            <Link href="/explore/search" aria-label="Search" className="text-muted-foreground hover:text-foreground sm:hidden">
              <Search className="size-5" />
            </Link>
            {user?.can_create_post && (
              <Button asChild size="sm">
                <Link href="/posts/new">New post</Link>
              </Button>
            )}

            {user ? (
              <>
                <Link href="/profile" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                  <UserAvatar name={user.name} src={user.avatar_url} className="size-6 text-[10px]" />
                  {user.name}
                </Link>
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

      {user && !user.confirmed && (
        <div className="border-b bg-amber-50 text-amber-900">
          <p className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-2 px-4 py-2 text-sm">
            Confirm your email to like and comment: we sent a link to {user.email}.
            <button type="button" onClick={resendConfirmation} className="font-semibold underline">
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
