import AuthorLink, { UNKNOWN_AUTHOR } from '@/components/users/AuthorLink'
import { type FragmentType, getFragmentData, graphql } from '@/graphql'
import { userPath } from '@/lib/paths'
import { cn } from '@/lib/utils'

export const AuthorName_UserFragment = graphql(`
  fragment AuthorName_User on User {
    username
    name
  }
`)

/** The name of a post's or comment's author, in bold and linking to their page; `className` changes how it looks. */
export default function AuthorName({ user, className }: { user: FragmentType<typeof AuthorName_UserFragment> | null | undefined; className?: string }) {
  const author = getFragmentData(AuthorName_UserFragment, user)

  return (
    <AuthorLink path={author && userPath(author.username)} className={cn('font-semibold hover:underline', className)}>
      {author?.name ?? UNKNOWN_AUTHOR}
    </AuthorLink>
  )
}
