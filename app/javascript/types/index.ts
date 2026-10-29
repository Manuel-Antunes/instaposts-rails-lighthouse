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
  // Liking, commenting and posting wait for a confirmed email.
  confirmed: boolean
  can_create_post: boolean
}

export type SharedProps = {
  csrf_token: string
  auth: { user: AuthUser | null }
}
