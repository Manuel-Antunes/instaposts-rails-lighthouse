import { Head } from '@inertiajs/react'
import { type ReactNode, useState } from 'react'

import UserRow from '@/components/admin/UserRow'
import LoadMoreError from '@/components/LoadMoreError'
import LoadMoreSentinel from '@/components/LoadMoreSentinel'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { graphql, useConnection, usePageQuery } from '@/graphql'
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

export default function Index() {
  const query = usePageQuery(pageQuery)
  const users = useConnection(query, (data) => data.users)
  const [roleError, setRoleError] = useState<string | null>(null)
  const error = roleError ?? query.error?.message ?? query.preloadErrors[0]?.message

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
              <AlertDescription>{error}</AlertDescription>
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
                <UserRow key={user.id} user={user} onError={setRoleError} />
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
          <LoadMoreError error={users.error} onRetry={() => void users.retryNext()} />
        </CardContent>
      </Card>
    </>
  )
}

Index.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>
