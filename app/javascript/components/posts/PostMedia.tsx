import { Heart } from 'lucide-react'
import { useState } from 'react'

import { cn } from '@/lib/utils'

const GRADIENTS = [
  'from-fuchsia-500 via-rose-500 to-amber-400',
  'from-indigo-500 via-purple-500 to-pink-500',
  'from-sky-500 via-cyan-500 to-emerald-400',
  'from-orange-500 via-red-500 to-rose-600',
  'from-emerald-500 via-teal-500 to-sky-600',
  'from-violet-600 via-indigo-500 to-blue-400',
]

// Posts have no picture: the square shows the title on a gradient picked from the id.
// A double tap likes, with Instagram's heart.
export default function PostMedia({ id, title, onDoubleTap, className }: { id: string; title: string; onDoubleTap: () => void; className?: string }) {
  const [burst, setBurst] = useState(0)
  const gradient = GRADIENTS[[...id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % GRADIENTS.length]

  return (
    <div
      onDoubleClick={() => {
        onDoubleTap()
        setBurst((count) => count + 1)
      }}
      className={cn('relative flex aspect-square select-none items-center justify-center bg-gradient-to-br p-10', gradient, className)}
    >
      <h2 className="line-clamp-6 text-center text-3xl font-bold leading-tight text-white drop-shadow-md">{title}</h2>
      {burst > 0 && (
        <Heart
          key={burst}
          aria-hidden
          className="absolute size-28 animate-out fill-white text-white drop-shadow-lg fade-out zoom-out-50 duration-700 fill-mode-forwards"
        />
      )}
    </div>
  )
}
