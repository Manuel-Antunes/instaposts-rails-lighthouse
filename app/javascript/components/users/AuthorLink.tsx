import { Link } from '@inertiajs/react'
import type { ReactNode } from 'react'

// What a post or comment says of an author that is gone.
export const UNKNOWN_AUTHOR = 'Unknown author'

// A link to a user's public page (userPath), or just the content when there is no user: a
// post whose author is gone.
export default function AuthorLink({ path, className, children }: { path?: string | null; className?: string; children: ReactNode }) {
  return path ? (
    <Link href={path} className={className}>
      {children}
    </Link>
  ) : (
    <span className={className}>{children}</span>
  )
}
