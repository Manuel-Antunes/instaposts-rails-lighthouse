import { type InertiaLinkProps, Link } from '@inertiajs/react'

import { type FragmentType, getFragmentData, graphql } from '@/graphql'
import { gradientFor } from '@/lib/gradient'
import { cn } from '@/lib/utils'

export const PostRow_PostFragment = graphql(`
  fragment PostRow_Post on Post {
    id
    path
    name
    assets {
      id
      kind
      url
    }
    author {
      username
    }
  }
`)

/** A post found by the search box: a small square of its cover, its title and its author; a link to the post. */
export default function PostRow({ post: postRef, className, ...link }: { post: FragmentType<typeof PostRow_PostFragment> } & Omit<InertiaLinkProps, 'href'>) {
  const post = getFragmentData(PostRow_PostFragment, postRef)
  const cover = post.assets[0]

  return (
    <Link href={post.path} className={cn('flex items-center gap-3 px-4 py-2 hover:bg-muted', className)} {...link}>
      <span className={cn('size-11 shrink-0 overflow-hidden rounded-md bg-muted', !cover && ['bg-linear-to-br', gradientFor(post.id)])}>
        {cover?.kind === 'IMAGE' && <img src={cover.url} alt="" loading="lazy" className="size-full object-cover" />}
        {cover?.kind === 'VIDEO' && <video src={`${cover.url}#t=0.1`} preload="metadata" muted playsInline className="size-full object-cover" />}
      </span>
      <span className="min-w-0 text-sm">
        <span className="block truncate font-semibold">{post.name}</span>
        <span className="block truncate text-muted-foreground">Post{post.author && ` · @${post.author.username}`}</span>
      </span>
    </Link>
  )
}
