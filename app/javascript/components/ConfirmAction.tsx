import { type ReactNode, useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * An action asked twice, so a slip of the finger does not do it: the first click turns
 * `label` into `confirmLabel`, the second runs `onConfirm`, and `cancelLabel` (when
 * given) takes it back. `variant="button"` draws them as buttons, else as links of text.
 */
export default function ConfirmAction({
  label,
  confirmLabel,
  cancelLabel,
  onConfirm,
  pending,
  variant = 'text',
  className,
}: {
  label: ReactNode
  confirmLabel: ReactNode
  cancelLabel?: ReactNode
  onConfirm: () => void
  pending?: boolean
  variant?: 'text' | 'button'
  className?: string
}) {
  const [confirming, setConfirming] = useState(false)

  if (variant === 'button') {
    return confirming ? (
      <>
        <Button type="button" size="sm" variant="destructive" disabled={pending} onClick={onConfirm}>
          {confirmLabel}
        </Button>
        {cancelLabel && (
          <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(false)}>
            {cancelLabel}
          </Button>
        )}
      </>
    ) : (
      <Button type="button" size="sm" variant="ghost" className={className} onClick={() => setConfirming(true)}>
        {label}
      </Button>
    )
  }

  return confirming ? (
    <>
      <button type="button" disabled={pending} onClick={onConfirm} className="font-semibold text-red-600">
        {confirmLabel}
      </button>
      {cancelLabel && (
        <button type="button" onClick={() => setConfirming(false)} className={cn('font-semibold text-muted-foreground hover:text-foreground', className)}>
          {cancelLabel}
        </button>
      )}
    </>
  ) : (
    <button type="button" onClick={() => setConfirming(true)} className={cn('font-semibold text-muted-foreground hover:text-foreground', className)}>
      {label}
    </button>
  )
}
