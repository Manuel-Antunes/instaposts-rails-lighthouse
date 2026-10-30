import { shortTimeAgo, timeAgo } from '@/lib/time'

/**
 * When something happened, relative to now: "3h" (`short`, as Instagram labels a post or a
 * comment) or "3 hours ago". The server and the browser disagree by a few seconds, so the
 * text is allowed to differ between the two.
 */
export default function TimeAgo({ iso, variant = 'long', className }: { iso: string; variant?: 'short' | 'long'; className?: string }) {
  return (
    <time dateTime={iso} suppressHydrationWarning className={className}>
      {variant === 'short' ? shortTimeAgo(iso) : timeAgo(iso)}
    </time>
  )
}
