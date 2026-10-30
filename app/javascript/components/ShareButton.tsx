import { Send, Link as LinkIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useShare } from '@/hooks/use-share'

/**
 * Share a page of the site: the paper plane under a post, or a labelled button
 * (`variant="button"`). Copies its link, or opens the share sheet on phones.
 */
export default function ShareButton({ path, title, variant = 'icon', label = 'Share' }: { path: string; title: string; variant?: 'icon' | 'button'; label?: string }) {
  const { share, copied } = useShare(path, title)

  if (variant === 'button') {
    return (
      <Button type="button" variant="outline" size="sm" onClick={share}>
        <LinkIcon />
        {copied ? 'Link copied' : label}
        <span className="sr-only" role="status" aria-live="polite">
          {copied ? 'Link copied' : ''}
        </span>
      </Button>
    )
  }

  return (
    <span className="relative">
      <button type="button" onClick={share} aria-label={`${label}: ${title}`} className="-m-2 block p-2 transition-transform active:scale-90">
        <Send className="size-6 hover:text-muted-foreground" />
      </button>
      {copied && (
        <span role="status" className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 rounded bg-foreground px-2 py-1 text-xs whitespace-nowrap text-background">
          Link copied
        </span>
      )}
    </span>
  )
}
