# Live Book

Componente de livro digital que vira de verdade (CSS 3D + Framer Motion), evoluindo para
um produto com biblioteca, editor visual e múltiplos tipos de volume.

**Stack:** Vite + React 18 + TypeScript estrito + `motion` (v12). CSS plano com prefixo
`lb-`/`bk-`/`app-`. Sem Tailwind, sem estado global, sem CSS-in-JS.

---

## Leia antes de decidir

| Documento | Quando |
|---|---|
| [`.specs/STATE.md`](.specs/STATE.md) | **sempre** — log de decisões `AD-NNN` ativas |
| [`docs/domain/ubiquitous-language.md`](docs/domain/ubiquitous-language.md) | antes de nomear qualquer coisa |
| [`docs/architecture/overview.md`](docs/architecture/overview.md) | antes de criar módulo ou mover código |
| [`docs/adr/`](docs/adr/) | antes de contrariar uma decisão estrutural |
| [`docs/testing/strategy.md`](docs/testing/strategy.md) | antes de escrever teste |
| [`docs/design/design-system.md`](docs/design/design-system.md) | antes de escrever CSS |

---

## A regra que governa tudo

**O motor de virada não sabe que existe um produto em volta dele.**

`src/live-book/` recebe `children` e lê exatamente quatro props deles (`chapter`, `title`,
`tone`, `hideNumber`). Não conhece documento, bloco, surface, ingestor, rota ou storage.

Se aparecer um `import` de `src/book/`, `src/data/`, `src/routes/` ou `src/editor/` dentro
de `src/live-book/`, ou um `if (surface === …)` lá dentro, a arquitetura foi rompida.

### Arquivos protegidos (`AD-022`)

Foram afinados no commit de performance (300 páginas de ~3 → ~37 FPS sob throttle 4×).
Regressão ali é cara de diagnosticar e vale mais que qualquer feature do roadmap.

**Nunca editar:** `Leaf.tsx`, `constants.ts`.
**Nunca alterar dentro de `LiveBook.tsx`:** `Face`, `surfaceOf`, `faces`, `toc`,
`inWindow`, `surfaceCache`, `angles`.
**Nunca alterar:** geometria em `live-book.css`.

Mudanças permitidas no `LiveBook.tsx` são só as aditivas já aprovadas: props `style`,
`toolbar`, `wheelFlip`, `apiRef`; guarda de `contentEditable` no handler de teclado; e o
reenquadramento de retrato via `stageOffset` (`AD-005`).

Precisa mesmo mexer? Escreva um `AD-NNN` novo que supersede o `AD-022` **antes** de editar.

---

## Vocabulário — a fonte do bug histórico

"Página" significa **quatro** coisas neste projeto. Nunca use a palavra sem qualificar.

| Termo | O que é | Base |
|---|---|---|
| `FaceIndex` | um lado de uma folha, incluindo capa e guardas | 0 |
| `LeafIndex` | a lâmina que gira (2 faces) — e o estado de leitura | 0 |
| `PageNumber` | o número impresso no rodapé, só miolo | 1 |
| `BookPage` | unidade de conteúdo autoral no documento | — |

Confundir `LeafIndex` com `PageNumber` foi o bug da v1 (capítulos um spread adiante,
corrigido com `Math.ceil(f/2)`). Toda conversão passa por `src/book/units.ts` —
**nunca reimplemente inline**.

Também proibido: `kind` (use `surface` ou `ingestor`), "slide", "flipbook".

---

## Invariantes

1. `src/live-book/` não importa de `book/`, `data/`, `routes/` ou `editor/`
2. `renderPages` é pura — sem I/O, sem hooks, sem estado de módulo
3. `renderPages` devolve elementos **rasos**; blocos só montam dentro de `PageBody`
4. Nenhuma conversão entre face, folha e número fora de `src/book/units.ts`
5. `StorageAdapter.assetUrl` é **síncrona** (está no caminho de render)
6. A estante carrega `BookSummary`, nunca `BookDoc`
7. Bloco de `type` desconhecido sobrevive ao round-trip
8. Todo save carrega `rev`; conflito nunca vira sobrescrita silenciosa

---

## Fluxo de trabalho

Este projeto usa `tlc-spec-driven`. Trabalho novo passa por Specify → (Design) → (Tasks)
→ Execute, com profundidade proporcional ao escopo.

- Teste deriva do critério de aceite da spec, **nunca** espelha a implementação (`AD-016`)
- Um commit atômico por tarefa
- Nunca enfraquecer, pular ou apagar teste para fazer passar
- Decisão de nível de projeto vira `AD-NNN` em `.specs/STATE.md`; decisão local fica no
  `design.md` da feature

## Comandos

```bash
npm run dev          # servidor de desenvolvimento (porta 5173)
npm run typecheck    # tsc --noEmit — o gate mínimo, sempre antes de commit
npm run build        # tsc -b && vite build
```

Para rodar o app, use o preview do harness (`.claude/launch.json`, alvo `dev`), nunca
`npm run dev` em background pelo shell.

> `npm run shots` está quebrado neste ambiente: `shot.mjs` tem `executablePath` fixo num
> caminho Linux. Precisa resolver o browser pelo Playwright antes de ser usado.

---

## Contexto de produto

- Alvo explícito inclui **máquinas fracas** e volumes de 300+ páginas. Performance é
  requisito, não otimização.
- A **virada é o produto**. `prefers-reduced-motion` reduz o acessório (hover, painéis),
  nunca a virada.
- Primeiro entregável real é um álbum de fotos com prazo. Ele manda na priorização.
- Sem login na v1: acesso por link, escrita por token. Auth e billing entram depois, e os
  ganchos (`owner_id`, `claim_book`) já existem inertes.
