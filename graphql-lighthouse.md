# Plano de implementação: Inertia + Lighthouse GraphQL + Apollo SSR

## 1. Objetivo

Implementar um mecanismo de preload de operações GraphQL para páginas Inertia, integrando Laravel, Lighthouse, Vite, React SSR e Apollo Client.

A proposta deve permitir que:

- As operações e os fragments GraphQL sejam declarados inline nos arquivos `.tsx`, por meio de `graphql(\`...\`)`.
- Cada página Inertia tenha, no máximo, uma operação principal de página (`pageQuery`).
- Um plugin do Vite descubra as operações e os fragments durante o build e associe a operação da página à entrada correspondente no manifesto do Vite.
- O Laravel identifique a operação pelo nome da página Inertia, execute-a através do pipeline do Lighthouse e preserve o contexto de autenticação e tenant.
- O resultado inicial seja enviado nas props do Inertia.
- O Apollo Client receba os dados pré-carregados antes de os componentes React serem renderizados, tanto no SSR quanto no browser.
- Os componentes possam declarar fragments tipados, com uma evolução posterior para descoberta automática dos fragments usados pela árvore de componentes.

A API pública desejada para controllers é:

```php
return InertiaGraphQL::renderPreloaded('Posts/Show', [
    'props' => [
        'postId' => $post->id,
        'canEdit' => $request->user()->can('update', $post),
    ],
    'variables' => [
        'id' => $post->id,
    ],
]);
```

---

## 2. Arquitetura geral

O fluxo deve ser dividido em build-time e request-time.

### Build-time

1. O plugin do Vite examina os módulos TS/TSX relevantes.
2. Extrai documentos declarados com `graphql(\`...\`)`.
3. Registra operações e fragments, identificando nomes e dependências.
4. Valida a existência de no máximo uma operação principal por página.
5. Resolve os fragments referenciados pela operação da página.
6. Gera a operação GraphQL completa necessária à execução.
7. Associa a operação à página Inertia.
8. Incorpora metadados ao manifesto do Vite, ou gera um manifesto auxiliar quando a versão/configuração do Vite não permitir uma extensão segura do manifesto padrão.
9. O GraphQL Code Generator valida os documentos e gera tipos e artefatos usados pelo frontend.

### Request-time

1. O controller chama `InertiaGraphQL::renderPreloaded($page, $options)`.
2. O manager separa `props` e `variables`.
3. O preloader localiza a operação associada à página no registro de build.
4. O preloader executa a operação através do pipeline suportado pelo Lighthouse.
5. O resultado é retornado como parte de `initialGraphQL`.
6. O Inertia entrega as props à aplicação React.
7. O cliente Apollo escreve o resultado na cache normalizada antes da renderização dos componentes.
8. Os componentes consultam a cache e renderizam sem precisar repetir imediatamente a query já pré-carregada.

---

## 3. API Laravel: `InertiaGraphQL`

### 3.1 Assinatura pública

Implementar uma facade Laravel com a seguinte API:

```php
InertiaGraphQL::renderPreloaded(
    string $page,
    array $options = [],
): \Inertia\Response;
```

Formato de `$options`:

```php
[
    'props' => [
        // Props comuns do Inertia.
    ],
    'variables' => [
        // Variáveis da operação GraphQL associada à página.
    ],
]
```

As duas chaves são opcionais e assumem `[]` quando omitidas.

### 3.2 Exemplo de controller

```php
use App\Facades\InertiaGraphQL;

final class ShowPostController
{
    public function __invoke(Post $post): \Inertia\Response
    {
        return InertiaGraphQL::renderPreloaded('Posts/Show', [
            'props' => [
                'postId' => $post->id,
            ],
            'variables' => [
                'id' => $post->id,
            ],
        ]);
    }
}
```

O controller não deve precisar conhecer o nome da operação GraphQL, seu documento completo ou a lista de fragments. Essa relação é responsabilidade do registro gerado no build.

### 3.3 Manager

Criar um serviço, por exemplo `InertiaGraphQLManager`, responsável por coordenar o processo:

