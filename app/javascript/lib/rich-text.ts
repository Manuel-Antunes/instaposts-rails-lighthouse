export type RichTextPart =
  | { kind: 'text'; text: string }
  | { kind: 'hashtag'; text: string; name: string }
  | { kind: 'mention'; text: string; username: string }

/**
 * A caption or a comment cut into its #hashtags, its @mentions and the text between them, to
 * show the first two as links. A hashtag follows Hashtag::PATTERN, the rule Rails tags posts
 * with: a # then letters (accents too), digits and underscores, a letter among them, not right
 * after a letter, a digit, &, # or / (so not the # of "C#" or of a URL). Its `name` is the
 * stored one, lowercase. A mention is a @username as User::USERNAME_FORMAT has it, never one ending in a
 * period ("thanks @ana." mentions ana), and not inside an email.
 */
export function richTextParts(text: string): RichTextPart[] {
  const pattern = /(?<![\p{L}\p{M}\p{N}_&#/])#([\p{L}\p{M}\p{N}_]*\p{L}[\p{L}\p{M}\p{N}_]*)|(?<![\p{L}\p{N}_@.])@([a-z0-9_](?:[a-z0-9_.]{0,28}[a-z0-9_])?)(?![a-z0-9_])/giu
  const parts: RichTextPart[] = []
  let last = 0

  for (const match of text.matchAll(pattern)) {
    if (match.index > last) parts.push({ kind: 'text', text: text.slice(last, match.index) })
    if (match[1] !== undefined) parts.push({ kind: 'hashtag', text: match[0], name: match[1].normalize('NFC').toLowerCase() })
    else parts.push({ kind: 'mention', text: match[0], username: match[2].toLowerCase() })
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push({ kind: 'text', text: text.slice(last) })

  return parts
}
