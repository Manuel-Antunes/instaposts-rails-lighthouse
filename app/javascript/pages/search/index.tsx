import { Head, router } from '@inertiajs/react'
import { Search } from 'lucide-react'
import type { ReactNode } from 'react'

import PostGrid from '@/components/posts/PostGrid'
import AccountRow from '@/components/search/AccountRow'
import HashtagRow from '@/components/search/HashtagRow'
import { Input } from '@/components/ui/input'
import { graphql, useConnection, usePageQuery } from '@/graphql'
import AppLayout from '@/layouts/AppLayout'

// Run by SearchController#index (render_preloaded) with what was searched: the best people
// and hashtags (each field a Lighthouse @search, pg_search ranking them), and the first page
// of the posts that match, best first, the newest among equals. The next pages are fetchMore
// with $after, on /graphql.
export const pageQuery = graphql(`
  query SearchPage($term: String!, $after: String) {
    people(term: $term, first: 5) {
      edges {
        node {
          id
          ...AccountRow_User
        }
      }
    }
    hashtags(term: $term, first: 5) {
      edges {
        node {
          id
          ...HashtagRow_Hashtag
        }
      }
    }
    posts(search: $term, first: 18, after: $after, orderBy: [{ column: CREATED_AT, order: DESC }]) {
      edges {
        cursor
        node {
          id
          ...PostThumbnail_Post
        }
      }
      pageInfo {
        hasNextPage
        endCursor
        total
      }
    }
  }
`)

export default function Index() {
  const query = usePageQuery(pageQuery)
  const term = query.variables?.term ?? ''
  const people = query.data?.people.edges.map((edge) => edge.node) ?? []
  const hashtags = query.data?.hashtags.edges.map((edge) => edge.node) ?? []
  const posts = useConnection(query, (data) => data.posts)
  const postsTotal = query.data?.posts.pageInfo.total ?? 0
  const nothing = people.length === 0 && hashtags.length === 0 && postsTotal === 0

  return (
    <>
      <Head title={term ? `${term} • Search` : 'Search'} />

      <div className="mx-auto max-w-233.75 space-y-8">
        {/* The header's box is hidden on phones: the page has its own there. */}
        <form
          role="search"
          className="relative sm:hidden"
          onSubmit={(event) => {
            event.preventDefault()
            const q = String(new FormData(event.currentTarget).get('q') ?? '').trim()
            router.get('/explore/search', { q })
          }}
        >
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" name="q" defaultValue={term} placeholder="Search" aria-label="Search people, hashtags and posts" className="border-transparent bg-muted pl-8" />
        </form>

        {!term ? (
          <p className="py-16 text-center text-muted-foreground">Search for people, #hashtags and posts.</p>
        ) : nothing ? (
          <div className="py-16 text-center">
            <p className="font-semibold">No results found for “{term}”</p>
            <p className="text-sm text-muted-foreground">Try another name, @username or #hashtag.</p>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-semibold">Results for “{term}”</h1>

            {(people.length > 0 || hashtags.length > 0) && (
              <div className="grid gap-6 md:grid-cols-2">
                {people.length > 0 && (
                  <section aria-labelledby="search-accounts">
                    <h2 id="search-accounts" className="mb-2 text-sm font-semibold text-muted-foreground">
                      Accounts
                    </h2>
                    <ul className="-mx-4">
                      {people.map((user) => (
                        <li key={user.id}>
                          <AccountRow user={user} className="rounded-lg" />
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                {hashtags.length > 0 && (
                  <section aria-labelledby="search-tags">
                    <h2 id="search-tags" className="mb-2 text-sm font-semibold text-muted-foreground">
                      Tags
                    </h2>
                    <ul className="-mx-4">
                      {hashtags.map((hashtag) => (
                        <li key={hashtag.id}>
                          <HashtagRow hashtag={hashtag} className="rounded-lg" />
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            )}

            <section aria-labelledby="search-posts" className="border-t pt-4">
              <h2 id="search-posts" className="mb-3 text-sm font-semibold text-muted-foreground">
                Posts{postsTotal > 0 && ` · ${postsTotal.toLocaleString('en-US')}`}
              </h2>
              <PostGrid posts={posts} empty={<p className="py-10 text-center text-sm text-muted-foreground">No posts match “{term}”.</p>} />
            </section>
          </>
        )}
      </div>
    </>
  )
}

Index.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>
