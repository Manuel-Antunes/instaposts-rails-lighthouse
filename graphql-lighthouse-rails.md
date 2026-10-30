# Plano de implementação (Rails): Inertia + Lighthouse GraphQL + Apollo SSR

Adaptação de `graphql-lighthouse.md` (escrito para Laravel) para este projeto:
Rails 8.1, `inertia_rails` 3.23, `vite_rails` 3.11 (Vite 8 / rolldown), `lighthouse-graphql` 0.7.2
(graphql-ruby 2.x), React 19, Apollo Client 4.3, GraphQL Code Generator 7 (client preset).

O SSR do Inertia já está configurado (dev pelo Vite dev server em `/__inertia_ssr`, produção
por `public/vite-ssr/ssr.js` iniciado pelo `bin/docker-entrypoint`). Este plano parte daí.

---

## 1. Objetivo

Cada página Inertia declara, inline no `.tsx`, no máximo uma operação principal (`pageQuery`), e os
componentes declaram os fragments de que precisam. No request:

1. O controller Rails chama `render_preloaded`, passando só as variáveis.
2. O Rails descobre a operação da página **pelo que o build do frontend produziu** (o manifesto do Vite),
   e a executa pelo pipeline do Lighthouse com o usuário da sessão: mesmas diretivas (`@guard`,
   `@can*`), policies do Pundit e erros que um request a `/graphql`.
3. O resultado vai para a página numa prop do Inertia.
4. O Apollo escreve o resultado na cache antes de a página renderizar, no SSR (cache isolada por
   request) e no browser, e o `useQuery` da página não refaz a requisição.
5. Os componentes recebem props tipadas pelos seus fragments (codegen).

### Princípio de dependências

O Rails não conhece nenhum arquivo do frontend. Ele conhece dois contratos:

- **O manifesto do Vite**, lido pelo `vite_ruby`, que o app já usa para os assets e para a versão do Inertia
  (`config.version = ViteRuby.digest`). O plugin do frontend anexa às entradas das páginas os metadados
  GraphQL.
- **O Vite dev server**, em desenvolvimento, que responde esses mesmos metadados por HTTP, como já
  responde o SSR (`/__inertia_ssr`).

O frontend, por sua vez, conhece um artefato do Rails: o schema exportado (`schema.graphql`), que o
Codegen lê. Nenhum dos dois lados lê arquivos gerados dentro do código-fonte do outro.

---

## 2. Arquitetura geral

```text
                  BUILD (vite build / vite dev)                           REQUEST (Rails)
┌───────────────────────────────────────────────────────────┐   ┌──────────────────────────────────────┐
│ schema.graphql  ◄── Lighthouse config.schema_output       │   │ PostsController#show                 │
│      │              (e a cada reload, em dev)             │   │   render_preloaded variables: {...}  │
│      ▼                                                    │   │            │                         │
│ GraphQL Codegen (client preset + fragment-matcher)        │   │            ▼                         │
│   - tipos, graphql(), FragmentType/getFragmentData        │   │ PageQueries::Manifest                │
│   - possibleTypes                                         │   │   prod/test: manifest do vite_ruby   │
│   - documento executável + sha256 de cada operação        │   │   dev: GET {vite}/__inertia_graphql  │
│      │                                                    │   │            │                         │
│      ▼                                                    │   │            ▼                         │
│ Plugin inertia-graphql (Vite)                             │   │ PageQueries::Preloader               │
│   - acha `export const pageQuery` de cada página (AST)    │   │   valida variáveis                   │
│   - associa página → operação                             │──►│   Lighthouse PersistedQueries.execute│
│   - build: anexa ao .vite/manifest.json                   │   │   contexto = usuário da sessão       │
│   - dev:   serve /__inertia_graphql                       │   │            │                         │
└───────────────────────────────────────────────────────────┘   │            ▼                         │
                                                                │ prop `page_query` (lazy)             │
                                                                └────────────┬─────────────────────────┘
                                                                             ▼
                                         SSR (Node) e browser: usePageQuery → cache.writeQuery → useQuery
```

### Build-time

1. O Rails exporta o SDL executável (`BlogRailsSchema.to_definition`) para `schema.graphql` na raiz do
   repositório. É o contrato da API: inclui as diretivas do Lighthouse e os tipos que ele gera
   (connections, inputs de `@orderBy`).
2. O plugin do Vite roda o GraphQL Codegen (API programática) no `buildStart` e, em dev, a cada
   mudança de documento ou do schema.
3. O Codegen valida os documentos contra o schema e gera tipos, `graphql()`, fragment masking,
   `possibleTypes` e, para cada operação, o documento executável (operação + fragments transitivos +
   `__typename`) com seu SHA-256.
4. O plugin lê os módulos de página por AST, encontra o `export const pageQuery` de cada uma e
   associa o componente Inertia (`posts/show`) à operação.
5. Em build, o plugin anexa esses metadados às entradas do `.vite/manifest.json`. Em dev, serve os
   mesmos dados em `/__inertia_graphql`.

### Request-time

1. O controller chama `render_preloaded variables: { id: post.to_gid_param }`.
2. `PageQueries::Manifest` resolve o componente para a operação, pelo manifesto (produção/teste) ou
   pelo dev server (desenvolvimento).
3. `PageQueries::Preloader` valida as variáveis contra as declaradas e executa o documento por
   `Lighthouse::GraphQL::PersistedQueries.execute`, com o contexto do controller.
