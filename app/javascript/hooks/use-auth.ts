import { useApolloClient } from '@apollo/client/react'
import { router, usePage } from '@inertiajs/react'
import { useCallback } from 'react'

import type { SharedProps } from '@/types'

/**
 * The `auth` prop every page shares (InertiaController), kept up to date by each Inertia
 * visit, and what the signed-in user does with their session:
 *
 *   const { user, signOut } = useAuth()   // `user` is null for a guest
 */
export function useAuth(): SharedProps['auth'] & { signOut: () => void; resendConfirmation: () => void } {
  const auth = usePage().props.auth
  const apolloClient = useApolloClient()
  const email = auth.user?.email

  // Whatever Apollo cached belongs to the user who just left. The pages' history is
  // encrypted by Inertia, and Rails clears it on sign-out (Users::SessionsController).
  const signOut = useCallback(() => {
    router.delete('/logout', { onSuccess: () => void apolloClient.clearStore() })
  }, [apolloClient])

  // The confirmation link again, to the address that is waiting for it.
  const resendConfirmation = useCallback(() => {
    if (email) router.post('/confirmation', { user: { email } })
  }, [email])

  return { ...auth, signOut, resendConfirmation }
}
