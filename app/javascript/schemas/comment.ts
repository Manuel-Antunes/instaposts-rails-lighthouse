import { z } from 'zod'

// As long as Comment::MAX_LENGTH (Instagram's limit).
export const COMMENT_MAX_LENGTH = 2200

export const commentSchema = z.object({
  body: z.string().trim().min(1, 'Write something to comment.').max(COMMENT_MAX_LENGTH, `A comment has at most ${COMMENT_MAX_LENGTH} characters.`),
})

export type CommentValues = z.infer<typeof commentSchema>
