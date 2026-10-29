import { Loader2 } from 'lucide-react'
import { useEffect, useRef } from 'react'

// Calls onVisible when it scrolls near the viewport (or its scroll container), and
// again on every change while it stays there, so a short page keeps loading.
export default function LoadMoreSentinel({ enabled, loading, onVisible }: { enabled: boolean; loading: boolean; onVisible: () => void }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element || !enabled || loading) return

    const observer = new IntersectionObserver((entries) => entries.some((entry) => entry.isIntersecting) && onVisible(), {
      rootMargin: '200px',
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [enabled, loading, onVisible])

  if (!enabled) return null
  return (
    <div ref={ref} className="flex justify-center py-4 text-muted-foreground">
      {loading && <Loader2 className="size-5 animate-spin" aria-label="Loading more" />}
    </div>
  )
}
