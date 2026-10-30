import type { Reference } from '@apollo/client'
import { useMutation } from '@apollo/client/react'

import { graphql } from '@/graphql'

// The files go as a multipart request (UploadHttpLink); Lighthouse's @upload stores each
// on the public media bucket, and Post#files= attaches them as the post's assets.
const CREATE_POST = graphql(`
  mutation CreatePost($name: String!, $content: String!, $files: [Upload!]) {
    createPost(input: { name: $name, content: $content, files: $files }) {
      id
      path
    }
  }
`)

// To the trash (Mutations::DeletePost, a discard): admins restore it or delete it for good.
const DELETE_POST = graphql(`
  mutation DeletePost($id: ID!) {
    deletePost(id: $id) {
      id
      deletedAt
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

// Lighthouse's @forceDelete: gone for good, with its likes, comments and files.
const FORCE_DELETE_POST = graphql(`
  mutation ForceDeletePost($id: ID!) {
    forceDeletePost(id: $id) {
      id
    }
  }
`)

/** Publish a post with its files. */
export function useCreatePost() {
  return useMutation(CREATE_POST)
}

/** Move a post to the trash: its author or an admin. It leaves the cache, and so every list that shows it. */
export function useDeletePost(id: string) {
  return useMutation(DELETE_POST, {
    update(cache) {
      cache.evict({ id: cache.identify({ __typename: 'Post', id }) })
      cache.gc()
    },
  })
}

/** Bring a post back from the trash: admins. It leaves the cached trash: the lists of Query.posts asked with trashed: ONLY. */
export function useRestorePost(id: string) {
  return useMutation(RESTORE_POST, {
    update(cache) {
      type Edges = { edges: { node: Reference }[] }
      cache.modify<{ posts: Edges }>({
        fields: {
          posts(existing, { storeFieldName, readField }) {
            const list = existing as Edges | undefined
            if (!list?.edges || !storeFieldName.includes('"trashed":"ONLY"')) return existing
            return { ...list, edges: list.edges.filter((edge) => readField('id', edge.node) !== id) }
          },
        },
      })
    },
  })
}

/** Delete a trashed post for good: admins. It leaves the cache altogether. */
export function useForceDeletePost(id: string) {
  return useMutation(FORCE_DELETE_POST, {
    update(cache) {
      cache.evict({ id: cache.identify({ __typename: 'Post', id }) })
      cache.gc()
    },
  })
}
