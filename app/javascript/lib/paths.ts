// A user's public page: their @username, always lowercase (the same address Rails serves at
// /@:username). The one place that writes it.
export const userPath = (username: string) => `/@${username}`
