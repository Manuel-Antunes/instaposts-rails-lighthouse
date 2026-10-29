// "1 like", "12 likes", or an invitation when there are none.
export default function LikesLine({ count }: { count: number }) {
  return (
    <p className="text-sm font-semibold">
      {count === 0 ? <span className="font-normal text-muted-foreground">Be the first to like this</span> : `${count.toLocaleString('en-US')} ${count === 1 ? 'like' : 'likes'}`}
    </p>
  )
}
