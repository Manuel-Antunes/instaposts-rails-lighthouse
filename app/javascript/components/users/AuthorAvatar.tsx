import AuthorLink, { UNKNOWN_AUTHOR } from '@/components/users/AuthorLink'
import UserAvatar from '@/components/UserAvatar'
import { type FragmentType, getFragmentData, graphql } from '@/graphql'
import { userPath } from '@/lib/paths'

export const AuthorAvatar_UserFragment = graphql(`
  fragment AuthorAvatar_User on User {
    username
    name
    avatarUrl
  }
`)

/** The picture of a post's or comment's author, linking to their page; `className` sets its size and ring. */
export default function AuthorAvatar({ user, className }: { user: FragmentType<typeof AuthorAvatar_UserFragment> | null | undefined; className?: string }) {
  const author = getFragmentData(AuthorAvatar_UserFragment, user)

  return (
    <AuthorLink path={author && userPath(author.username)}>
      <UserAvatar name={author?.name ?? UNKNOWN_AUTHOR} src={author?.avatarUrl} className={className} />
    </AuthorLink>
  )
}