4. O resultado vai na prop `page_query`, avaliada de forma lazy: um partial reload que não a pede não
   executa a operação.
5. No SSR e no browser, `usePageQuery(pageQuery)` escreve `data` na cache do Apollo e então chama
   `useQuery` com `cache-first`. A primeira renderização já tem os dados, e não há fetch.

---

## 3. API Rails: `render_preloaded`

### 3.1 Assinatura

Um concern incluído em `InertiaController`, no lugar da facade Laravel:

```ruby
render_preloaded(component = nil, props: {}, variables: {}, **options)
```

- `component`: por padrão, o mesmo que `render inertia:` infere
  (`inertia_configuration.component_path_resolver(path: controller_path, action: action_name)`, ou seja,
  `posts/show` em `PostsController#show`).
- `props`: props comuns da página.
- `variables`: variáveis da `pageQuery`, com os nomes declarados no GraphQL (`id`, `after`…).
- `options`: repassadas a `render inertia:` (`meta:`, `encrypt_history:`…).

### 3.2 Exemplo de controller

```ruby
class PostsController < InertiaController
  def show
    post = Post.find(params[:id])   # 404 e 403 continuam sendo do Rails
    authorize post
    render_preloaded variables: { id: post.to_gid_param }
  end
end

module Admin
  class UsersController < InertiaController
    def index
      authorize User
      render_preloaded   # UsersPage não tem variáveis obrigatórias
    end
  end
end
```

O controller não conhece o nome da operação, o documento nem os fragments.

Os IDs são os globais do schema (`@globalId` codifica com `BlogRailsSchema.id_from_object`, que usa
`to_gid_param`), por isso o controller passa `post.to_gid_param`. O campo novo
`post(id: ID! @globalId(decode: ID) @eq): Post @find @canResolved(ability: "show")` autoriza de novo
pelo `PostPolicy#show?`. A checagem no controller dá a semântica HTTP (404, redirect), e a do
GraphQL é a que vale para os dados.

### 3.3 Implementação

```ruby
module PageQueryRendering
  extend ActiveSupport::Concern

  private

  def render_preloaded(component = nil, props: {}, variables: {}, **options)
    component ||= inertia_configuration.component_path_resolver(path: controller_path, action: action_name)
    raise ArgumentError, "page_query is reserved" if props.key?(:page_query) || props.key?("page_query")

    query = PageQueries::Preloader.new(context: page_query_context).prepare(component, variables)
    render inertia: component, props: props.merge(page_query: query), **options
  end

  # O mesmo contexto que GraphqlController dá a uma operação. O usuário é sempre
  # o da sessão, nunca um valor passado pelo chamador.
  def page_query_context
    { current_user: current_user, remote_ip: request.remote_ip, lighthouse_controller: self }
  end
end
```

`Preloader#prepare` valida as variáveis na hora e devolve um lambda, que o `inertia_rails` só avalia
quando a prop entra na resposta.

### 3.4 Regras do contrato

- `page_query` é reservada. A convenção do app é snake_case nas props (`csrf_token`, `has_next_page`),
  então o nome substitui o `initialGraphQL` do plano original.
- Página sem `pageQuery` e sem variáveis: `page_query: null`.
- Página sem `pageQuery` com variáveis: `PageQueries::VariablesError`.
- Variável não declarada, ou obrigatória ausente: `VariablesError`, antes de executar.
- Erros distinguíveis:

  | Erro | Quando |
  | --- | --- |
  | `PageQueries::ManifestError` | Manifesto ausente, de versão incompatível, ou operação referenciada que não existe nele |
  | `PageQueries::VariablesError` | Variáveis não batem com as declaradas |
  | `PageQueries::ExecutionError` | A operação não rodou: resultado sem `data` (tipo de variável errado, documento que o schema não valida mais) |
  | `errors` junto de `data` | Não é exceção: vai para a página (ver §6.4) |

- O contexto (usuário, IP) vem só do controller. `variables` nunca chegam ao contexto.

---

## 4. Plugin Vite `inertia-graphql`

Em `vite/inertia-graphql/` (fora de `app/javascript`: é ferramenta de build), registrado no `vite.config.ts` ao lado do plugin do
Inertia.

### 4.1 Sintaxe

Documentos ficam nos `.tsx`, com o `graphql()` gerado pelo client preset:

```tsx
// components/PostArticle.tsx
import { type FragmentType, getFragmentData, graphql } from '@/graphql'

export const PostArticle_PostFragment = graphql(`
  fragment PostArticle_Post on Post {
    id
    name
    content
    createdAt
    author { ...AuthorLine_User }
  }
`)

export default function PostArticle(props: { post: FragmentType<typeof PostArticle_PostFragment> }) {
  const post = getFragmentData(PostArticle_PostFragment, props.post)
  // ...
}
```

```tsx
// pages/posts/show.tsx
export const pageQuery = graphql(`
  query PostShowPage($id: ID!) {
    post(id: $id) {
      id
      name
      ...PostArticle_Post
    }
  }
`)

export default function Show() {
  const { data } = usePageQuery(pageQuery)
  return data?.post ? <PostArticle post={data.post} /> : <NotFound />
}
```

Convenções:

- Fragment: `<Componente>_<Tipo>`, exportado como `<Componente>_<Tipo>Fragment`.
- Operação de página: `<Página>Page` (`PostShowPage`, `UsersPage`), exportada como `pageQuery`.
- Documentos são template literals estáticos, sem interpolação. O Codegen já exige isso, e o
  plugin rejeita o que não for.

