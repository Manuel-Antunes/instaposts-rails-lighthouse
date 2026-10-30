import { Heart } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Carousel, type CarouselApi, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel'
import { type FragmentType, getFragmentData, graphql } from '@/graphql'
import { useLike } from '@/hooks/use-like'
import { gradientFor } from '@/lib/gradient'
import { cn } from '@/lib/utils'

export const PostMedia_PostFragment = graphql(`
  fragment PostMedia_Post on Post {
    id
    name
    assets {
      id
      kind
      url
    }
    ...LikeButton_Post
  }
`)

/**
 * The square of a post: its images and videos, in a carousel swiped or stepped with arrows
 * and dots as on Instagram when there are several, fixed when there is one; a post without
 * any shows its title on a gradient picked from the id.
 * A double tap likes the post, with Instagram's heart.
 */
export default function PostMedia(props: { post: FragmentType<typeof PostMedia_PostFragment>; className?: string }) {
  const post = getFragmentData(PostMedia_PostFragment, props.post)
  const like = useLike(post)
  const [burst, setBurst] = useState(0)
  const [api, setApi] = useState<CarouselApi>()
  const [index, setIndex] = useState(0)
  const assets = post.assets
  const gradient = gradientFor(post.id)

  const renderAsset = (asset: (typeof assets)[number]) =>
    asset.kind === 'VIDEO' ? (
      <video src={asset.url} className="size-full object-contain" controls playsInline muted loop preload="metadata" />
    ) : (
      <img src={asset.url} alt={post.name} className="size-full object-cover" draggable={false} />
    )

  useEffect(() => {
    if (!api) return

    const onSelect = () => {
      const selected = api.selectedScrollSnap()
      setIndex(selected)
      // A video left behind keeps no sound or playback of its own.
      api.slideNodes().forEach((node, i) => {
        if (i !== selected) node.querySelector('video')?.pause()
      })
    }

    onSelect()
    api.on('select', onSelect)
    api.on('reInit', onSelect)
    return () => {
      api.off('select', onSelect)
      api.off('reInit', onSelect)
    }
  }, [api])

  return (
    <div
      onDoubleClick={() => {
        like.set(true)
        setBurst((count) => count + 1)
      }}
      className={cn(
        'relative flex aspect-square select-none items-center justify-center overflow-hidden',
        assets.length > 0 ? 'bg-black' : ['bg-linear-to-br p-10', gradient],
        props.className,
      )}
    >
      {assets.length > 1 ? (
        <Carousel setApi={setApi} opts={{ duration: 15 }} className="size-full **:data-[slot=carousel-content]:h-full">
          <CarouselContent className="ml-0 h-full">
            {assets.map((asset) => (
              <CarouselItem key={asset.id} className="flex items-center justify-center pl-0">
                {renderAsset(asset)}
              </CarouselItem>
            ))}
          </CarouselContent>

          <CarouselPrevious
            variant="ghost"
            onDoubleClick={(event) => event.stopPropagation()}
            className="left-2 border-0 bg-white/80 text-black shadow hover:bg-white disabled:hidden"
          />
          <CarouselNext
            variant="ghost"
            onDoubleClick={(event) => event.stopPropagation()}
            className="right-2 border-0 bg-white/80 text-black shadow hover:bg-white disabled:hidden"
          />
        </Carousel>
      ) : assets.length === 1 ? (
        renderAsset(assets[0])
      ) : (
        <h2 className="line-clamp-6 text-center text-3xl font-bold leading-tight text-white drop-shadow-md">{post.name}</h2>
      )}

      {assets.length > 1 && (
        <>
          <span className="pointer-events-none absolute top-3 right-3 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
            {index + 1}/{assets.length}
          </span>
          <div className="pointer-events-none absolute bottom-3 flex gap-1">
            {assets.map((asset, i) => (
              <span key={asset.id} className={cn('size-1.5 rounded-full transition-colors', i === index ? 'bg-white' : 'bg-white/50')} />
            ))}
          </div>
        </>
      )}

      {burst > 0 && (
        <Heart
          key={burst}
          aria-hidden
          className="pointer-events-none absolute size-28 animate-out fill-white text-white drop-shadow-lg fade-out zoom-out-50 duration-700 fill-mode-forwards"
        />
      )}
    </div>
  )
}
