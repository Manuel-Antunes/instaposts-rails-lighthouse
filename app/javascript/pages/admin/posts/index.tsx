import type { ApolloCache, Reference } from '@apollo/client'
import { useMutation } from '@apollo/client/react'
import { Head } from '@inertiajs/react'
import { type ReactNode, useState } from 'react'

import LoadMoreSentinel from '@/components/LoadMoreSentinel'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { type FragmentType, getFragmentData, graphql, useConnection, usePageQuery } from '@/graphql'
import AppLayout from '@/layouts/AppLayout'
import { timeAgo } from '@/lib/time'

// Run by Admin::PostsController#index (render_preloaded) as the admin: `trashed: ONLY`
// is Lighthouse's @softDeletes, and PostPolicy#index? lets only admins ask for it.
export const pageQuery = graphql(`
  query TrashPage($after: String) {
    posts(first: 20, after: $after, trashed: ONLY, orderBy: [{ column: CREATED_AT, order: DESC }, { column: ID, order: DESC }]) {
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

const TrashRow_PostFragment = graphql(`
  fragment TrashRow_Post on Post {
    id
    name
    deletedAt
    author {
      id
      name
    }
  }
`)

// Lighthouse's @restore: the post goes back to the feed.
const RESTORE_POST = graphql(`
  mutation RestorePost($id: ID!) {
    restorePost(id: $id) {
      id
      deletedAt
    }
  }
`)

// Lighthouse's @forceDelete: gone for good, with its likes and comments.
const FORCE_DELETE_POST = graphql(`
  mutation ForceDeletePost($id: ID!) {
    forceDeletePost(id: $id) {
      id
    }
  }
`)

type Edges = { edges: { node: Reference }[] }

// Take a post out of the cached trash: the lists of Query.posts asked with trashed: ONLY.
function leaveTrash(cache: ApolloCache, id: string) {
  cache.modify<{ posts: Edges }>({
    fields: {
      posts(existing, { storeFieldName, readField }) {
        const list = existing as Edges | undefined
        if (!list?.edges || !storeFieldName.includes('"trashed":"ONLY"')) return existing
        return { ...list, edges: list.edges.filter((edge) => readField('id', edge.node) !== id) }
      },
    },
  })
}

function TrashRow(props: { post: FragmentType<typeof TrashRow_PostFragment> }) {
  const post = getFragmentData(TrashRow_PostFragment, props.post)
  const [confirming, setConfirming] = useState(false)
  const [restore, { loading: restoring, error: restoreError }] = useMutation(RESTORE_POST, {
    update: (cache) => leaveTrash(cache, post.id),
  })
  const [forceDelete, { loading: deleting, error: deleteError }] = useMutation(FORCE_DELETE_POST, {
    update(cache) {
      cache.evict({ id: cache.identify({ __typename: 'Post', id: post.id }) })
      cache.gc()
    },
  })
  const error = restoreError ?? deleteError

  return (
    <TableRow>
      <TableCell className="font-medium">{post.name}</TableCell>
      <TableCell>{post.author?.name ?? 'Unknown author'}</TableCell>
      <TableCell className="text-muted-foreground">
        {post.deletedAt && (
          <time dateTime={post.deletedAt} suppressHydrationWarning>
            {timeAgo(post.deletedAt)}
          </time>
        )}
      </TableCell>
      <TableCell className="space-x-2 text-right">
        <Button size="sm" variant="outline" disabled={restoring} onClick={() => restore({ variables: { id: post.id } }).catch(() => undefined)}>
          Restore
        </Button>
        {confirming ? (
          <Button size="sm" variant="destructive" disabled={deleting} onClick={() => forceDelete({ variables: { id: post.id } }).catch(() => undefined)}>
            Delete for good?
          </Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>
            Delete for good
          </Button>
        )}
        {error && <p className="text-xs text-destructive">{error.message}</p>}
      </TableCell>
    </TableRow>
  )
}

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
        </CardContent>
      </Card>
    </>
  )
}

Index.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>