### 4.2 Codegen dentro do plugin

O plugin chama `generate()` do `@graphql-codegen/cli` com `codegen.ts`:

```ts
const config: CodegenConfig = {
  schema: 'schema.graphql',
  documents: ['app/javascript/**/*.{ts,tsx}', '!app/javascript/graphql/generated/**'],
  generates: {
    'app/javascript/graphql/generated/': {
      preset: 'client',
      presetConfig: {
        fragmentMasking: { unmaskFunctionName: 'getFragmentData' },
        // sha256 em hex do documento impresso: o mesmo hash no __meta__ do DocumentNode
        // (browser) e no manifesto (Rails).
        persistedDocuments: { hashAlgorithm: (doc) => createHash('sha256').update(doc).digest('hex') },
      },
      // O documento que o Rails executa precisa selecionar __typename onde a cache do
      // Apollo o adiciona, senão o resultado não pode ser escrito na cache como veio.
      documentTransforms: [addTypenameSelectionDocumentTransform],
      config: { scalars: { DateTime: 'string' }, enumsAsTypes: true, useTypeImports: true },
    },
    'app/javascript/graphql/generated/possible-types.ts': {
      plugins: ['fragment-matcher'],
      config: { module: 'es2015', apolloClientVersion: 3 },
    },
  },
}
```

- Os arquivos TS gerados (tipos, `graphql()`, `getFragmentData`, `possibleTypes`) são gravados
  em disco, porque o `tsc` e o IDE precisam deles.
- O `persisted-documents.json` não é gravado nem lido pelo Rails. O plugin usa esse output em
  memória para obter o documento executável e o hash de cada operação, e os publica no manifesto.
- `npm run codegen` roda a mesma configuração isoladamente, para CI e editor.

Validado neste repositório: com o client preset e `addTypenameSelectionDocumentTransform`, cada operação
sai com os fragments transitivos embutidos e `__typename` em toda seleção, e o `DocumentNode` do browser
carrega `__meta__.hash`. O hash padrão do preset vem prefixado (`sha256:…`) e não é o SHA-256 do corpo,
por isso o `hashAlgorithm` explícito.

### 4.3 Extração da `pageQuery` por AST

Para cada módulo em `app/javascript/pages/**/*.{tsx,jsx}`, o plugin:

1. faz o parse com o parser do próprio toolchain (rolldown/oxc), sem regex;
2. procura `export const pageQuery = graphql(\`...\`)` com template literal estático;
3. faz o parse do GraphQL e exige uma única `OperationDefinition`, do tipo `query`, com nome;
4. associa o componente Inertia à operação.

Erros de build, com arquivo e posição:

- mais de um `pageQuery` no módulo, ou `pageQuery` que não é chamada `graphql()` estática;
- `pageQuery` que é mutation/subscription, ou sem nome;
- nome de operação ou fragment duplicado (o Codegen já falha em operações duplicadas, e o plugin
  verifica fragments);
- operação que o Codegen não produziu (documento inválido contra o schema).

Operações auxiliares (mutations, queries de "load more") podem existir no mesmo arquivo. Só o export
`pageQuery` define a operação principal.

### 4.4 Nome da página

A regra parte do diretório de páginas, o mesmo do `pages: '../pages'` do `createInertiaApp`:

```text
app/javascript/pages/posts/show.tsx        → posts/show
app/javascript/pages/admin/users/index.tsx → admin/users/index
```

É o caminho relativo a `pages/`, sem extensão. É o que o resolver do Inertia faz no sentido inverso, e o
que o `component_path_resolver` do `inertia_rails` gera (`"#{controller_path}/#{action}"`). O plugin
grava o nome no manifesto, então o Rails não reimplementa a regra.

---

## 5. Metadados no manifesto do Vite

### 5.1 Contrato

As páginas já são entradas do manifesto (`isDynamicEntry`, chave = caminho do fonte). O plugin anexa
dois campos:

```json
"pages/posts/show.tsx": {
  "file": "assets/show-BeR1wxic.js",
  "src": "pages/posts/show.tsx",
  "isDynamicEntry": true,
  "imports": ["entrypoints/inertia.tsx", "_AppLayout-ChajYtnC.js"],
  "inertia": {
    "component": "posts/show",
    "pageQuery": "PostShowPage"
  },
  "graphql": {
    "version": 1,
    "operations": {
      "PostShowPage": {
        "type": "query",
        "sha256": "<hex do documento>",
        "document": "fragment AuthorLine_User on User { __typename id name } fragment PostArticle_Post on Post { … } query PostShowPage($id: ID!) { … }",
        "variables": [{ "name": "id", "type": "ID!", "required": true }]
      }
    }
  }
}
```

- `inertia.component` é o nome lógico. O Rails indexa o manifesto por ele.
- `graphql.operations` lista as operações declaradas nos módulos daquele chunk: a `pageQuery`,
  mutations da página etc. Operações de componentes compartilhados ficam no chunk do componente.
  A união de todos os chunks é o conjunto de operações do build, base dos trusted documents (§10).
- `variables[].required` é `true` para tipo não nulo sem valor padrão.
- O manifesto é servido em `public/vite/.vite/manifest.json`. Os documentos já estão nos bundles JS
  públicos, então nada sensível entra ali.

### 5.2 Como é feito (validado)