```php
namespace App\Inertia\GraphQL;

use Inertia\Inertia;
use Inertia\Response;

final class InertiaGraphQLManager
{
    public function __construct(
        private readonly PageQueryPreloader $preloader,
    ) {}

    public function renderPreloaded(
        string $page,
        array $options = [],
    ): Response {
        $props = $options['props'] ?? [];
        $variables = $options['variables'] ?? [];

        $this->validateOptions($options, $props, $variables);

        $initialGraphQL = $this->preloader->preloadPage(
            page: $page,
            variables: $variables,
        );

        if (array_key_exists('initialGraphQL', $props)) {
            throw new \InvalidArgumentException(
                'The initialGraphQL prop is reserved.',
            );
        }

        return Inertia::render($page, [
            ...$props,
            'initialGraphQL' => $initialGraphQL,
        ]);
    }

    private function validateOptions(
        array $options,
        array $props,
        array $variables,
    ): void {
        if (! is_array($props) || ! is_array($variables)) {
            throw new \InvalidArgumentException(
                'The props and variables options must be arrays.',
            );
        }
    }
}
```

O exemplo é ilustrativo: ajustar validações, tipos e exceções às convenções do projeto. A verificação de `initialGraphQL` deve acontecer antes da composição final das props.

### 3.4 Facade e container

Criar `App\Facades\InertiaGraphQL`, cujo accessor aponta para `InertiaGraphQLManager`, e garantir que o manager e o preloader sejam resolvidos pelo container Laravel. Se necessário, registrar bindings explícitos em um service provider.

### 3.5 Regras do contrato

- `page` é o nome lógico da página Inertia, por exemplo `Posts/Show`.
- `props` contém props convencionais da página.
- `variables` são enviadas à operação registrada para essa página.
- `initialGraphQL` é uma prop reservada e não pode ser sobrescrita pelo controller.
- Uma página sem operação GraphQL deve continuar funcionando com `props` comuns.
- Se forem fornecidas `variables` para uma página sem operação, falhar de forma explícita por padrão, em vez de ignorá-las silenciosamente.
- Erros de resolução da página, operação ausente, variáveis inválidas e execução GraphQL devem ser distinguíveis.
- Não permitir que opções fornecidas pelo controller substituam contexto de autenticação, autorização ou tenant confiável.

---

## 4. Plugin Vite: descoberta de documentos GraphQL inline

Criar um plugin próprio, por exemplo `inertia-page-queries`, integrado ao pipeline de build do Vite.

### 4.1 Sintaxe suportada

Os documentos permanecem dentro dos arquivos TS/TSX:

```tsx
import { graphql } from '@/graphql';

export const PostCard_PostFragment = graphql(`
  fragment PostCard_PostFragment on Post {
    id
    title
  }
`);
```

A página declara a operação principal:

```tsx
export const pageQuery = graphql(`
  query PostPageQuery($id: ID!) {
    post(id: $id) {
      ...PostCard_PostFragment
    }
  }
`);
```

Não exigir arquivos `.graphql` separados para esse fluxo.

A função `graphql` precisa ser reconhecível pela ferramenta de build e pelo Code Generator. Escolher uma implementação compatível com a estratégia adotada — por exemplo, uma função-tag usada para análise estática — e documentar que os documentos precisam ser estaticamente analisáveis.

### 4.2 Extração por AST

Preferir análise sintática dos módulos TS/TSX em vez de expressões regulares. O plugin deve:

1. Localizar chamadas `graphql` que recebam template literals estáticos.
2. Extrair o texto GraphQL.
3. Fazer parse dos documentos com a biblioteca GraphQL.
4. Identificar operações, fragments e seus nomes.
5. Registrar o módulo de origem de cada documento.
6. Reportar erros com caminho do arquivo e posição aproximada.

Template literals que dependam de interpolação dinâmica devem ser rejeitados ou tratados apenas se houver uma estratégia explícita e segura de resolução.

### 4.3 Registro de operações e fragments

Criar um registro interno semelhante a:

```ts
type GraphQLDocumentRecord = {
  sourceFile: string;
  operationNames: string[];
  fragmentNames: string[];
  document: string;
};
```

O registro final deve permitir localizar:

- A operação principal de cada página.
- O documento completo da operação, incluindo fragments transitivos.
- O conjunto de variáveis declaradas.
- Os módulos de origem e metadados úteis para diagnósticos.

Detectar nomes de operações e fragments duplicados. Não permitir que uma colisão seja resolvida silenciosamente por “último arquivo vence”.

### 4.4 Identificação das páginas Inertia

O plugin precisa de uma regra explícita para reconhecer os entry points das páginas, alinhada com a convenção usada pelo projeto para resolver nomes Inertia.

Exemplo de associação lógica:

```text
resources/js/Pages/Posts/Show.tsx
    -> Posts/Show
    -> pageQuery: PostPageQuery
```

