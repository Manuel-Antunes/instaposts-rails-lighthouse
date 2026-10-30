import { Link } from '@inertiajs/react'

import { hashtagPath, userPath } from '@/lib/paths'
import { richTextParts } from '@/lib/rich-text'

/**
 * A caption or a comment as Instagram shows it: its #hashtags and @mentions highlighted, each
 * a link to the tag's page or the person's. The rest is the text as written.
 */
export default function RichText({ text }: { text: string }) {
  return richTextParts(text).map((part, index) =>
    part.kind === 'text' ? (
      part.text
    ) : (
      <Link
        key={index}
        href={part.kind === 'hashtag' ? hashtagPath(part.name) : userPath(part.username)}
        className="text-[#00376b] hover:underline dark:text-[#e0f1ff]"
      >
        {part.text}
      </Link>
    ),
  )
}