No Vite 8 o manifesto é emitido pelo plugin nativo do rolldown, e o próprio Vite ajusta o asset em
`generateBundle` (o `native:manifest-compatible`). Um `generateBundle` com `order: 'post'` roda
depois desses, lê `bundle['.vite/manifest.json']`, adiciona os campos e reescreve o `source`. Testei
isso num build de produção deste repositório: o campo extra chega ao `manifest.json` final com os hashes
de produção.

Os chunks de página vêm de `bundle` (`chunk.facadeModuleId` = módulo da página). As operações de cada
chunk vêm de `chunk.moduleIds`, cruzado com os módulos em que o plugin encontrou `graphql()`.

Plano B, se uma versão futura do Vite mudar a ordem: emitir `.vite/inertia-graphql.json` com
`this.emitFile` no mesmo build. O Rails lê os dois pela mesma abstração, então trocar de estratégia não
afeta o resto.

### 5.3 Desenvolvimento

Com o dev server de pé não há manifesto, porque o `vite_ruby` aponta os assets para o servidor. O plugin
registra no dev server o middleware `GET /__inertia_graphql`, com o mesmo conteúdo indexado por
componente:

```json
{ "version": 1,
  "pages": { "posts/show": "PostShowPage", "admin/users/index": "UsersPage" },
  "operations": { "PostShowPage": { "type": "query", "sha256": "…", "document": "…", "variables": [] } } }
```

O resultado fica em memória e é invalidado quando um `.ts/.tsx` em `app/javascript` ou o
`schema.graphql` mudam. Esse evento também reroda o Codegen, e o HMR do browser recebe os
`DocumentNode` novos.

Sem dev server (`autoBuild` do `vite_ruby` em dev e teste), o build automático gera um manifesto
normal, e o caminho de produção vale.

---

## 6. Execução no Rails pelo Lighthouse

### 6.1 Peças

Em `app/graphql/page_queries/`:

```ruby
module PageQueries
  # Lê os metadados do build: manifesto do vite_ruby ou dev server.
  class Manifest
    def page(component)   # => Operation ou nil (página sem pageQuery)
    def operation(name)   # => Operation
    def operations        # => todas, para trusted documents
  end

  Operation = Data.define(:name, :type, :sha256, :document, :variables)

  class Preloader
    def initialize(context:, schema: BlogRailsSchema, manifest: PageQueries.manifest)
    def prepare(component, variables)  # valida já; devolve lambda que executa (ou nil)
  end
end
```

A paginação não tem peça no Rails: o servidor só executa a primeira página (§7.3).

`Manifest` escolhe a fonte como o `inertia_rails` escolhe a URL do SSR:

- `ViteRuby.instance.dev_server_running?` → `GET #{ViteRuby.config.origin}/__inertia_graphql` (timeout
  curto, mensagem clara se o dev server não tiver o plugin).
- Caso contrário → `ViteRuby.config.manifest_paths`, o mesmo merge que o `vite_ruby` faz. Com
  `auto_build` ligado (dev sem dev server, teste), dispara `ViteRuby.instance.builder.build` antes de ler,
  como o `vite_ruby` faz em `lookup`. Recarrega quando o `mtime` dos arquivos muda.
- Indexa as entradas por `inertia.component`, valida `graphql.version` e verifica que cada `pageQuery`
  aponta para uma operação existente. Senão, `ManifestError` com instrução de rebuild.

### 6.2 Execução

```ruby
result = Lighthouse::GraphQL::PersistedQueries.execute(
  schema,
  query: operation.document,
  variables: variables, operation_name: operation.name, context: context
).to_h
```

`PersistedQueries.execute` é a API pública que o `Lighthouse::GraphQL::Controller` usa. Ela chama
`schema.execute` e dispara os eventos `StartOperationOrOperations`/`EndOperationOrOperations`.
Os resolvers, as diretivas, o Dataloader e o `rescue_from` do schema são os mesmos de `/graphql`.

Os eventos de request do Lighthouse (`StartRequest`/`EndRequest`) não disparam, porque o request é
de página, não de GraphQL. Se algum listener depender deles, envolver a execução em `lighthouse_request`
fica como ajuste.

### 6.3 Contexto

- `current_user`: o da sessão (`ApplicationController#current_user`). O `GraphqlController` também aceita
  JWT e exige CSRF para sessão, mas aqui o request é um GET de página do próprio app e o resultado vai no
  HTML/JSON do Inertia, como qualquer página Rails autenticada.
- `remote_ip` e `lighthouse_controller`: o que o `@throttle` lê. O `rate_limit` usa o controller da
  página.
- `pundit_user`: não definido, então o Lighthouse usa `current_user` (`config.policy_user`).
- Tenant/locale: não há hoje. Se houver, entram em `page_query_context` a partir do request, nunca de
  `variables`.

### 6.4 Erros e observabilidade

- Resultado sem `data`: `ExecutionError` (500 em produção, página de erro em dev). Isso indica bug ou build
  dessincronizado, não algo que o usuário causou.
- `data` com `errors` (por exemplo, `email` negado por `@canRoot(action: RETURN_VALUE)`, ou `post` nulo
  por `@canResolved`): vai para a página em `page_query.errors`, e os campos afetados ficam `null`.
  Log em `warn` com operação e mensagens.
- Instrumentação: `ActiveSupport::Notifications.instrument("preload.page_queries", page:, operation:)`.
  O log mostra página, operação e duração, nunca as variáveis.

### 6.5 Formato de `page_query`

