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
  csrf_token: string
  auth: { user: AuthUser | null }
}
