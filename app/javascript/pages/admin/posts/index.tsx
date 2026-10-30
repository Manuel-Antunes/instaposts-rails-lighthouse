import { Head } from '@inertiajs/react'
import type { ReactNode } from 'react'

import TrashRow from '@/components/admin/TrashRow'
import LoadMoreError from '@/components/LoadMoreError'
import LoadMoreSentinel from '@/components/LoadMoreSentinel'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { graphql, useConnection, usePageQuery } from '@/graphql'
import AppLayout from '@/layouts/AppLayout'

// Run by Admin::PostsController#index (render_preloaded) as the admin: `trashed: ONLY`
// is Lighthouse's @softDeletes, and PostPolicy#index? lets only admins ask for it.
export const pageQuery = graphql(`
  query TrashPage($after: String) {
    posts(first: 20, after: $after, trashed: ONLY, orderBy: [{ column: CREATED_AT, order: DESC }]) {
      edges {
        cursor
        node {
          id
          ...TrashRow_Post
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
  const posts = useConnection(query, (data) => data.posts)

  return (
    <>
      <Head title="Trash" />

      <Card>
        <CardHeader>
          <CardTitle>Trash</CardTitle>
          <CardDescription>Posts their authors or admins deleted. Restore one to put it back in the feed.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {query.preloadErrors[0] && (
            <Alert variant="destructive">
              <AlertDescription>{query.preloadErrors[0].message}</AlertDescription>
            </Alert>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Post</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Deleted</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.nodes.map((post) => (
                <TrashRow key={post.id} post={post} />
              ))}
              {posts.nodes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    The trash is empty.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <LoadMoreSentinel enabled={posts.hasNext} loading={posts.loadingNext} onVisible={posts.fetchNext} />
          <LoadMoreError error={posts.error} onRetry={() => void posts.retryNext()} />
        </CardContent>
      </Card>
    </>
  )
}

Index.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>