```json
{
  "id": "0b7c9a2e-…",
  "operation": "PostShowPage",
  "sha256": "…",
  "variables": { "id": "Z2lkOi8vYmxvZy1yYWlscy9Qb3N0LzE" },
  "data": { "__typename": "Query", "post": { "__typename": "Post", "id": "…", "name": "…" } },
  "errors": null
}
```

- `id`: único por execução (`SecureRandom.uuid`). O cliente o usa para escrever cada resultado na cache
  uma vez só, e não sobrescrever páginas carregadas por `fetchMore` quando o Inertia restaura a página
  do histórico (§7.3).
- `variables`: voltam ao cliente porque o `useQuery` precisa delas para ler a mesma entrada da cache.

---

## 7. Apollo: hidratação e paginação

### 7.1 Client por ambiente

`lib/apollo.ts` exporta `createApolloClient({ ssr })`:

- `cache`: `InMemoryCache({ possibleTypes, typePolicies })`, os dois gerados. O `possibleTypes` vem do
  `fragment-matcher` e diz ao cache que `Node` é `Post | User`, então fragments em interfaces e unions
  são casados de forma exata na escrita e na leitura, e não por heurística. As `typePolicies` de
  paginação vêm do `@paginate` do schema (§7.3).
- SSR: `ssrMode: true` e um link sem rede (um Observable que nunca emite). Tudo que a página mostra veio
  do preload. Uma query que não veio fica em `loading`, que é o mesmo estado da primeira renderização no
  browser, sem mismatch de hidratação.
- Browser: `HttpLink` para `/graphql` com o cookie `XSRF-TOKEN`.

O client entra pelo `withApp` do `createInertiaApp`:

```tsx
// ssr/ssr.tsx: withApp roda uma vez por render, então cada request tem client e cache próprios
withApp: (app) => <ApolloProvider client={createApolloClient({ ssr: true })}>{app}</ApolloProvider>

// entrypoints/inertia.tsx: um client para a visita toda; a cache sobrevive às navegações
const apolloClient = createApolloClient({ ssr: false })
withApp: (app) => <ApolloProvider client={apolloClient}>{app}</ApolloProvider>
```

O `AppLayout` deixa de criar o `ApolloProvider` e usa `useApolloClient()` para limpar a cache no
logout. Isso remove o singleton de módulo que hoje vazaria cache entre usuários no SSR.

### 7.2 `usePageQuery`

```ts
export function usePageQuery<TData, TVariables>(query: TypedDocumentNode<TData, TVariables>) {
  const pageQuery = usePage<{ page_query: PageQuery | null }>().props.page_query
  const client = useApolloClient()
  // erro claro se a página não foi renderizada com render_preloaded,
  // ou se o page_query é de outra operação

  // 1ª vez que este client vê este pageQuery.id: escreve na cache durante o render,
  // sem broadcast (outros componentes não podem atualizar no meio deste render)
  if (!written(client).has(pageQuery.id)) {
    written(client).add(pageQuery.id)
    client.cache.writeQuery({ query, variables: pageQuery.variables, data: pageQuery.data, broadcast: false })
    fresh = true
  }

  // Só para um id recém-escrito: repete com broadcast depois de montar e avisa queries já
  // montadas (ex.: router.reload({ only: ['page_query'] }) na mesma página)
  useLayoutEffect(() => { if (fresh) client.cache.writeQuery({ ...same, broadcast: true }) }, [pageQuery.id])

  return { ...useQuery(query, { variables: pageQuery.variables, fetchPolicy: 'cache-first' }),
           preloadErrors: pageQuery.errors ?? [] }
}
```

- A escrita acontece no render do componente da página, antes de os filhos renderizarem, então os
  componentes de fragment encontram tudo. Não depende de `Suspense` nem de efeitos.
- Ids já escritos ficam num `Set` por client. No SSR o client é por request, então nada sobrevive a ele.
- Navegação Inertia: cada visita traz um `page_query` com id novo, que é escrito antes de a página nova
  montar. Voltar no histórico restaura o mesmo id, que não é reescrito, e as páginas carregadas por
  `fetchMore` continuam na cache.
- Os dados foram executados com o mesmo documento (com `__typename`) que o `useQuery` lê, e as
  variáveis voltam do servidor. Por isso o `cache-first` encontra a entrada completa.

### 7.3 Paginação e infinite scroll

O servidor preenche só a primeira página. As seguintes são `fetchMore` no `/graphql`, feitas pelo
cliente. As duas formas de busca terminam na mesma lista, na cache do Apollo.

| Peça | Papel |
| --- | --- |
| Rails (`page_query`) | Primeira página, no SSR e na primeira visita, com a autorização da sessão |
| `/graphql` (`GraphqlController`) | Próximas páginas: mesma sessão (cookie + `X-XSRF-TOKEN`), mesmas diretivas e policies |
| Apollo | Junta as páginas na mesma entrada da cache, com a field policy gerada do `@paginate` |
| Sentinela (`IntersectionObserver`) | Dispara a próxima página. Virtualização é opcional |

#### Fluxo

```tsx
export const pageQuery = graphql(`
  query UsersPage($after: String) {
    users(first: 20, after: $after) {
      edges { cursor node { id ...UserRow_User } }
      pageInfo { hasNextPage endCursor }
    }
  }
