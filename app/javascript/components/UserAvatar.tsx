import { cn } from '@/lib/utils'

// The user's picture, or their initials on a color picked from their name.
export default function UserAvatar({ name, src, className }: { name: string; src?: string | null; className?: string }) {
  if (src) return <img src={src} alt="" className={cn('size-8 shrink-0 rounded-full object-cover', className)} />

  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('')
  const hue = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360

  return (
    <span
      aria-hidden
      className={cn('flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white', className)}
      style={{ backgroundColor: `hsl(${hue} 55% 45%)` }}
    >
      {initials}
    </span>
  )
}
