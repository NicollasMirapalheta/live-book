# Casca visual das rotas — Validation

**Resultado**: PASS ✅
**Data**: 2026-08-05
**Método**: preview no navegador (medição de layout via JS) + gate de build. As ACs desta
feature são de camada de apresentação (CSS/altura), que não renderiza em jsdom
(`getBoundingClientRect` = 0); a verificação é o navegador real, não vitest — exceto
SHELL-05, que é comportamento de JSX e tem teste de unidade.

> Nota de processo: por ser feature dominada por CSS, a validação foi feita pelo autor via
> medição no navegador em vez de um Verifier com sensor de mutação (que não teria lógica
> onde morder além do SHELL-05, já coberto por unit). Transparente por design.

## Gate
- `npm run typecheck`: limpo.
- `npm test`: **318 passed, 2 skipped** (base 316 + 2 do SHELL-05).
- `npm run build`: verde.
- Caracterização da Fase 0: intacta (nenhuma mudança em `src/live-book/`).

## Evidência por AC (medição no navegador, viewport 1280×720)

| AC | Evidência | Veredito |
|---|---|---|
| SHELL-01 (altura do leitor) | `.app-reader` altura = 720 = `window.innerHeight`; `.lb-root` = 720 (cadeia `#root→app-reader→lb-root` contínua) | ✅ |
| SHELL-02 (reescala, sem scroll) | escala do palco = 0.619 (livro 10 pág) / 0.628 (álbum vazio) — **não** no piso 0.25; `hasVerticalScroll` = false | ✅ |
| SHELL-03 (criar/importar estilizados) | `/new`: bg `rgb(22,24,29)`=`--app-bg`, h1 Fraunces, botão pílula acento 44px, select 44px, resgate em bloco monospace com `overflow-wrap`. `/import`: bg escuro, drop `dashed 2px` min-height 180px | ✅ |
| SHELL-04 (loading/not-found) | not-found: bg escuro, `justify-content: center`, min-height 720, h1 "Volume não encontrado", link → `/` | ✅ |
| SHELL-05 (afordância de vazio) | álbum vazio: banner visível, texto "Este volume está vazio · Adicionar fotos", link → `/b/:id/import`, fundo de papel. Unit: `ReaderRoute.test.tsx` (2 casos: vazio mostra link; com página não mostra) | ✅ |

## Edge cases
- Volume vazio (0 páginas): altura correta (720) + banner — verificado no álbum criado ao vivo.
- Estante e side menu (já estilizados na 2B): sem regressão (mesmos tokens `--app-*`, CSS aditivo em arquivo novo).

## Escopo respeitado
- Nenhuma mudança em `src/live-book/` (motor, `AD-022`).
- `NewBookRoute` segue criando doc vazio (autoria é Fase 4) — só ganhou afordância, não conteúdo.
- Arquivos tocados: `src/ui/app-shell.css` (novo), `src/main.tsx` (import), `src/routes/ReaderRoute.tsx` (banner de vazio), `src/routes/__tests__/ReaderRoute.test.tsx` (2 testes).