`)

export default function Index() {
  const query = usePageQuery(pageQuery)
  const users = useConnection(query, (data) => data.users)  // { nodes, hasNext, fetchNext, loadingNext }

  return (
    <>
      {users.nodes.map((user) => <UserRow key={user.id} user={user} />)}
      <LoadMoreSentinel enabled={users.hasNext} loading={users.loadingNext} onVisible={users.fetchNext} />
    </>
  )
}
```

1. **Primeira carga:** `render_preloaded` executa `UsersPage` sem cursor. O SSR renderiza as 20
   primeiras linhas, o browser hidrata, e não há request a `/graphql`.
2. **Sentinela visível:** `fetchNext()` chama `fetchMore({ variables: { after: pageInfo.endCursor } })`,
   que faz POST em `/graphql`. O resultado entra pela field policy, e o `useQuery` da página recebe a
   lista maior.
3. **Mutations** (`UpdateUserRole`) atualizam a linha normalizada, venha ela da primeira página ou de
   um `fetchMore`.

O `controller` não muda: `render_preloaded` sem variáveis. Paginação não aparece no Rails.

#### Providers a partir do `@paginate`

O schema impresso mantém `@paginate(type:)` nos campos. Com isso o plugin gera:

- **`generated/type-policies.ts`:** uma field policy por campo paginado, com `keyArgs` = argumentos do
  campo menos os de paginação (`Query.users → relayStylePagination([])`,
  `Query.posts → relayStylePagination(['orderBy'])`). Substitui o merge escrito à mão em `lib/apollo.ts`.
- **`generated/pagination.ts`:** por operação, os campos paginados e a variável de cada um
  (`UsersPage: [{ path: ['users'], type: 'CONNECTION', variable: 'after' }]`). O `useConnection` usa
  isso para montar o `fetchMore` sem que a página repita o nome da variável.

| `@paginate` | Argumentos | Próxima página (`fetchMore`) | Field policy |
| --- | --- | --- | --- |
| `CONNECTION` | `first`, `after` | `{ after: pageInfo.endCursor }` se `hasNextPage` | `relayStylePagination(keyArgs)` |
| `PAGINATOR` | `first`, `page` | `{ page: paginatorInfo.currentPage + 1 }` se `hasMorePages` | merge por índice (`(page - 1) * first`), com o `paginatorInfo` mais recente |
| `SIMPLE` | `first`, `page` | igual ao `PAGINATOR` | igual ao `PAGINATOR` |

#### Hidratação e `fetchMore` convivendo

- **Id por execução:** o `page_query` traz um `id` único (§6.5), e o client do browser guarda os ids que
  já escreveu. O Inertia, ao voltar no histórico, restaura o mesmo `page_query`, com o mesmo id, que
  não é reescrito. A cache mantém todas as páginas carregadas, e a restauração de scroll do Inertia
  encontra a mesma altura.
- **Visita nova:** um id novo escreve a primeira página sem cursor. A field policy trata a ausência de
  cursor como início e substitui a lista pelos dados frescos.
- **Sem refetch:** o `cache-first` da página impede que a primeira página seja buscada de novo.

#### O que se perde em relação ao `<InfiniteScroll>` do Inertia

Ele e o `<WhenVisible>` não são usados, porque os dois sempre fazem `router.reload`.

- A URL não acompanha o scroll, e um refresh completo volta para a primeira página. As páginas
  carregadas sobrevivem às navegações do Inertia na mesma sessão, mas não a um reload.
- As páginas depois da primeira não passam pelo SSR. Isso só importa para SEO de listagens. Uma listagem
  pública que precise ser indexada usa paginação clássica com links (`?page=2` → `render_preloaded`
  com `$page`), e aí cada página tem SSR.

#### Virtualização

Não é consequência desta escolha. O `<InfiniteScroll>` do Inertia também não virtualiza: todos os itens
ficam no DOM. O que ele fazia aqui é substituído por uma sentinela de cerca de 20 linhas.

A virtualização (TanStack Virtual) é uma decisão à parte, para listas muito longas ou linhas pesadas.
Nesta abordagem ela encaixa bem: um `useVirtualizer` sobre `users.nodes` chama `fetchNext` quando o
último índice virtual chega perto de `nodes.length`. O `<InfiniteScroll>` do Inertia, ao contrário,
brigaria com ela, porque marca os filhos no DOM para sincronizar a URL. No SSR o virtualizer não tem
medidas, então a primeira página sai sem virtualização no servidor (ou com `initialRect`) para não haver
mismatch de hidratação.

#### Alternativa: cada página pelo Inertia

Vale quando cada página precisa ter URL própria e SSR (feeds públicos indexáveis). Nesse caso:

- `<InfiniteScroll data="page_query">` faz partial reload com o cursor, e o Rails executa a página.
- A lambda do `page_query` devolve `InertiaRails.scroll(metadados) { payload }`. O `inertia_rails` aceita
  um scroll prop vindo de closure, e o `HashAdapter` aceita os metadados.
- Como o merge de objeto no cliente é raso, o prop guarda só a última página, e o Apollo acumula.
- Precisa de providers Ruby (`pageInfo`/`paginatorInfo` → metadados) e reexecuta a operação inteira a
  cada página.

Fica fora desta versão. Os `type-policies` gerados servem às duas abordagens.

#### Listas fora da página

Um componente com query própria usa o mesmo `useConnection` sobre o seu `useQuery`. Sem preload, a
primeira página vem do cliente.

#### Refetch

`router.reload({ only: ['page_query'] })` refaz a primeira página no servidor (id novo, então a lista
recomeça).
---