Não inferir a identidade da página a partir de nomes de chunks gerados pelo Rollup. A associação deve partir do entry point real e de uma convenção determinística configurada.

### 4.5 Limite de uma query principal por página

- `pageQuery` identifica a operação principal da página.
- Uma página pode ter zero ou uma operação principal.
- Duas ou mais operações principais no mesmo entry point devem produzir erro de build.
- Fragments podem ser declarados em arquivos de componentes importados.
- Operações auxiliares podem existir, desde que não sejam confundidas com a operação principal da página.

A regra exata para detectar a declaração principal deve ser explícita, preferencialmente por export nomeado `pageQuery`, em vez de depender apenas de heurísticas sobre nomes de operações.

---

## 5. Integração com o manifesto do Vite

### 5.1 Metadados por página

O objetivo é tornar a relação entre entry point e operação acessível ao Laravel durante a requisição.

Exemplo conceitual do metadado desejado:

```json
{
  "resources/js/Pages/Posts/Show.tsx": {
    "file": "assets/Show-abc123.js",
    "isEntry": true,
    "pageQuery": {
      "operationName": "PostPageQuery",
      "documentId": "PostPageQuery"
    }
  }
}
```

Esse JSON é um exemplo do contrato pretendido, não uma garantia de que o Vite inclua campos arbitrários no manifesto nativamente.

### 5.2 Estratégia de implementação

Investigar e testar o mecanismo suportado pela versão concreta do Vite para estender os dados do manifesto. Não depender de uma mutação frágil do arquivo final em uma etapa sem garantias de ordenação.

Se a extensão segura não for possível, gerar um artefato auxiliar, como `inertia-page-queries.json`, no mesmo build. O Laravel deve consumir uma abstração de registro para não ficar acoplado a qual das duas estratégias foi escolhida.

A decisão deve ser validada com um teste de build real, incluindo build de produção e manifestos com hashes.

### 5.3 Contrato recomendado do registro

O registro deve associar o nome lógico da página a:

- Chave/entry point do Vite.
- Nome da operação principal.
- Documento GraphQL completo ou identificador estável para encontrá-lo.
- Lista de variáveis esperadas, quando útil.
- Versão/hash do artefato para diagnosticar incompatibilidades de deploy.

O documento executável precisa estar disponível ao servidor PHP. Não depender de um documento GraphQL que exista apenas dentro do bundle JavaScript do browser.

---

## 6. Execução no Laravel através do Lighthouse

### 6.1 `PageQueryPreloader`

Criar um serviço com uma interface aproximada:

```php
interface PageQueryPreloader
{
    public function preloadPage(
        string $page,
        array $variables = [],
    ): array;
}
```

O retorno deve conter o resultado necessário à hidratação, e não uma instância interna do Apollo Cache.

Formato inicial possível:

```php
[
    'operations' => [
        'PostPageQuery' => [
            'data' => [
                // Resultado GraphQL.
            ],
        ],
    ],
]
```

O formato definitivo precisa ser acordado com o código de hidratação do frontend. Não duplicar dados nem serializar objetos PHP internos.

### 6.2 Resolver a operação

1. Consultar o registro de build pelo nome lógico da página.
2. Se a página não tiver operação, retornar um estado vazio estável, por exemplo `['operations' => []]`.
3. Validar as variáveis contra o documento e as regras de execução.
4. Obter o documento GraphQL completo e o nome da operação.
5. Executar pelo pipeline público/suportado pelo Lighthouse, reutilizando a configuração GraphQL da aplicação.
6. Normalizar o resultado em um payload serializável para as props do Inertia.

Antes da implementação, verificar a API disponível na versão instalada do Lighthouse. Evitar acoplar a solução a classes internas instáveis ou recriar manualmente todo o pipeline GraphQL.

### 6.3 Contexto de execução

A execução deve preservar os mecanismos normais da aplicação para:

- Usuário autenticado e guard apropriado.
- Autorização aplicada pelos resolvers, policies e directives.
- Tenant e escopo de dados.
- Locale e outros contextos legítimos usados pelos resolvers.
- Tratamento de erros e logging.

Não criar um caminho alternativo que contorne middleware, directives de autorização ou regras de tenant. O contexto deve vir da requisição Laravel atual e de serviços confiáveis, não de valores arbitrários em `options`.

### 6.4 Erros e observabilidade

Definir como o sistema trata:

- Erros de validação GraphQL.
- Erros parciais com `data` e `errors`.
- Exceções de resolver.
- Operação não encontrada.
- Variáveis obrigatórias ausentes ou com tipo inválido.
- Manifesto desatualizado ou incompatível com o bundle implantado.

