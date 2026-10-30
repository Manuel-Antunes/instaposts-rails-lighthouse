import { useMutation } from '@apollo/client/react'

import { graphql } from '@/graphql'

// The user comes back with its id, so Apollo updates every row showing it.
const UPDATE_USER_ROLE = graphql(`
  mutation UpdateUserRole($id: ID!, $role: UserRole!) {
    updateUserRole(id: $id, role: $role) {
      id
      ...UserRow_User
    }
  }
`)

/** Change what a user may do: admins, and never their own role. */
export function useUpdateUserRole() {
  return useMutation(UPDATE_USER_ROLE)
}
