import { Button } from '@/components/ui/button'

export type Provider = { id: string; name: string }

function csrfToken() {
  return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? ''
}

// Plain forms, not Inertia visits: the browser has to follow the redirect to the provider.
export default function OAuthButtons({ providers }: { providers: Provider[] }) {
  if (providers.length === 0) return null

  return (
    <div className="space-y-2">
      {providers.map((provider) => (
        <form key={provider.id} method="post" action={`/auth/${provider.id}`}>
          <input type="hidden" name="authenticity_token" value={csrfToken()} />
          <Button type="submit" variant="outline" className="w-full">
            Continue with {provider.name}
          </Button>
        </form>
      ))}
    </div>
  )
}
