import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TableCell, TableRow } from '@/components/ui/table'
import { type FragmentType, getFragmentData, graphql } from '@/graphql'
import type { UserRole } from '@/graphql/generated/graphql'
import { useAuth } from '@/hooks/use-auth'
import { useUpdateUserRole } from '@/hooks/use-users'

export const UserRow_UserFragment = graphql(`
  fragment UserRow_User on User {
    id
    name
    email
    role
  }
`)

/** A user of the admin's table, and the role they may be given: never one's own. */
export default function UserRow(props: { user: FragmentType<typeof UserRow_UserFragment>; onError: (message: string) => void }) {
  const user = getFragmentData(UserRow_UserFragment, props.user)
  const { user: me } = useAuth()
  const [updateUserRole] = useUpdateUserRole()
  const isSelf = user.email === me?.email
  const roles: { value: UserRole; label: string }[] = [
    { value: 'READER', label: 'Reader' },
    { value: 'AUTHOR', label: 'Author' },
    { value: 'ADMIN', label: 'Admin' },
  ]

  return (
    <TableRow>
      <TableCell className="font-medium">{user.name}</TableCell>
      <TableCell>{user.email}</TableCell>
      <TableCell>
        <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>{roles.find((role) => role.value === user.role)?.label}</Badge>
      </TableCell>
      <TableCell>
        <Select
          value={user.role}
          disabled={isSelf}
          onValueChange={(role) => updateUserRole({ variables: { id: user.id, role: role as UserRole } }).catch((error: Error) => props.onError(error.message))}
        >
          <SelectTrigger className="w-32" aria-label={`Role of ${user.name}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {roles.map((role) => (
              <SelectItem key={role.value} value={role.value}>
                {role.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
    </TableRow>
  )
}
