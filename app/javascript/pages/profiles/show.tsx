import { Head, Link } from '@inertiajs/react'
import type { ReactNode } from 'react'

import AccountForm from '@/components/profile/AccountForm'
import ProfileForm from '@/components/profile/ProfileForm'
import { graphql, usePageQuery } from '@/graphql'
import AppLayout from '@/layouts/AppLayout'
import { userPath } from '@/lib/paths'

// Run by ProfilesController#show (render_preloaded): the signed-in user (Query.me).
export const pageQuery = graphql(`
  query ProfilePage {
    me {
      id
      username
      name
      email
      avatarUrl
    }
  }
`)

export default function Show({ unconfirmed_email, has_password }: { unconfirmed_email: string | null; has_password: boolean }) {
  const { data } = usePageQuery(pageQuery)
  const me = data?.me
  if (!me) return null

  return (
    <>
      <Head title="Your profile" />

      <div className="mx-auto max-w-xl space-y-6">
        <ProfileForm user={me} />
        <p className="text-center text-sm">
          <Link href={userPath(me.username)} className="text-muted-foreground hover:text-foreground hover:underline">
            View your public profile →
          </Link>
        </p>

        <AccountForm email={me.email ?? ''} hasPassword={has_password} unconfirmedEmail={unconfirmed_email} />
      </div>
    </>
  )
}

Show.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>
