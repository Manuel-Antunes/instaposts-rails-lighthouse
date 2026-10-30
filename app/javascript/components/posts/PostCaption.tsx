import { useState } from 'react'

import RichText from '@/components/RichText'
import AuthorName from '@/components/users/AuthorName'
import { type FragmentType, getFragmentData, graphql } from '@/graphql'
import { cn } from '@/lib/utils'

export const PostCaption_PostFragment = graphql(`
  fragment PostCaption_Post on Post {
    name
    content
    assets {
      id
    }
    author {
      ...AuthorName_User
    }
  }
`)

/**
 * The caption of a post: its author's name, then the text. With pictures the title is not
 * on the square, so it leads the caption, whose #hashtags and @mentions are links. `clamp` shortens it to two lines, with a "more"
 * to read it all, as in the feed.
 */
export default function PostCaption({ post, clamp = false }: { post: FragmentType<typeof PostCaption_PostFragment>; clamp?: boolean }) {
  const caption = getFragmentData(PostCaption_PostFragment, post)
  const [expanded, setExpanded] = useState(false)
  const clamped = clamp && !expanded

  return (
    <>
      <p className={cn('min-w-0 text-sm wrap-break-word', clamped ? 'line-clamp-2' : 'whitespace-pre-wrap')}>
        <AuthorName user={caption.author} />{' '}
        {caption.assets.length > 0 && <span className="font-semibold">{caption.name} · </span>}
        <RichText text={caption.content} />
      </p>
      {clamped && caption.content.length > 120 && (
        <button type="button" onClick={() => setExpanded(true)} className="text-sm text-muted-foreground">
          more
        </button>
      )}
    </>
  )
}
