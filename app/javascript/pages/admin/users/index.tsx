import { gql, type TypedDocumentNode } from '@apollo/client'
import { useMutation, useQuery } from '@apollo/client/react'
import { Head, usePage } from '@inertiajs/react'
import type { ReactNode } from 'react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import AppLayout from '@/layouts/AppLayout'

type Role = 'READER' | 'AUTHOR' | 'ADMIN'

type UserNode = { id: string; name: string; email: string | null; role: Role; createdAt: string }

type UsersData = {
  users: {
    edges: { node: UserNode }[]
    pageInfo: { hasNextPage: boolean; endCursor: string | null }
  }
}

const USERS: TypedDocumentNode<UsersData, { after?: string | null }> = gql`
  query Users($after: String) {
    users(first: 20, after: $after) {
      edges {
        node {
          id
          name
          email
          role
          createdAt
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`

// The user comes back with its id, so Apollo updates every row showing it.
const UPDATE_USER_ROLE: TypedDocumentNode<{ updateUserRole: UserNode }, { id: string; role: Role }> = gql`
  mutation UpdateUserRole($id: ID!, $role: UserRole!) {
    updateUserRole(id: $id, role: $role) {
      id
      name
      email
      role
      createdAt
    }
  }
`

const ROLES: { value: Role; label: string }[] = [
  { value: 'READER', label: 'Reader' },
  { value: 'AUTHOR', label: 'Author' },
  { value: 'ADMIN', label: 'Admin' },
]

export default function Index() {
  const { auth } = usePage().props
  const { data, loading, error, fetchMore } = useQuery(USERS, { fetchPolicy: 'cache-and-network' })
  const [updateRole, { error: updateError }] = useMutation(UPDATE_USER_ROLE)

  const users = data?.users.edges.map((edge) => edge.node) ?? []
  const pageInfo = data?.users.pageInfo

  return (
    <>
      <Head title="Users" />

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>Set what each user is allowed to do. Readers can only read posts.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {(error || updateError) && (
            <Alert variant="destructive">
              <AlertDescription>{(updateError ?? error)?.message}</AlertDescription>
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
              {users.map((user) => {
                const isSelf = user.email === auth.user?.email

                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                        {ROLES.find((role) => role.value === user.role)?.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.role}
                        disabled={isSelf}
                        onValueChange={(role) =>
                          updateRole({ variables: { id: user.id, role: role as Role } }).catch(() => undefined)
                        }
                      >
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
              })}

              {!loading && users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No users.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {pageInfo?.hasNextPage && (
            <Button variant="outline" onClick={() => fetchMore({ variables: { after: pageInfo.endCursor } })}>
              Load more
            </Button>
          )}
        </CardContent>
      </Card>
    </>
  )
}

Index.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>
