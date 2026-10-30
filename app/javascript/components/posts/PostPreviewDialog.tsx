import { useQuery } from '@apollo/client/react'
import { Loader2 } from 'lucide-react'

import PostWithComments from '@/components/posts/PostWithComments'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { graphql } from '@/graphql'

// Not a page's query: fetched by the browser when a post is opened over a grid. PostWithComments
// reads it as it reads the post's own page (PostShowPage).
const POST_PREVIEW = graphql(`
  query PostPreview($id: ID!, $commentsAfter: String) {
    post(id: $id) {
      id
      name
      ...PostWithComments_Post
    }
  }
`)

/**
 * A post over the page it was opened from, as Instagram's preview is: the same view as
 * the post's page, with the like, the comments and the share button. Closed while
 * `postId` is null.
 */
export default function PostPreviewDialog({ postId, onClose }: { postId: string | null; onClose: () => void }) {
  const query = useQuery(POST_PREVIEW, { variables: { id: postId ?? '' }, skip: !postId })
  const post = query.data?.post

  return (
    <Dialog open={!!postId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] gap-0 overflow-y-auto p-0 sm:max-w-5xl">
        <DialogTitle className="sr-only">{post?.name ?? 'Post'}</DialogTitle>
        <DialogDescription className="sr-only">The post, its likes and comments.</DialogDescription>

        {post ? (
          <PostWithComments query={query} />
        ) : query.loading ? (
          <div className="flex h-80 items-center justify-center text-muted-foreground">
            <Loader2 className="size-6 animate-spin" aria-label="Loading the post" />
          </div>
        ) : (
          <p className="p-10 text-center text-muted-foreground">This post is not available.</p>
        )}
      </DialogContent>
    </Dialog>
  )
}
