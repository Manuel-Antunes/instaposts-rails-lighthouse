import { useMutation } from '@apollo/client/react'
import { router } from '@inertiajs/react'

import { graphql } from '@/graphql'

// A new picture goes as a multipart request; Lighthouse's @upload stores it on the public
// media bucket and attaches it as the user's avatar.
const UPDATE_PROFILE = graphql(`
  mutation UpdateProfile($name: String, $username: String, $avatar: Upload) {
    updateProfile(input: { name: $name, username: $username, avatar: $avatar }) {
      id
      name
      username
      avatarUrl
    }
  }
`)

// Back to the provider's picture, or the initials.
const REMOVE_AVATAR = graphql(`
  mutation RemoveAvatar {
    removeAvatar {
      id
      avatarUrl
    }
  }
`)

/** Change the signed-in user's name, @username or picture. The header shows them from Inertia's shared props, so it reloads. */
export function useUpdateProfile() {
  return useMutation(UPDATE_PROFILE, { onCompleted: () => void router.reload({ only: ['auth'] }) })
}

/** Remove the signed-in user's picture, at once. */
export function useRemoveAvatar() {
  return useMutation(REMOVE_AVATAR, { onCompleted: () => void router.reload({ only: ['auth'] }) })
}
