import { Link, router, usePage } from '@inertiajs/react'
import { Loader2, Search, X } from 'lucide-react'
import { type KeyboardEvent, useId, useState } from 'react'

import AccountRow from '@/components/search/AccountRow'
import HashtagRow from '@/components/search/HashtagRow'
import PostRow from '@/components/search/PostRow'
import { Input } from '@/components/ui/input'
import { useSearchBox } from '@/hooks/use-search'
import { hashtagPath, searchPath, userPath } from '@/lib/paths'
import { cn } from '@/lib/utils'

/**
 * Instagram's search box: people, hashtags and posts as you type, best matches first, in one
 * list. Arrow keys move through it and Enter opens one; Enter on nothing chosen, or "See all
 * results", goes to the search page. On that page the box holds what was searched.
 */
export default function SearchBox({ className }: { className?: string }) {
  const { url } = usePage()
  const [term, setTerm] = useState(() => (url.startsWith('/explore/search') ? (new URLSearchParams(url.split('?')[1]).get('q') ?? '') : ''))
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const { results, total, loading, error } = useSearchBox(term, open)
  const listId = useId()

  const hrefs = results.map((result) => (result.__typename === 'User' ? userPath(result.username) : result.__typename === 'Hashtag' ? hashtagPath(result.name) : result.path))
  const showing = open && term.trim() !== ''

  const visit = (href: string) => {
    setOpen(false)
    setActive(-1)
    router.visit(href)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      setActive((index) => (event.key === 'ArrowDown' ? Math.min(index + 1, results.length - 1) : Math.max(index - 1, -1)))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (active >= 0 && hrefs[active]) visit(hrefs[active])
      else if (term.trim()) visit(searchPath(term.trim()))
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  // Each row keeps the focus in the box (tabIndex -1) and closes the list as it opens.
  const rowProps = (index: number) => ({
    tabIndex: -1,
    onClick: () => setOpen(false),
    className: cn(index === active && 'bg-muted'),
  })

  return (
    <div
      className={cn('relative', className)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        role="combobox"
        aria-label="Search people, hashtags and posts"
        aria-expanded={showing}
        aria-controls={listId}
        aria-activedescendant={showing && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        placeholder="Search"
        value={term}
        onChange={(event) => {
          setTerm(event.target.value)
          setActive(-1)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className="border-transparent bg-muted pr-8 pl-8 [&::-webkit-search-cancel-button]:hidden"
      />
      {term && (
        <button
          type="button"
          aria-label="Clear the search"
          onClick={() => {
            setTerm('')
            setActive(-1)
          }}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-muted-foreground/40 p-0.5 text-background"
        >
          <X className="size-3" />
        </button>
      )}

      {showing && (
        <div className="absolute top-full left-1/2 z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-lg border bg-popover py-2 text-popover-foreground shadow-lg">
          <ul id={listId} role="listbox" aria-label="Search results" className="max-h-[60vh] overflow-y-auto">
            {results.map((result, index) => (
              <li key={`${result.__typename}:${result.id}`} id={`${listId}-${index}`} role="option" aria-selected={index === active}>
                {result.__typename === 'User' && <AccountRow user={result} {...rowProps(index)} />}
                {result.__typename === 'Hashtag' && <HashtagRow hashtag={result} {...rowProps(index)} />}
                {result.__typename === 'Post' && <PostRow post={result} {...rowProps(index)} />}
              </li>
            ))}
          </ul>

          {results.length === 0 && (
            <p className="flex justify-center px-4 py-6 text-sm text-muted-foreground">
              {loading ? <Loader2 className="size-5 animate-spin" aria-label="Searching" /> : error ? 'The search failed. Try again.' : 'No results found.'}
            </p>
          )}

          <Link href={searchPath(term.trim())} tabIndex={-1} onClick={() => setOpen(false)} className="block border-t px-4 pt-2 pb-1 text-sm font-semibold text-sky-600 hover:underline">
            See all results{total > results.length && ` (${total.toLocaleString('en-US')})`}
          </Link>
        </div>
      )}
    </div>
  )
}