## 8. Fragments e props tipadas

### 8.1 Primeira etapa: spreads explícitos

A página espalha os fragments dos componentes que renderiza. O Codegen embute as definições
transitivas no documento executável (página → `PostArticle_Post` → `AuthorLine_User`).

### 8.2 Contrato componente ↔ fragment

- O componente exporta seu fragment e recebe `FragmentType<typeof X_Fragment>`.
- `getFragmentData(X_Fragment, prop)` desmascara. É só tipo, sem custo em runtime, e funciona igual no
  SSR.
- O pai só consegue passar um objeto que espalhou o fragment, e o TypeScript acusa se faltar.

Escolhido o fragment masking do Codegen, e não o data masking do Apollo 4 (`dataMasking: true` +
`useFragment` lendo da cache). O do Apollo exige identidade de cache para cada objeto mascarado
(`__typename` + `id`/`keyFields`) e assinaturas de cache por componente. Pode ser uma evolução depois.

### 8.3 Composição automática pelo grafo de imports (opcional, depois)

Igual ao plano original: partir do módulo da página, percorrer imports estáticos, coletar os fragments
alcançáveis e compor a operação. O plugin já tem o grafo (`chunk.moduleIds` no build, o module graph em
dev). Continua valendo que imports dinâmicos e componentes condicionais não entram, e que a seleção raiz
precisa de uma regra explícita.

---

## 9. Schema e Codegen

- `config.schema_output = "schema.graphql"` (Lighthouse ≥ 0.8) reescreve `schema.graphql` (raiz) em dev,
  no boot e a cada reload, só se mudou: `watch_sdl` recarrega quando um `.graphql` muda, e o watcher do
  plugin reroda o Codegen. Fora de dev: `bin/rails lighthouse:print_schema WRITE=1`.
- CI: `bin/rails lighthouse:schema_output:verify` + `npm run codegen` + `npm run check` não podem deixar
  diff nem erro de tipo.
- `graphql.config.yml` (IDE) pode passar a apontar para `schema.graphql` e para os documentos em
  `app/javascript/**/*.tsx`, o que dá autocomplete nos `graphql()`.

---

## 10. Segurança, cache e deploy

- **Cache SSR por request:** um client novo em cada `withApp`, e nenhum singleton com dados de usuário no
  servidor.
- **Autorização:** só no Lighthouse/Pundit, com o usuário da sessão. `variables` não alteram o contexto.
- **Manifesto confiável:** é artefato do build, nunca entrada do usuário. Operação ausente gera
  `ManifestError`, e nada arbitrário é executado.
- **Sincronia do deploy:** o `assets:precompile` gera client, SSR e manifesto no mesmo build. A versão do
  Inertia é `ViteRuby.digest`, então um browser com bundle antigo recebe um full reload em vez de dados de
  outro documento.
- **Logs:** operação, página e duração, sem variáveis.
- **Trusted documents (fase 6):** o build já tem todas as operações com SHA-256 no manifesto. Para o
  browser mandar só o hash (`PersistedQueryLink` com `generateHash: doc => doc.__meta__.hash`) e para
  ligar `persisted_queries_only` em produção, o Lighthouse precisa ler essas operações. Hoje
  `config.persisted_queries_manifest` aceita só um caminho de arquivo. Opções em §13.

---

## 11. Fases

### Fase 0 — SSR do Inertia ✅

### Fases 1 a 5b ✅ (implementadas)

Onde cada peça ficou:

| Peça | Arquivo |
| --- | --- |
| Schema exportado | `schema.graphql` (`config.schema_output`, em dev a cada reload; `lighthouse:schema_output:verify` no CI) |
| Codegen | `codegen.ts` (client preset + `fragment-matcher`, sha256 em hex, `__typename`) |
| Plugin Vite | `vite/inertia-graphql/`: `scan.ts` (AST), `metadata.ts` (página → operação), `pagination.ts` (providers do `@paginate`), `generate.ts`, `index.ts` (manifesto e `/__inertia_graphql`), `cli.ts` (`npm run codegen`) |
| Gerados | `app/javascript/graphql/generated/`: tipos, `graphql()`, `getFragmentData`, `possible-types.ts`, `type-policies.ts`, `pagination.ts` |
| Rails | `app/graphql/page_queries/` (`Manifest`, `ViteSource`, `Preloader`), `app/controllers/concerns/page_query_rendering.rb` |
| Frontend | `app/javascript/graphql/` (`usePageQuery`, `useConnection`, `pagePagination`), `lib/apollo.ts`, `withApp` nos dois entrypoints |
| Páginas | `posts/index` (feed virtualizado), `posts/show` (post + comentários paginados), `admin/users/index` |

Além do plano:

- **Likes e comentários** (`Like`, `Comment`, `CommentPolicy`, `likePost`/`unlikePost` por classe,
  `createComment`/`updateComment`/`deleteComment` por diretivas, contadores por `counter_cache`,
  `viewerHasLiked` em lote por `Sources::ViewerLikes`).
- **`Post.path`:** a rota da página do post vem do Rails (`post_path`). O `id` do GraphQL é o global id,
  e a URL não deve ser montada a partir dele.
- **`@canFind` com `@spread`:** `find:` precisa do caminho com o argumento (`"input.id"`). Com `"id"`,
  a chave não é encontrada e a checagem passa sem autorizar nada. Coberto por teste em
  `test/integration/comments_test.rb`.
