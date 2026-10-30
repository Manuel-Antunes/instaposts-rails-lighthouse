import { Heart } from 'lucide-react'

import { type FragmentType, graphql } from '@/graphql'
import { useLike } from '@/hooks/use-like'
import { cn } from '@/lib/utils'

export const LikeButton_PostFragment = graphql(`
  fragment LikeButton_Post on Post {
    id
    likesCount
    viewerHasLiked
  }
`)

export default function LikeButton({ post }: { post: FragmentType<typeof LikeButton_PostFragment> }) {
  const { liked, toggle } = useLike(post)

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={liked}
      aria-label={liked ? 'Unlike' : 'Like'}
      className="-m-2 p-2 transition-transform active:scale-90"
    >
      <Heart className={cn('size-6', liked ? 'fill-red-500 text-red-500' : 'hover:text-muted-foreground')} />
    </button>
  )
}
