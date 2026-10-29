import { Head, Link } from '@inertiajs/react'
import type { ReactNode } from 'react'

import AppLayout from '@/layouts/AppLayout'
import type { Post } from '@/types'

export default function Show({ post }: { post: Post }) {
  return (
    <>
      <Head title={post.name} />

      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← All posts
      </Link>

      <article className="mt-4">
        <h1 className="text-3xl font-semibold">{post.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {post.author?.name ?? 'Unknown author'} · {new Date(post.created_at).toLocaleDateString()}
        </p>
        <div className="mt-6 whitespace-pre-wrap leading-relaxed">{post.content}</div>
      </article>
    </>
  )
}

Show.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>