- **SSR desligado no ambiente de teste:** os testes cobrem o JSON do Inertia e o HTML sem o Node.

### Fase 6 — Trusted documents

- [ ] Lighthouse lendo as operações do manifesto (§13, decisão 4).
- [ ] `PersistedQueryLink` no browser.
- [ ] `persisted_queries_only` em produção.

### Fase 7 — Composição automática (opcional)

Como §8.3.

---

## 12. Testes

**Plugin (node:test; o Node 24 roda `.ts` direto):**

- Página com `pageQuery` sem fragments, com fragment local, com fragment importado e com cadeia
  transitiva.
- Duas `pageQuery`; `pageQuery` mutation; template com interpolação; fragment duplicado.
- Documento inválido contra o schema.
- Página sem query.
- Nome da página a partir do caminho.
- Build real: manifesto com `inertia`/`graphql` e hashes iguais aos `__meta__.hash`.

**Rails (Minitest):**

- `Manifest` com manifesto de fixture: indexação por componente, versão errada, operação ausente,
  `mtime`.
- `Preloader`: página sem query com e sem variáveis, variável desconhecida ou ausente, tipo inválido
  (`ExecutionError`), erro parcial (`errors` + `data`), anônimo × autor × admin, `@canResolved`
  negando.
- `render_preloaded`: prop reservada, prop lazy não executada em partial reload.
- Integração com o build real do ambiente de teste (`autoBuild`, `public/vite-test`).

**SSR/React:**

- O HTML de `/posts/:id` contém o título vindo da query.
- Dois requests de usuários diferentes não compartilham dados (`email` em `/admin/users`).
- Nenhuma requisição a `/graphql` no carregamento inicial.
- Navegação Inertia entre posts com variáveis diferentes.

**Paginação:**

- Field policies geradas: `keyArgs` sem os argumentos de paginação, merge de páginas em ordem, página
  sem cursor substituindo a lista.
- `useConnection`: variáveis do `fetchMore` por tipo (`after` × `page`), `hasNext` falso na última
  página.
- Primeira página preloaded + dois `fetchMore`: 60 linhas, sem duplicatas, sem refetch da primeira.
- Voltar no histórico do Inertia (mesmo `page_query.id`) mantém as 60 linhas, e uma visita nova (id novo)
  volta para 20.

---

## 13. Decisões a fechar

1. **Onde ficam os metadados.** Recomendado: campos `inertia`/`graphql` nas entradas do
   `.vite/manifest.json` (validado no Vite 8). Plano B: `.vite/inertia-graphql.json` emitido no mesmo
   build.
2. **Dev.** Recomendado: endpoint `/__inertia_graphql` no Vite dev server, mesmo padrão do SSR.
3. **Arquivos do Codegen no git.** Recomendado: versionar `schema.graphql` e
   `app/javascript/graphql/generated/*.ts` (o `tsc` funciona sem build, e diffs de tipo aparecem no PR).
   O que o Rails consome nunca é versionado: vem do build.
4. **Trusted documents no Lighthouse** (fase 6). Opções:
   - (a) estender o `lighthouse-graphql` para `persisted_queries_manifest` aceitar um objeto ou callable
     (`-> { PageQueries.manifest.operations.to_h { [_1.sha256, _1.document] } }`). É limpo e útil para
     outros apps.
   - (b) registrar as operações no store de APQ no boot ou deploy (`PersistedQueries.register`). Não
     funciona com `persisted_queries_only`, que só olha o manifesto.
   - Recomendado: (a). Até lá, o browser manda o texto da query, como hoje.
5. **Erros parciais.** Recomendado: `data` + `errors` vão para a página (`preloadErrors`). Ausência de
   `data` é exceção.
6. **Fragment masking.** Recomendado: do Codegen (`FragmentType`/`getFragmentData`). O data masking do
   Apollo fica para depois.
7. **Nome da prop.** `page_query` (snake_case, como as outras props do app).
8. **Página → componente.** Caminho relativo a `pages/` sem extensão, gravado pelo plugin no manifesto.
9. **Infinite scroll.** Recomendado: o servidor preenche a primeira página, e as seguintes são
   `fetchMore` em `/graphql` (§7.3). Alternativa para listagens que precisam de URL e SSR por página:
   `<InfiniteScroll>` do Inertia com execução de cada página no Rails.
10. **Virtualização.** Feita no feed (`posts/index`) com `useWindowVirtualizer` sobre os `nodes` do
    `useConnection`. No SSR, o `initialRect` fixo faz o servidor e a primeira renderização do browser
    mostrarem os mesmos primeiros posts, e não há mismatch de hidratação. A lista de comentários e a de
    usuários usam só a sentinela.

---

## 14. Resultado esperado

```ruby
def show
  post = Post.find(params[:id])
  authorize post
  render_preloaded variables: { id: post.to_gid_param }
end
```

```tsx
export const pageQuery = graphql(`query PostShowPage($id: ID!) { post(id: $id) { id name ...PostArticle_Post } }`)

export default function Show() {
  const { data } = usePageQuery(pageQuery)
  return <PostArticle post={data!.post!} />
}
```

A query e os fragments ficam no frontend. O build associa página, operação e documento e publica isso
no manifesto do Vite. O Rails lê o manifesto via `vite_ruby` (ou o dev server), executa pelo Lighthouse
com o usuário da sessão e manda o resultado pelo Inertia. O Apollo escreve na cache antes da primeira
renderização, no servidor e no browser.
