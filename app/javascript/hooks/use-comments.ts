import { useMutation } from '@apollo/client/react'

import { addComment, removeComment } from '@/components/comments/cache'
import { graphql } from '@/graphql'

const CREATE_COMMENT = graphql(`
  mutation CreateComment($postId: ID!, $body: String!) {
    createComment(input: { postId: $postId, body: $body }) {
      id
      ...CommentItem_Comment
      ...CommentLine_Comment
      post {
        id
        commentsCount
      }
    }
  }
`)

const UPDATE_COMMENT = graphql(`
  mutation UpdateComment($id: ID!, $body: String!) {
    updateComment(input: { id: $id, body: $body }) {
      id
      body
    }
  }
`)

const DELETE_COMMENT = graphql(`
  mutation DeleteComment($id: ID!) {
    deleteComment(id: $id) {
      id
      post {
        id
        commentsCount
      }
    }
  }
`)

/** Comment on a post: the new comment goes into the post's cached lists of comments (addComment) and its count goes up. */
export function useCreateComment() {
  return useMutation(CREATE_COMMENT, {
    update(cache, { data }) {
      const comment = data?.createComment
      if (comment) addComment(cache, comment.post.id, comment.id)
    },
  })
}

/** Edit a comment: its author only (CommentPolicy). */
export function useUpdateComment() {
  return useMutation(UPDATE_COMMENT)
}

/** Delete a comment: it leaves every cached list, and the post's count goes down. */
export function useDeleteComment() {
  return useMutation(DELETE_COMMENT, {
    update(cache, { data }) {
      const deleted = data?.deleteComment
      if (deleted) removeComment(cache, deleted.post.id, deleted.id)
    },
  })
}
