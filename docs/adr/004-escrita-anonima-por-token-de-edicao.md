# ADR-004: Escrita anônima autorizada por token de edição via RPC

- **Date**: 2026-08-03
- **Status**: Accepted
- **Deciders**: nicollasMirapalheta
- **Tags**: security, database, auth

## Context and Problem Statement

A v1 não tem login. O autor cria um volume e compartilha um link de leitura; ninguém se
cadastra. Ainda assim, escrita precisa ser protegida: qualquer pessoa que descubra o id
de um volume não pode editá-lo.

Com RLS convencional e usuário anônimo, a policy natural seria "anon pode dar `update`
onde `owner_id is null`". Isso torna todo volume anônimo editável por qualquer um que
conheça o id — que aparece na URL de compartilhamento.

## Decision Drivers

- Sem cadastro na v1, mas Auth entra depois sem retrabalho
- O link de leitura é público por definição, então o id não é segredo
- Perder o acesso de edição do livro-presente é inaceitável
- Validação de limites (tamanho, número de páginas) precisa ser confiável

## Considered Options

- **A** — RLS permissiva para anônimos em linhas sem dono
- **B** — `edit_token` verificado por policy RLS
- **C** — `edit_token` verificado dentro de RPCs `security definer`
- **D** — Antecipar Auth e exigir login desde a v1

## Decision Outcome

Escolhida a **opção C**. Escrita anônima passa por três funções `security definer`:
`create_book`, `save_book` e `claim_book`. A tabela não concede `update`, `insert` nem
`delete` a `anon` — as RPCs são a única porta. O `edit_token` é devolvido uma única vez
na criação, e nunca sai por `select`: leitura pública passa pela view `books_public`,
que não expõe a coluna.

Como token em `localStorage` é frágil (limpar o browser apaga o acesso permanentemente),
a criação também exibe um **link de resgate** uma única vez, para o autor guardar fora
do browser.

### Positive Consequences

- Conhecer o id não dá poder de escrita; o token é o segredo, e ele não circula
- Validações de limite rodam no servidor, dentro da mesma transação do save
- `rev` é checado no mesmo lugar, então conflito de concorrência é detectado atomicamente
- `claim_book` já existe como gancho: no primeiro login, converte volumes anônimos em
  volumes do usuário. Sem ele, o dia da autenticação vira migração manual
- Ligar Auth depois não muda nenhuma policy de leitura, que já está escrita como
  `visibility = 'link' or owner_id = auth.uid()`

### Negative Consequences

- Autorização mora em PL/pgSQL, não em policy declarativa — menos legível e mais difícil
  de auditar do que RLS pura
- Três funções a manter, com o risco clássico de `security definer`: um `search_path`
  mal fixado vira escalação de privilégio
- Quem tiver o token tem poder total, sem revogação nem expiração na v1
- O link de resgate é mais um segredo que o autor pode perder

## Pros and Cons of the Options

### C — `edit_token` via RPC `security definer` ✅ Escolhida

- ✅ Nenhuma escrita direta na tabela para `anon`
- ✅ Validação, `rev` e histórico no mesmo lugar transacional
- ✅ Caminho de migração para Auth já embutido
- ❌ Lógica em PL/pgSQL; `security definer` exige cuidado com `search_path`

### B — `edit_token` por policy RLS

- ✅ Declarativo e auditável
- ❌ O token teria que ir na cláusula da policy, o que exige expô-lo ou passá-lo por
  configuração de sessão — frágil e fácil de vazar
- ❌ Validações de limite não cabem numa policy

### A — RLS permissiva em linhas sem dono

- ✅ Trivial de implementar
- ❌ Qualquer um com o link de leitura pode editar o volume
- ❌ Inaceitável para o caso de uso principal

### D — Exigir login desde a v1

- ✅ Resolve autorização com o mecanismo padrão do Supabase
- ✅ Elimina token, link de resgate e `claim_book`
- ❌ Adiciona cadastro, recuperação de senha e UI de conta antes do primeiro livro
- ❌ Contradiz a decisão de produto de não ter contas agora

## Links

- [ADR-003](003-documento-como-jsonb-com-historico.md) — o que `save_book` grava
- `SECURITY.md` — limitações assumidas do estágio sem login
- `AD-012`, `AD-017` em [STATE.md](../../.specs/STATE.md)