Registrar operação, página e duração sem expor dados sensíveis ou variáveis privadas. Não incluir tokens, credenciais ou payloads sensíveis em logs.

---

## 7. Apollo Client: hidratação do resultado inicial

### 7.1 Princípio

O Laravel não deve tentar reconstruir ou serializar a estrutura interna da cache normalizada do Apollo.

Em vez disso, deve enviar o resultado GraphQL e o frontend deve usar o documento gerado para inserir os dados na cache por meio de APIs públicas do Apollo, como `cache.writeQuery`.

### 7.2 Identidade da operação

O registro de frontend precisa resolver `operationName` para o documento GraphQL correspondente. Isso pode ser feito com artefatos gerados pelo plugin/Codegen, desde que o mecanismo de SSR e o browser usem os mesmos documentos e a mesma convenção de identificação.

O identificador deve ser determinístico e consistente entre build, servidor e cliente.

### 7.3 Sequência de hidratação

1. Receber as props Inertia, incluindo `initialGraphQL`.
2. Criar a instância de Apollo Client apropriada ao ambiente.
3. Criar uma cache nova para cada requisição SSR, evitando vazamento de dados entre usuários.
4. Para cada operação pré-carregada, resolver seu documento e suas variáveis.
5. Inserir o resultado com `cache.writeQuery({ query, variables, data })`.
6. Só então renderizar a árvore React que depende da cache.
7. No browser, repetir a hidratação antes da primeira renderização relevante, ou restaurar uma cache serializada se essa estratégia tiver sido implementada e testada.
8. Garantir que a primeira execução de `useQuery` encontre o resultado esperado e não dispare uma requisição redundante desnecessária.

`writeQuery` exige que o formato de `data` corresponda à seleção do documento e às variáveis usadas. Testar fragment spreads, tipos abstratos, aliases e campos ausentes.

### 7.4 SSR e browser

- SSR: cache isolada por request; nunca usar singleton global com dados específicos de usuário.
- Browser: reutilizar a instância da aplicação segundo o ciclo de vida do Inertia, evitando reinicializações desnecessárias.
- Navegação Inertia: hidratar o resultado da nova página antes de montar os componentes que dependem dele.
- Erros GraphQL: definir se são transportados para a UI, renderizados como estado de erro ou tratados por uma política de fallback.
- Não assumir que a cache do servidor pode ser serializada e usada diretamente pelo cliente sem um contrato explícito.

### 7.5 Suspense

Um `Suspense` pode ser usado para coordenar componentes que realmente dependem de carregamento assíncrono, mas não deve ser a principal garantia de ordenação da hidratação. A garantia deve vir de inicializar a cache antes de renderizar os componentes consumidores.

---

## 8. Fragments e composição de componentes

### 8.1 Primeira etapa: fragments explícitos

Permitir que a página declare spreads para fragments usados pelos componentes:

```tsx
export const pageQuery = graphql(`
  query PostPageQuery($id: ID!) {
    post(id: $id) {
      ...PostCard_PostFragment
    }
  }
`);
```

O plugin resolve dependências de fragments transitivas e inclui suas definições no documento executável.

Os fragments podem estar declarados inline em componentes importados; não é necessário movê-los para arquivos `.graphql`.

### 8.2 Contrato entre componente e fragment

Definir uma convenção para vincular fragment e componente, por exemplo:

```tsx
export const PostCard_PostFragment = graphql(`
  fragment PostCard_PostFragment on Post {
    id
    title
  }
`);
```

O componente deve receber dados compatíveis com o fragment e ter tipos gerados para esse contrato. O nome do fragment, por si só, não faz o resultado aparecer automaticamente nas props do componente: a aplicação precisa definir como os dados são passados e tipados.

### 8.3 Etapa avançada: descobrir fragments pela árvore de imports

Depois que a estratégia explícita estiver estável, explorar a composição automática:

1. Começar pelo entry point da página.
2. Percorrer o grafo estático de imports de componentes.
3. Descobrir os fragments declarados pelos módulos alcançáveis.
4. Compor uma operação de página a partir desses fragments e da seleção raiz da página.
5. Resolver dependências transitivas, imports compartilhados e duplicatas.
6. Validar a operação final contra o schema.

Essa etapa exige uma regra explícita para a seleção raiz da página. Fragments de componentes não substituem a necessidade de definir como buscar o objeto raiz e suas variáveis.

### 8.4 Limitações que precisam ser documentadas

