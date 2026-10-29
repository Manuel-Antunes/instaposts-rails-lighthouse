export type FlashData = {
  notice?: string
  alert?: string
}

export type AuthUser = {
  id: number
  name: string
  email: string
  avatar_url: string | null
  role: 'reader' | 'author' | 'admin'
  can_create_post: boolean
}

export type SharedProps = {
  auth: { user: AuthUser | null }
}

export type PostAuthor = {
  id: number
  name: string
  avatar_url: string | null
}

export type Post = {
  id: number
  name: string
  content: string
  created_at: string
  author: PostAuthor | null
}
