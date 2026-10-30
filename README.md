# Instaposts: Rails + lighthouse-graphql

An Instagram-like app built as a real-world example of [lighthouse-graphql](https://github.com/Vaz-Innovation/lighthouse-graphql), the SDL-first GraphQL server for Rails modeled on PHP's Lighthouse. Users post pictures and videos, like posts, comment on them, follow each other's profiles, and admins manage users and a trash of deleted posts.

The frontend is React with Inertia.js. Every page is rendered on the server with its data: Rails runs the page's GraphQL operation through Lighthouse before rendering, so the first load needs no client request, and Apollo Client takes over from there.

| | |
| --- | --- |
| Backend | Rails 8.1, lighthouse-graphql, Devise, Pundit, Discard, Active Storage, Solid Queue, SQLite |
| Frontend | React 19, Inertia.js 3 (with SSR), Apollo Client 4, Vite 8, Tailwind CSS 4, shadcn/ui |
| Tooling | GraphQL Code Generator, TypeScript, React Hook Form + zod, TanStack Virtual |

## What it shows

**The schema is SDL.** `graphql/*.graphql` declares the API with Lighthouse's directives, and Ruby only fills the gaps:

- Queries with `@find`, `@paginate(type: CONNECTION)`, `@hasMany`, `@count`, `@orderBy`, `@eq`.
- Mutations with `@create`, `@update`, `@delete` and `@inject`, with the model's validation errors returned per field.
- Authorization with `@guard` and Pundit through `@canModel`, `@canFind`, `@canResolved` and `@canRoot`. Refusals carry `extensions.code` (`UNAUTHENTICATED`, `FORBIDDEN`).
- Soft deletes: `@softDeletes(ability: "view_trashed")`, `@restore` and `@forceDelete` over Discard.
- Files: the `Upload` scalar with `@upload` to S3, and `@attachment` for their URLs.
- Relay global ids with `@globalId` and `@node`.
- One lookup of several with `@oneOf`: `user(by: UserBy!)` finds a user by `id` or by `username`, and a query that gives both, neither or `null` is refused before anything resolves.

**Pages preload their query on the server.** A page declares its operation next to the component (`export const pageQuery = graphql(...)`). The controller calls `render_preloaded`, which runs that operation through Lighthouse as the signed-in user, with the same directives and policies as `/graphql`, and sends the result with the page. The browser writes it to Apollo's cache before the first render, so the server-rendered HTML and the hydrated page match.

- `app/controllers/concerns/page_query_rendering.rb`: `render_preloaded`, through Lighthouse's `lighthouse_execute`.
- `app/graphql/page_queries/`: which operation each page preloads, read from the Vite manifest.
- `app/javascript/graphql/page-query.ts`: `usePageQuery`.

Rails never reads a frontend file. A Vite plugin (`vite/inertia-graphql/`) runs GraphQL Code Generator, finds each page's `pageQuery`, and publishes the operations in the Vite manifest, or from the dev server in development.

**Components own their data.** Each component declares a fragment of what it renders (`FeedPost_Post`, `PostActions_Post`, `AuthorAvatar_User`, ...), and pages spread them. Codegen masks the data, so a component only sees its own fields.

**Infinite lists.** Paginated fields get Apollo type policies generated from the schema, and `useConnection` (`app/javascript/graphql/connection.ts`) turns a result into nodes plus `fetchNext`. The feed and the profile grid are virtualized with TanStack Virtual. The first page is rendered on the server, and the rest come from `/graphql` as you scroll. A page that fails to load stops and says why, instead of being retried in a loop.

**Authentication.** Devise covers sign-up with email confirmation, password reset and sign-in with Google or GitHub (OmniAuth). The browser uses the session, and API clients send a bearer JWT to `/graphql`. Forms that post to Rails controllers use Inertia's form helper, which carries the CSRF token. Forms that call GraphQL use React Hook Form with zod.

## How a page loads

```
GET /@ana
  UsersController#show
    authorize user (Pundit)
    render_preloaded variables: { username: "ana" }
      UserShowPage runs through Lighthouse, as the signed-in user
  Inertia SSR (Node) renders users/show with that data
  -> HTML with the page and its data

In the browser
  usePageQuery writes the data to Apollo's cache, then React hydrates
  scrolling: fetchMore UserShowPage(after: ...) on /graphql
```

## Running it

You need Ruby 3.4.4, Node 24 and Docker.

```sh
docker compose up -d   # Mailpit (email) and MinIO (S3 storage)
bin/setup              # gems, npm packages, database and seeds; then starts bin/dev
```

`bin/dev` runs Rails on http://localhost:3000 and the Vite dev server, which also renders the pages on the server in development. The seeds create an admin, `john@acme.inc` (the password is in `db/seeds.rb`), five authors and forty posts.

| | |
| --- | --- |
| The app | http://localhost:3000 |
| GraphiQL | http://localhost:3000/graphiql |
| Emails (Mailpit) | http://localhost:8025 |
| Files (MinIO console) | http://localhost:9001 |

Sign-in with Google or GitHub shows up when `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` or `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` are set.

## Tests

```sh
bin/rails test     # models, policies, GraphQL and pages (builds the frontend once)
npm test           # the Vite plugin and the zod schemas
npm run check      # TypeScript
bin/ci             # everything CI runs, plus RuboCop, Brakeman and bundler-audit
```

`bin/rails lighthouse:schema_output:verify` checks that `schema.graphql`, the schema the frontend's types are generated from, is up to date. In development, Lighthouse rewrites it whenever a `.graphql` file changes.

## Production

The `Dockerfile` builds one image with Puma, Thruster, the Inertia SSR server (Node) and Solid Queue. On boot it creates or migrates the SQLite databases in `/rails/storage`.

```sh
docker build -t instaposts .
docker run -d -p 80:80 -v instaposts_storage:/rails/storage \
  -e SECRET_KEY_BASE="$(bin/rails secret)" \
  -e APP_URL=https://instaposts.example.com \
  -e SOLID_QUEUE_IN_PUMA=true \
  -e S3_ENDPOINT=... -e S3_ACCESS_KEY_ID=... -e S3_SECRET_ACCESS_KEY=... -e S3_BUCKET=... \
  -e SMTP_ADDRESS=... \
  instaposts
```

| Variable | |
| --- | --- |
| `SECRET_KEY_BASE` | Signs sessions and the API's JWTs. `config/credentials.yml.enc` is encrypted with a key that is not in the repository: use this variable, or delete that file and run `bin/rails credentials:edit` to make your own. |
| `APP_URL` | The public address: links in emails, OmniAuth callbacks, share links. |
| `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_REGION`, `S3_BUCKET` | The public bucket for pictures and videos. Its URLs go to browsers as they are, so the endpoint must be reachable from them. |
| `SMTP_ADDRESS`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `MAIL_FROM` | Email. Without `SMTP_USERNAME` the server is used without login. |
| `SOLID_QUEUE_IN_PUMA` | Runs the jobs (emails, file analysis) inside Puma. |
| `SEED_ADMIN_PASSWORD` | Creates the admin on the first boot. Production has no default password. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | Sign-in with Google or GitHub. |

## Layout

```
graphql/                  the schema (SDL), with Lighthouse's directives
app/graphql/              type classes, resolvers and mutations for what the directives do not cover
app/graphql/page_queries/ server-side preloading of each page's operation
app/policies/             Pundit policies, used by the controllers and by @can*
app/javascript/pages/     Inertia pages, each with its pageQuery
app/javascript/components/  components, each with its fragment
app/javascript/graphql/   usePageQuery, useConnection, generated types
vite/inertia-graphql/     the Vite plugin: codegen, page operations, type policies
```

## License

[MIT](LICENSE)
