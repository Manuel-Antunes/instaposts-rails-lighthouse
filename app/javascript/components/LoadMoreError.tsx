import { CombinedGraphQLErrors } from '@apollo/client'
import { router } from '@inertiajs/react'

import { Button } from '@/components/ui/button'

/**
 * Why a list's next page did not come, and a way on. A refusal (Lighthouse's extensions.code:
 * the session ended, or the user may no longer see the list) reloads the page, so its
 * controller sends them to sign in or away, saying why; anything else asks again.
 */
export default function LoadMoreError({ error, onRetry }: { error: Error | null; onRetry: () => void }) {
  if (!error) return null

  const codes = CombinedGraphQLErrors.is(error) ? error.errors.map((e) => e.extensions?.code) : []
  const refusal = codes.includes('UNAUTHENTICATED') ? 'Your session has ended.' : codes.includes('FORBIDDEN') ? 'You can no longer see this.' : null

  return (
    <div role="alert" className="flex flex-col items-center gap-2 py-4 text-sm text-muted-foreground">
      <p>{refusal ?? `Could not load more: ${error.message}`}</p>
      {refusal ? (
        <Button variant="outline" size="sm" onClick={() => router.reload()}>
          Reload the page
        </Button>
      ) : (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}