- Imports dinâmicos e `React.lazy` podem não estar presentes no grafo estático inicial.
- Componentes carregados apenas em condições de runtime não devem ser adicionados silenciosamente à query.
- Ciclos de imports e fragments duplicados precisam de tratamento determinístico.
- A composição de campos GraphQL não injeta automaticamente props nos componentes React.
- Fragments de tipos incompatíveis com o tipo selecionado na raiz devem gerar erro de validação.

---

## 9. GraphQL Code Generator e validação

Configurar o GraphQL Code Generator para:

- Ler o schema usado pelo projeto.
- Validar os documentos GraphQL inline extraídos ou reconhecidos pelo Codegen.
- Gerar tipos das operações e fragments.
- Gerar tipos de variáveis e resultados.
- Fornecer artefatos de documentos compatíveis com Apollo e SSR.
- Falhar no CI quando houver erros de schema, spreads inválidos, operações duplicadas ou documentos sem tipo válido.

O Codegen não substitui o plugin do Vite: o Codegen gera tipos e artefatos GraphQL; o plugin faz a descoberta dos entry points Inertia, associa páginas a operações e produz os metadados necessários ao PHP.

Definir um comando único de validação/build para que a geração de documentos e o manifesto não fiquem fora de sincronia.

---

## 10. Segurança, cache e deploy

- Criar uma cache Apollo isolada por requisição SSR.
- Não compartilhar resultados de operações autenticadas entre usuários.
- Não usar cache HTTP compartilhada para resultados dependentes de usuário/tenant sem uma política explícita de particionamento.
- Preservar autorização e tenant no pipeline do Lighthouse.
- Não confiar em valores enviados pelo cliente para escolher tenant ou ampliar permissões.
- Garantir que manifesto, documentos do servidor e bundle do frontend pertençam ao mesmo build.
- Se o registro estiver ausente ou incompatível, falhar com mensagem diagnóstica clara; não executar uma operação arbitrária.
- Evitar registrar variáveis sensíveis e dados pessoais.
- Testar a aplicação em ambientes com SSR habilitado e desabilitado, se ambos forem suportados.

---

## 11. Plano de implementação por fases

### Fase 1 — Contratos e prova de conceito

- [ ] Confirmar versões de Laravel, Inertia, Vite, Lighthouse, React e Apollo Client.
- [ ] Definir o formato exato de `initialGraphQL`.
- [ ] Implementar `InertiaGraphQL` facade e `InertiaGraphQLManager`.
- [ ] Implementar o contrato de `PageQueryPreloader`.
- [ ] Criar uma página de demonstração com uma operação simples e variáveis.
- [ ] Validar execução pelo pipeline suportado pelo Lighthouse.

**Critério de saída:** um controller consegue chamar `InertiaGraphQL::renderPreloaded()` e receber o resultado GraphQL nas props Inertia.

### Fase 2 — Plugin Vite e registro de páginas

- [ ] Extrair documentos `graphql` inline por AST.
- [ ] Identificar a operação exportada como `pageQuery`.
- [ ] Mapear entry points para nomes lógicos Inertia.
- [ ] Resolver fragments transitivos.
- [ ] Detectar operações ou fragments duplicados.
- [ ] Gerar metadados de página no manifesto Vite ou em artefato auxiliar.
- [ ] Testar build de desenvolvimento e produção.

**Critério de saída:** o PHP consegue resolver, pelo nome da página, o documento GraphQL correto sem nomes de operação codificados manualmente nos controllers.

### Fase 3 — Execução e contexto Laravel

- [ ] Implementar lookup no registro gerado.
- [ ] Validar variáveis e operação.
- [ ] Executar via Lighthouse.
- [ ] Preservar autenticação, autorização e tenant.
- [ ] Padronizar erros e logs.
- [ ] Definir comportamento de páginas sem query.

**Critério de saída:** resultados corretos para usuários autenticados e anônimos conforme as regras da aplicação, sem contornar políticas de autorização.

### Fase 4 — Hidratação Apollo SSR e browser

- [ ] Gerar ou disponibilizar documentos executáveis no frontend.
- [ ] Inicializar Apollo antes da renderização.
- [ ] Escrever resultados pré-carregados na cache.
- [ ] Garantir cache SSR isolada por requisição.
- [ ] Testar navegação Inertia e consultas com variáveis.
- [ ] Confirmar que consultas pré-carregadas não causam fetch duplicado desnecessário.

**Critério de saída:** a página renderiza no servidor e no browser usando os dados pré-carregados da cache Apollo.

