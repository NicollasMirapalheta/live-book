-- ============================================================================
-- Live Book — esquema de persistência (Fase 2A)
--
-- Modelo: documento como JSONB único + histórico append-only (ADR-003, AD-011).
-- Escrita anônima autorizada por edit_token via RPC security definer (ADR-004,
-- AD-012); a tabela NÃO concede escrita a anon — as RPCs são a única porta.
--
-- Re-executável: create ... if not exists / or replace. Rodar de novo é seguro.
--
-- Limites espelham src/config/limits.ts (MAX_PAGES=400, MAX_DOC_BYTES=4 MB,
-- REVISION_CAP=20). Ao mudar lá, mude os literais aqui — o servidor é a autoridade.
--
-- Toda RPC fixa `search_path = ''` (security definer sem search_path fixo é
-- escalação de privilégio clássica); por isso todo objeto é schema-qualificado.
-- gen_random_uuid()/now()/octet_length/jsonb_array_length são de pg_catalog
-- (sempre no path), então dispensam qualificação.
-- ============================================================================

-- --- Tabelas -----------------------------------------------------------------

create table if not exists public.books (
  id          uuid primary key default gen_random_uuid(),
  doc         jsonb not null,
  rev         int not null default 1,
  -- colunas de sumário: escritas SÓ pelas RPCs, a partir do doc (fonte única).
  title       text not null,
  subtitle    text,
  surface     text not null,
  page_count  int not null default 0,
  cover       jsonb,                       -- AssetRef da capa (miniatura da estante); null na 2A
  visibility  text not null default 'link' check (visibility in ('private', 'link')),
  edit_token  uuid not null default gen_random_uuid(),  -- NUNCA exposto por leitura pública
  owner_id    uuid,                        -- gancho inerte de Identity (AD-004); dormente
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.book_revisions (
  id         uuid primary key default gen_random_uuid(),
  book_id    uuid not null references public.books(id) on delete cascade,
  doc        jsonb not null,
  rev        int not null,                 -- o rev que esta revisão arquivou
  created_at timestamptz not null default now()
);

create index if not exists book_revisions_by_book
  on public.book_revisions (book_id, rev desc);

-- --- View pública ------------------------------------------------------------
-- A porta de LEITURA para anon. Expõe tudo MENOS edit_token e owner_id, e só
-- volumes com visibility = 'link'. É security definer por construção (roda como
-- o dono da view, ignorando a RLS da tabela) — intencional: o segredo (edit_token)
-- não está entre as colunas, então não há o que vazar.

create or replace view public.books_public as
  select id, doc, rev, title, subtitle, surface, page_count, cover, visibility, updated_at
  from public.books
  where visibility = 'link';

-- Explicita o comportamento definer (não invocador) para não depender de default.
alter view public.books_public set (security_invoker = false);

-- --- RLS ---------------------------------------------------------------------
-- Ligada e SEM policies para anon = nega insert/update/delete/select direto na
-- tabela. anon lê só pela view; escreve só pelas RPCs. As seis operações que
-- scripts/check-rls.mjs deve ver falhar: insert/update/delete em books e as três
-- em book_revisions.

alter table public.books enable row level security;
alter table public.book_revisions enable row level security;

revoke all on public.books from anon;
revoke all on public.book_revisions from anon;
grant select on public.books_public to anon, authenticated;

-- --- RPCs (security definer, search_path fixo) -------------------------------

-- create_book: valida limites, insere, devolve id + rev + edit_token UMA vez.
create or replace function public.create_book(p_doc jsonb)
returns table (id uuid, rev int, edit_token text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pages int := coalesce(jsonb_array_length(p_doc -> 'pages'), 0);
  v_bytes int := octet_length(p_doc::text);
  v_id    uuid;
  v_token uuid;
begin
  if v_pages > 400 then raise exception 'too_large'; end if;
  if v_bytes > 4194304 then raise exception 'too_large'; end if;

  insert into public.books (doc, rev, title, subtitle, surface, page_count, visibility)
  values (
    p_doc,
    1,
    coalesce(p_doc ->> 'title', ''),
    p_doc ->> 'subtitle',
    coalesce(p_doc ->> 'surface', 'manuscript'),
    v_pages,
    'link'
  )
  returning public.books.id, public.books.edit_token into v_id, v_token;

  return query select v_id, 1, v_token::text;
end;
$$;

-- save_book: token + rev conferidos sob `for update`; arquiva, poda em 20, grava.
-- Conflito nunca vira sobrescrita silenciosa (DATA-08).
create or replace function public.save_book(
  p_book_id uuid,
  p_edit_token text,
  p_doc jsonb,
  p_base_rev int
)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_book  public.books%rowtype;
  v_pages int := coalesce(jsonb_array_length(p_doc -> 'pages'), 0);
  v_bytes int := octet_length(p_doc::text);
  v_next  int;
begin
  if v_pages > 400 then raise exception 'too_large'; end if;
  if v_bytes > 4194304 then raise exception 'too_large'; end if;

  select * into v_book from public.books where id = p_book_id for update;
  if not found then raise exception 'not_found'; end if;
  if v_book.edit_token::text <> p_edit_token then raise exception 'forbidden'; end if;
  if v_book.rev <> p_base_rev then raise exception 'rev_conflict'; end if;

  -- arquiva a versão atual antes de sobrescrever
  insert into public.book_revisions (book_id, doc, rev)
  values (p_book_id, v_book.doc, v_book.rev);

  -- poda: mantém só as 20 revisões mais recentes por rev, na mesma transação
  delete from public.book_revisions
  where book_id = p_book_id
    and id not in (
      select id from public.book_revisions
      where book_id = p_book_id
      order by rev desc
      limit 20
    );

  v_next := v_book.rev + 1;
  update public.books
     set doc        = p_doc,
         rev        = v_next,
         title      = coalesce(p_doc ->> 'title', title),
         subtitle   = p_doc ->> 'subtitle',
         surface    = coalesce(p_doc ->> 'surface', surface),
         page_count = v_pages,
         updated_at = now()
   where id = p_book_id;

  return v_next;
end;
$$;

-- restore_revision: aplica o doc de uma revisão como um novo save (arquiva o
-- atual e sobe o rev). Passa pela mesma porta save_book para uma regra só.
create or replace function public.restore_revision(
  p_book_id uuid,
  p_edit_token text,
  p_revision_id uuid
)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_doc jsonb;
  v_rev int;
begin
  select doc into v_doc
  from public.book_revisions
  where id = p_revision_id and book_id = p_book_id;
  if not found then raise exception 'not_found'; end if;

  select rev into v_rev from public.books where id = p_book_id;
  return public.save_book(p_book_id, p_edit_token, v_doc, v_rev);
end;
$$;

-- list_revisions: histórico é privado (exige token). anon não lê book_revisions
-- direto pela RLS, então esta RPC é a porta de leitura do histórico.
create or replace function public.list_revisions(p_book_id uuid, p_edit_token text)
returns table (id uuid, rev int, created_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
-- As colunas de saida (id, rev, created_at) viram variaveis e colidem com as
-- colunas homonimas de book_revisions no corpo. use_column resolve a favor da
-- coluna (o erro "column reference id is ambiguous", pego na verificacao ao vivo).
#variable_conflict use_column
declare
  v_token text;
begin
  select edit_token::text into v_token from public.books where id = p_book_id;
  if not found then return; end if;
  if v_token <> p_edit_token then raise exception 'forbidden'; end if;

  return query
    select r.id, r.rev, r.created_at
    from public.book_revisions r
    where r.book_id = p_book_id
    order by r.rev desc;
end;
$$;

-- delete_book: apaga o volume (cascade nas revisões). Idempotente: apagar o que
-- não existe é no-op.
create or replace function public.delete_book(p_book_id uuid, p_edit_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text;
begin
  select edit_token::text into v_token from public.books where id = p_book_id;
  if not found then return; end if;
  if v_token <> p_edit_token then raise exception 'forbidden'; end if;
  delete from public.books where id = p_book_id;
end;
$$;

-- claim_book: gancho DORMENTE de Identity (AD-004). Converte um volume anônimo
-- em volume de um usuário no primeiro login. Sem auth na v1, auth.uid() é null.
create or replace function public.claim_book(p_book_id uuid, p_edit_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text;
begin
  select edit_token::text into v_token from public.books where id = p_book_id;
  if not found then raise exception 'not_found'; end if;
  if v_token <> p_edit_token then raise exception 'forbidden'; end if;
  update public.books set owner_id = auth.uid() where id = p_book_id;
end;
$$;

-- book_referenced_asset_ids: uniao dos ids de asset citados pelo doc atual E por
-- todas as revisoes retidas (AD-025/AD-028). Espelha `collectAssetIds` do cliente:
-- o recursivo `$.**.asset.id` alcanca blocos de imagem e itens de galeria em capa,
-- contracapa e paginas, em qualquer profundidade. `gcAssets` remove do bucket o que
-- NAO esta neste conjunto — assim nenhuma imagem de versao restauravel e apagada.
create or replace function public.book_referenced_asset_ids(p_book_id uuid, p_edit_token text)
returns setof text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text;
begin
  select edit_token::text into v_token from public.books where id = p_book_id;
  if not found then return; end if;
  if v_token <> p_edit_token then raise exception 'forbidden'; end if;

  return query
    select q #>> '{}'
    from public.books b, lateral jsonb_path_query(b.doc, 'lax $.**.asset.id') q
    where b.id = p_book_id
    union
    select q #>> '{}'
    from public.book_revisions r, lateral jsonb_path_query(r.doc, 'lax $.**.asset.id') q
    where r.book_id = p_book_id;
end;
$$;

-- Escrita só pelas RPCs; concedidas a anon (e authenticated, para quando Auth entrar).
grant execute on function public.create_book(jsonb) to anon, authenticated;
grant execute on function public.save_book(uuid, text, jsonb, int) to anon, authenticated;
grant execute on function public.restore_revision(uuid, text, uuid) to anon, authenticated;
grant execute on function public.list_revisions(uuid, text) to anon, authenticated;
grant execute on function public.delete_book(uuid, text) to anon, authenticated;
grant execute on function public.claim_book(uuid, text) to anon, authenticated;
grant execute on function public.book_referenced_asset_ids(uuid, text) to anon, authenticated;

-- --- Bucket de assets: upload por convencao de path + teto de 2 MB (AD-028) --------
-- Bucket `book-assets` publico para LEITURA (AD-013): o segredo e o uuid do path.
-- A ESCRITA anon segue o mesmo modelo de segredo-por-uuid — sem login, o edit_token
-- nao chega a RLS de storage; a barreira efetiva e o path uuid impossivel de adivinhar
-- (consistente com AD-013). O teto de 2 MB por objeto espelha MAX_ASSET_BYTES de
-- src/config/limits.ts (2*1024*1024 = 2097152); ao mudar la, mude o literal aqui.
-- SPEC_DEVIATION: AD-028 pedia autorizacao "por edit_token"; sem infra de login a RLS
-- de storage nao consegue conferir o token, entao aplica-se o modelo uuid-como-segredo
-- do AD-013. Quando Auth entrar, apertar para owner_id.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('book-assets', 'book-assets', true, 2097152,
        array['image/webp', 'image/jpeg', 'image/png', 'image/avif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "book-assets leitura publica" on storage.objects;
create policy "book-assets leitura publica"
  on storage.objects for select
  using (bucket_id = 'book-assets');

drop policy if exists "book-assets upload anon" on storage.objects;
create policy "book-assets upload anon"
  on storage.objects for insert
  with check (bucket_id = 'book-assets');

drop policy if exists "book-assets remove anon" on storage.objects;
create policy "book-assets remove anon"
  on storage.objects for delete
  using (bucket_id = 'book-assets');
