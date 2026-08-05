import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { LiveBook } from "../live-book";
import type { LiveBookApi } from "../live-book/types";
import { renderCover, renderPages } from "../book/renderPages";
import { getSurface } from "../book/surfaces/registry";
import { themeToVars } from "../book/schema";
import { loadForRender } from "../book/loadDoc";
import { resolveChapterPage } from "../book/chapters";
import type { BookDoc } from "../book/schema";
import type { RenderCtx } from "../book/RenderCtx";
import type { StorageAdapter } from "../data/StorageAdapter";
import { StorageUnavailableError } from "../data/StorageAdapter";
import { useAdapter } from "./AdapterContext";
import { leafForPage, pageForLeaf } from "./readerUrl";

/**
 * Leitor de um volume (LIB-01). Carrega o documento pelo adapter, PASSA por
 * `loadForRender` (migrate + sanitize — paga a dívida `AD-026`; sem isso, HTML da
 * rede iria ao DOM sem tratamento = XSS armazenado) e monta o `<LiveBook>` abrindo
 * na página da URL.
 *
 * O motor não conhece rota: recebe só `children` (=`renderPages`), `initialLeaf`,
 * `style` e a casca. A tradução URL↔folha mora aqui, via `readerUrl`/`units`.
 */

type LoadState =
  | { status: "loading" }
  | { status: "not-found" }
  | { status: "ready"; doc: BookDoc };

/** Rota conectada ao router: resolve params + adapter e delega ao `ReaderShell`.
 * Serve `/b/:id`, `/b/:id/p/:page` e `/b/:id/c/:slug`. */
export function ReaderRoute() {
  const { id, page, slug } = useParams();
  const adapter = useAdapter();
  return <ReaderShell adapter={adapter} id={id ?? ""} page={page} slug={slug} />;
}

export interface ReaderShellProps {
  adapter: StorageAdapter;
  id: string;
  /** Número impresso da URL (`/p/:n`), ainda como string. Ausente = abre na capa. */
  page?: string;
  /** Slug de capítulo (`/c/:slug`): resolve e redireciona para a URL canônica de página. */
  slug?: string;
}

export function ReaderShell({ adapter, id, page, slug }: ReaderShellProps) {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let alive = true;
    setState({ status: "loading" });
    adapter
      .getBook(id)
      .then((loaded) => {
        if (!alive) return;
        if (!loaded) {
          setState({ status: "not-found" });
          return;
        }
        // Borda de carga (AD-026): migra e sanitiza ANTES do primeiro render.
        const { doc } = loadForRender(loaded.doc);
        setState({ status: "ready", doc });
      })
      .catch((err) => {
        if (!alive) return;
        // Backend pausado/rede fora → segue em "carregando", nunca tela de erro.
        if (err instanceof StorageUnavailableError) return;
        setState({ status: "not-found" });
      });
    return () => {
      alive = false;
    };
  }, [adapter, id]);

  if (state.status === "loading") {
    return (
      <main className="app-reader app-reader--loading" aria-busy="true">
        <p>Carregando volume…</p>
      </main>
    );
  }

  if (state.status === "not-found") {
    return (
      <main className="app-reader app-reader--notfound">
        <h1>Volume não encontrado</h1>
        <p>Este volume não existe ou foi removido.</p>
        <Link to="/">Voltar à estante</Link>
      </main>
    );
  }

  // `/c/:slug`: já com o doc em mãos, resolve o capítulo e redireciona para a URL
  // canônica de página (uma única URL por posição). Slug inexistente → 1ª página.
  if (slug != null) {
    return <ChapterRedirect id={id} doc={state.doc} slug={slug} />;
  }

  return <ReaderView adapter={adapter} id={id} doc={state.doc} page={page} />;
}

function ChapterRedirect({ id, doc, slug }: { id: string; doc: BookDoc; slug: string }) {
  const navigate = useNavigate();
  useEffect(() => {
    const target = resolveChapterPage(doc, slug);
    navigate(`/b/${id}/p/${target}`, { replace: true });
  }, [id, doc, slug, navigate]);
  return (
    <main className="app-reader app-reader--loading" aria-busy="true">
      <p>Abrindo capítulo…</p>
    </main>
  );
}

function ReaderView({
  adapter,
  id,
  doc,
  page,
}: {
  adapter: StorageAdapter;
  id: string;
  doc: BookDoc;
  page?: string;
}) {
  const surface = getSurface(doc.surface);
  const maxPage = doc.pages.length;
  const navigate = useNavigate();
  const apiRef = useRef<LiveBookApi>(null);

  const ctx: RenderCtx = useMemo(
    () => ({
      doc,
      surface,
      mode: "read",
      assetUrl: (ref, size) => adapter.assetUrl(ref, size),
    }),
    [doc, surface, adapter],
  );

  const style = {
    ...themeToVars(surface.theme),
    ...themeToVars(doc.theme),
  } as CSSProperties;

  // Página ausente (rota /b/:id) abre na capa (leaf 0); com :n, na folha da página.
  // `useState` inicial no motor: só o primeiro valor conta (montagem).
  const initialLeaf = page == null ? 0 : leafForPage(Number(page), maxPage);

  // Volume sem miolo é esperado logo após "Novo volume" (autoria é a Fase 4). Sem um
  // aviso, um livro só de capa parece um bug (SHELL-05).
  const isEmpty = doc.pages.length === 0;

  // Virada do motor → URL. SEMPRE `replace` (AD-020): sem isso, folhear dezenas de
  // páginas enterra o botão voltar do navegador.
  const onLeafChange = useCallback(
    (leaf: number) => {
      const n = pageForLeaf(leaf, maxPage);
      navigate(`/b/${id}/p/${n}`, { replace: true });
    },
    [navigate, id, maxPage],
  );

  // URL → motor (back/forward do navegador muda `:n`). Guarda anti-laço: só chama
  // `goTo` quando a folha-alvo difere da atual, senão URL→goTo→onLeafChange→URL
  // realimenta. A ida-volta bijetiva de `readerUrl` nas folhas fecha o ciclo.
  useEffect(() => {
    if (page == null) return;
    const target = leafForPage(Number(page), maxPage);
    if (apiRef.current && apiRef.current.getLeaf() !== target) {
      apiRef.current.goTo(target);
    }
  }, [page, maxPage]);

  return (
    <main className="app-reader">
      <Link to="/" className="app-reader__back" aria-label="Voltar à biblioteca">
        <span aria-hidden="true">←</span> Biblioteca
      </Link>
      <LiveBook
        title={doc.title}
        subtitle={doc.subtitle}
        sound={false}
        windowRadius={surface.defaultWindowRadius}
        style={style}
        initialLeaf={initialLeaf}
        apiRef={apiRef}
        onLeafChange={onLeafChange}
        cover={renderCover(doc.cover, ctx)}
        backCover={renderCover(doc.backCover, ctx)}
      >
        {renderPages(doc, ctx)}
      </LiveBook>
      {isEmpty ? (
        <div className="app-reader__empty" role="note">
          <span>Este volume está vazio.</span>
          <Link to={`/b/${id}/import`}>Adicionar fotos</Link>
        </div>
      ) : null}
    </main>
  );
}
