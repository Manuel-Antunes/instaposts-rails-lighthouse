import { type InertiaLinkProps, Link } from '@inertiajs/react'

import UserAvatar from '@/components/UserAvatar'
import { type FragmentType, getFragmentData, graphql } from '@/graphql'
import { userPath } from '@/lib/paths'
import { cn } from '@/lib/utils'

export const AccountRow_UserFragment = graphql(`
  fragment AccountRow_User on User {
    username
    name
    avatarUrl
  }
`)

/** A person found by a search, as Instagram lists them: picture, @username, name; a link to their page. */
export default function AccountRow({ user, className, ...link }: { user: FragmentType<typeof AccountRow_UserFragment> } & Omit<InertiaLinkProps, 'href'>) {
  const account = getFragmentData(AccountRow_UserFragment, user)

  return (
    <Link href={userPath(account.username)} className={cn('flex items-center gap-3 px-4 py-2 hover:bg-muted', className)} {...link}>
      <UserAvatar name={account.name} src={account.avatarUrl} className="size-11 text-sm" />
      <span className="min-w-0 text-sm">
        <span className="block truncate font-semibold">{account.username}</span>
        <span className="block truncate text-muted-foreground">{account.name}</span>
      </span>
    </Link>
  )
}
