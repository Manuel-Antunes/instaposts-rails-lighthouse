import { useMutation } from '@apollo/client/react'
import { Head, usePage } from '@inertiajs/react'
import type { ReactNode } from 'react'

import LoadMoreSentinel from '@/components/LoadMoreSentinel'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { type FragmentType, getFragmentData, graphql, useConnection, usePageQuery } from '@/graphql'
import type { UserRole } from '@/graphql/generated/graphql'
import AppLayout from '@/layouts/AppLayout'

// Run by Admin::UsersController#index (render_preloaded) as the signed-in admin: @guard
// and @canModel(ability: "index") hold on the server too. More pages are fetchMore.
export const pageQuery = graphql(`
  query UsersPage($after: String) {
    users(first: 20, after: $after) {
      edges {
        cursor
        node {
          id
          ...UserRow_User
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`)

const UserRow_UserFragment = graphql(`
  fragment UserRow_User on User {
    id
    name
    email
    role
  }
`)

// The user comes back with its id, so Apollo updates every row showing it.
const UPDATE_USER_ROLE = graphql(`
  mutation UpdateUserRole($id: ID!, $role: UserRole!) {
    updateUserRole(id: $id, role: $role) {
      id
      ...UserRow_User
    }
  }
`)

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'READER', label: 'Reader' },
  { value: 'AUTHOR', label: 'Author' },
  { value: 'ADMIN', label: 'Admin' },
]

function UserRow(props: { user: FragmentType<typeof UserRow_UserFragment>; onChangeRole: (id: string, role: UserRole) => void }) {
  const user = getFragmentData(UserRow_UserFragment, props.user)
  const isSelf = user.email === usePage().props.auth.user?.email

  return (
    <TableRow>
      <TableCell className="font-medium">{user.name}</TableCell>
      <TableCell>{user.email}</TableCell>
      <TableCell>
        <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>{ROLES.find((role) => role.value === user.role)?.label}</Badge>
      </TableCell>
      <TableCell>
        <Select value={user.role} disabled={isSelf} onValueChange={(role) => props.onChangeRole(user.id, role as UserRole)}>
          <SelectTrigger className="w-32" aria-label={`Role of ${user.name}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((role) => (
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

export default function Index() {
  const query = usePageQuery(pageQuery)
  const users = useConnection(query, (data) => data.users)
  const [updateRole, { error: updateError }] = useMutation(UPDATE_USER_ROLE)
  const error = updateError ?? query.error ?? query.preloadErrors[0]

  return (
    <>
      <Head title="Users" />

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>Set what each user is allowed to do. Readers can only read posts.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="w-40">Change role</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {users.nodes.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  onChangeRole={(id, role) => updateRole({ variables: { id, role } }).catch(() => undefined)}
                />
              ))}

              {users.nodes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No users.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <LoadMoreSentinel enabled={users.hasNext} loading={users.loadingNext} onVisible={users.fetchNext} />
        </CardContent>
      </Card>
    </>
  )
}

Index.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>