### Fase 5 — Fragments tipados

- [ ] Adotar fragments inline em componentes.
- [ ] Usar spreads explícitos na query da página.
- [ ] Integrar validação e tipos via Codegen.
- [ ] Definir a convenção de props tipadas por fragment.
- [ ] Testar fragments aninhados, reutilizados e dependências transitivas.

**Critério de saída:** os componentes podem declarar fragments inline e receber dados tipados a partir da operação da página.

### Fase 6 — Composição automática (opcional)

- [ ] Percorrer o grafo estático de imports.
- [ ] Descobrir fragments dos componentes alcançáveis.
- [ ] Definir como a página declara a seleção raiz.
- [ ] Gerar a operação composta.
- [ ] Documentar o comportamento de imports dinâmicos e componentes condicionais.
- [ ] Validar a operação composta contra o schema.

**Critério de saída:** a composição automática funciona de forma determinística e não altera silenciosamente a query conforme condições imprevisíveis de runtime.

---

## 12. Estratégia de testes

### Testes do plugin Vite

- Página com `pageQuery` e sem fragments.
- Página com fragment local.
- Fragment importado de componente.
- Cadeia de fragments transitivos.
- Duas operações principais na mesma página.
- Nome de fragment ou operação duplicado.
- Documento GraphQL inválido.
- Template literal dinâmico não suportado.
- Página sem query.
- Mapeamento correto entre entry point e nome Inertia.
- Manifesto final com metadados corretos em build de produção.

### Testes Laravel/Lighthouse

- Lookup por nome de página.
- Operação inexistente.
- Variáveis obrigatórias ausentes ou inválidas.
- Página sem query e sem variables.
- Página sem query com variables.
- Usuário autenticado e não autenticado.
- Autorização negada.
- Isolamento por tenant.
- Erro GraphQL parcial.
- Prop `initialGraphQL` fornecida pelo controller.
- Registro ausente ou incompatível com o build.

### Testes Apollo/React

- Dados disponíveis na cache antes do primeiro render.
- SSR com cache isolada por request.
- Navegação entre páginas Inertia.
- Operações com variáveis diferentes.
- Fragments e campos aninhados.
- Tratamento de erro GraphQL.
- Ausência de requisição duplicada para uma operação já pré-carregada.

### Testes de integração

Criar pelo menos um teste end-to-end com:

1. Uma página Inertia real.
2. Um `pageQuery` inline.
3. Um fragment declarado em um componente importado.
4. Uma variável fornecida pelo controller.
5. Execução no Lighthouse.
6. Dados entregues pelo Inertia.
7. Cache Apollo hidratada antes da renderização.
8. Verificação de que dados de um usuário/tenant não aparecem em outra requisição.

---

## 13. Decisões a fechar antes de produção

1. **Manifesto:** extensão direta validada do manifesto Vite ou artefato auxiliar.
2. **Identificação da página:** convenção exata para converter o caminho do entry point em nome Inertia.
3. **Documentos para PHP:** onde ficam os documentos GraphQL executáveis e como sua versão é sincronizada com o bundle.
4. **Formato de `initialGraphQL`:** estrutura que mapeia operações para documento, variáveis e resultado.
5. **Erros GraphQL:** se erros parciais serão enviados à UI, lançados ou tratados por uma política específica.
6. **SSR:** qual runtime executa o SSR e como ele recebe as props e os documentos.
7. **Composição de fragments:** começar com spreads explícitos; adotar composição automática somente depois de definir a seleção raiz e o contrato de props dos componentes.
8. **Política para páginas sem query:** retorno vazio estável e erro explícito quando `variables` forem fornecidas sem operação.

---

## 14. Resultado esperado

Ao final da primeira versão, o controller terá uma API pequena e estável:

```php
return InertiaGraphQL::renderPreloaded('Posts/Show', [
    'props' => [
        'postId' => $post->id,
    ],
    'variables' => [
        'id' => $post->id,
    ],
]);
```

A operação e seus fragments serão declarados inline no frontend. O plugin de build fará a associação entre página, operação e documento. O Laravel executará a query através do Lighthouse com o contexto correto. O resultado será enviado pelo Inertia e inserido na cache Apollo antes da renderização dos componentes.

A primeira versão deve priorizar uma cadeia explícita, validável e testável — `pageQuery` por página e fragment spreads explícitos. A descoberta automática de fragments pela árvore de imports é uma evolução posterior, não um requisito para provar o fluxo principal.
