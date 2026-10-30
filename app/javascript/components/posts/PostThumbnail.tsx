import { Heart, Images, MessageCircle, Play } from 'lucide-react'
import type { MouseEvent } from 'react'

import { type FragmentType, getFragmentData, graphql } from '@/graphql'
import { gradientFor } from '@/lib/gradient'
import { cn } from '@/lib/utils'

export const PostThumbnail_PostFragment = graphql(`
  fragment PostThumbnail_Post on Post {
    id
    path
    name
    likesCount
    commentsCount
    assets {
      id
      kind
      url
    }
  }
`)

/**
 * A square of a profile's grid: the post's first picture or video, a badge when it has
 * more than one file, and on hover the counts of likes and comments, as Instagram does.
 * A plain click calls onOpen (the preview); a modified one follows the link to the post.
 */
export default function PostThumbnail(props: { post: FragmentType<typeof PostThumbnail_PostFragment>; onOpen: () => void }) {
  const post = getFragmentData(PostThumbnail_PostFragment, props.post)
  const cover = post.assets[0]

  const open = (event: MouseEvent) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    props.onOpen()
  }

  return (
    <a
      href={post.path}
      onClick={open}
      aria-label={`Open ${post.name}`}
      className={cn(
        'group relative block aspect-square overflow-hidden bg-muted',
        !cover && ['bg-linear-to-br', gradientFor(post.id)],
      )}
    >
      {cover?.kind === 'IMAGE' && <img src={cover.url} alt="" loading="lazy" draggable={false} className="size-full object-cover" />}
      {cover?.kind === 'VIDEO' && <video src={`${cover.url}#t=0.1`} preload="metadata" muted playsInline className="size-full object-cover" />}
      {!cover && (
        <span className="flex size-full items-center justify-center p-4 text-center text-sm font-bold text-white drop-shadow sm:text-lg">
          <span className="line-clamp-4">{post.name}</span>
        </span>
      )}

      {post.assets.length > 1 ? (
        <Images aria-label="More than one file" className="absolute top-2 right-2 size-5 text-white drop-shadow" />
      ) : (
        cover?.kind === 'VIDEO' && <Play aria-label="Video" className="absolute top-2 right-2 size-5 fill-white text-white drop-shadow" />
      )}

      <span className="absolute inset-0 flex items-center justify-center gap-6 bg-black/40 font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        <span className="flex items-center gap-1.5">
          <Heart className="size-5 fill-white" />
          {post.likesCount}
        </span>
        <span className="flex items-center gap-1.5">
          <MessageCircle className="size-5 fill-white -scale-x-100" />
          {post.commentsCount}
        </span>
      </span>
    </a>
  )
}
