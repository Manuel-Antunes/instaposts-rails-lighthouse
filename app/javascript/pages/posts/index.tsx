import { Head, Link } from '@inertiajs/react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import AppLayout from '@/layouts/AppLayout'
import type { Post } from '@/types'

type Props = { posts: Post[]; page: number; has_next_page: boolean }

export default function Index({ posts, page, has_next_page }: Props) {
  return (
    <>
      <Head title="Posts" />

      <h1 className="text-2xl font-semibold">Posts</h1>

      {posts.length === 0 && <p className="mt-6 text-muted-foreground">No posts yet.</p>}

      <div className="mt-6 space-y-4">
        {posts.map((post) => (
          <Card key={post.id}>
            <CardHeader>
              <CardTitle>
                <Link href={`/posts/${post.id}`} className="hover:underline">
                  {post.name}
                </Link>
              </CardTitle>
              <CardDescription>
                {post.author?.name ?? 'Unknown author'} · {new Date(post.created_at).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="line-clamp-2 text-muted-foreground">{post.content}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 flex justify-between">
        {page > 1 ? (
          <Button asChild variant="outline" size="sm">
            <Link href={`/posts?page=${page - 1}`}>← Newer</Link>
          </Button>
        ) : (
          <span />
        )}
        {has_next_page && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/posts?page=${page + 1}`}>Older →</Link>
          </Button>
        )}
      </div>
    </>
  )
}

Index.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>
