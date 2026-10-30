import AuthorName from '@/components/users/AuthorName'
import { type FragmentType, getFragmentData, graphql } from '@/graphql'

export const CommentLine_CommentFragment = graphql(`
  fragment CommentLine_Comment on Comment {
    id
    body
    author {
      ...AuthorName_User
    }
  }
`)

// A comment under a post in the feed: the author, then the comment.
export default function CommentLine(props: { comment: FragmentType<typeof CommentLine_CommentFragment> }) {
  const comment = getFragmentData(CommentLine_CommentFragment, props.comment)

  return (
    <p className="line-clamp-2 text-sm">
      <AuthorName user={comment.author} /> {comment.body}
    </p>
  )
}
