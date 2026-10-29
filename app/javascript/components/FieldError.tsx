// Inertia hands back Rails' messages per field ("has already been taken").
export default function FieldError({ label, messages }: { label: string; messages?: string[] | string }) {
  const list = Array.isArray(messages) ? messages : messages ? [messages] : []
  if (list.length === 0) return null

  return (
    <p className="text-sm text-destructive">
      {list.map((message) => `${label} ${message}`).join('. ')}
    </p>
  )
}
