import { Head, Link } from '@inertiajs/react'
import type { ReactNode } from 'react'

import ShareButton from '@/components/ShareButton'
import { Button } from '@/components/ui/button'
import UserAvatar from '@/components/UserAvatar'
import UserPostsList from '@/components/users/UserPostsList'
import { graphql, usePageQuery } from '@/graphql'
import { useAuth } from '@/hooks/use-auth'
import AppLayout from '@/layouts/AppLayout'
import { userPath } from '@/lib/paths'

// Run by UsersController#show (render_preloaded) with the user's @username: public, for
// guests too. The grid's first page, which UserPostsList reads; the next ones are fetchMore
// with $after, on /graphql.
export const pageQuery = graphql(`
  query UserShowPage($username: String!, $after: String) {
    user(username: $username) {
      id
      username
      name
      avatarUrl
      postsCount
      createdAt
      ...UserPostsList_User
    }
  }
`)

export default function Show() {
  const query = usePageQuery(pageQuery)
  const user = query.data?.user
  const { user: me } = useAuth()

  if (!user) return <p className="text-muted-foreground">This user is not available.</p>

  return (
    <>
      <Head title={user.name} />

      <div className="mx-auto max-w-233.75">
        <header className="flex items-center gap-6 pb-8 md:gap-16 md:px-8 md:pb-10">
          <UserAvatar name={user.name} src={user.avatarUrl} className="size-20 text-2xl md:size-36 md:text-5xl" />

          <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="truncate text-xl font-semibold">{user.name}</h1>
              <span className="text-sm text-muted-foreground">@{user.username}</span>
              {me?.username === user.username && (
                <Button asChild variant="outline" size="sm">
                  <Link href="/profile">Edit profile</Link>
                </Button>
              )}
              <ShareButton variant="button" path={userPath(user.username)} title={user.name} label="Share profile" />
            </div>

            <p className="text-sm">
              <span className="font-semibold">{user.postsCount.toLocaleString('en-US')}</span> {user.postsCount === 1 ? 'post' : 'posts'}
            </p>
            <p className="text-xs text-muted-foreground">
              Member since{' '}
              <time dateTime={user.createdAt}>
                {/* "October 2026", in UTC and English: the server and the browser write the same thing. */}
                {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })}
              </time>
            </p>
          </div>
        </header>

        <UserPostsList query={query} />
      </div>
    </>
  )
}

Show.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>
