import { type InertiaLinkProps, Link } from '@inertiajs/react'
import { Hash } from 'lucide-react'

import { type FragmentType, getFragmentData, graphql } from '@/graphql'
import { hashtagPath } from '@/lib/paths'
import { cn } from '@/lib/utils'

export const HashtagRow_HashtagFragment = graphql(`
  fragment HashtagRow_Hashtag on Hashtag {
    name
    postsCount
  }
`)

/** A hashtag found by a search, as Instagram lists them: #name and how many posts it has; a link to its page. */
export default function HashtagRow({ hashtag, className, ...link }: { hashtag: FragmentType<typeof HashtagRow_HashtagFragment> } & Omit<InertiaLinkProps, 'href'>) {
  const tag = getFragmentData(HashtagRow_HashtagFragment, hashtag)

  return (
    <Link href={hashtagPath(tag.name)} className={cn('flex items-center gap-3 px-4 py-2 hover:bg-muted', className)} {...link}>
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full border">
        <Hash className="size-5" />
      </span>
      <span className="min-w-0 text-sm">
        <span className="block truncate font-semibold">#{tag.name}</span>
        <span className="block truncate text-muted-foreground">
          {tag.postsCount.toLocaleString('en-US')} {tag.postsCount === 1 ? 'post' : 'posts'}
        </span>
      </span>
    </Link>
  )
}
