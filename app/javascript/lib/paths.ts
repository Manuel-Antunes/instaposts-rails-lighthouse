// A user's public page: their @username, always lowercase (the same address Rails serves at
// /@:username). The one place that writes it.
export const userPath = (username: string) => `/@${username}`

// A hashtag's page: its name, lowercase and without the # (Rails' /explore/tags/:name).
export const hashtagPath = (name: string) => `/explore/tags/${encodeURIComponent(name)}`

// The search page, for what was typed in the search box.
export const searchPath = (term: string) => `/explore/search?q=${encodeURIComponent(term)}`
