# Documentação do Live Book

## Por onde começar

| Se você quer… | Leia |
|---|---|
| entender o projeto em 5 minutos | [`../CLAUDE.md`](../CLAUDE.md) |
| saber o que já foi decidido e por quê | [`../.specs/STATE.md`](../.specs/STATE.md) |
| nomear qualquer coisa | [domain/ubiquitous-language.md](domain/ubiquitous-language.md) |
| criar módulo ou mover código | [architecture/overview.md](architecture/overview.md) |
| contrariar uma decisão estrutural | [adr/](adr/) |
| escrever CSS | [design/design-system.md](design/design-system.md) |
| escrever teste | [testing/strategy.md](testing/strategy.md) |
| saber o que vem depois | [roadmap.md](roadmap.md) |

---

## Estrutura

```
.specs/STATE.md          memória viva: decisões AD-NNN + handoff de sessão
.specs/features/         specs por feature (spec, design, tasks, validation)

docs/
├── domain/              linguagem ubíqua e mapa de contextos
├── architecture/        visão geral, fronteiras, invariantes
├── adr/                 decisões estruturais imutáveis
├── design/              sistema visual
├── testing/             estratégia e camadas de teste
└── roadmap.md           fases de entrega
```

**`.specs/STATE.md` é vivo; `docs/adr/` é imutável.** Uma decisão nova nunca edita um ADR
antigo — cria outro que o supersede e marca o anterior. O histórico é a trilha de auditoria.

---

## Decisões estruturais

| ADR | Decisão | Impacto se revertida |
|---|---|---|
| [001](adr/001-superficie-como-unico-eixo-de-variacao.md) | Superfície como único eixo armazenado | reescrita do schema e do registry |
| [002](adr/002-traducao-de-documento-por-funcao-pura.md) | Tradução documento→páginas por função pura | sumário, numeração e virtualização quebram |
| [003](adr/003-documento-como-jsonb-com-historico.md) | Documento em JSONB + histórico de revisões | migração de dados de todos os volumes |
| [004](adr/004-escrita-anonima-por-token-de-edicao.md) | Escrita anônima por token via RPC | brecha de segurança ou exigência de login |
| [005](adr/005-orcamento-de-imagem-e-janela-de-virtualizacao.md) | 1100 px e janela 2 para memória de textura | máquina alvo trava ao folhear com fotos |
| [006](adr/006-unidades-de-paginacao-como-tipos-distintos.md) | Unidades de paginação como tipos distintos | volta a classe de bug da v1 |

---

## Convenções

**Idioma.** Documentação, comentários e mensagens de commit em português. Identificadores
de código em inglês.

**Prefixos de CSS.** `lb-` motor · `bk-` blocos de conteúdo · `app-` cromo do produto.
Nunca cruzar: `--lb-*` não aparece fora da página, `--app-*` não aparece dentro dela.

**Skills.** O projeto usa `tlc-spec-driven` como método de trabalho. As 18 skills da
[Tech Leads Club](https://github.com/tech-leads-club/agent-skills) instaladas em
`.claude/skills/` são versionadas junto com o projeto, e `.agents/.skill-lock.json`
registra as versões.

**Harness.** `scripts/guard-engine.mjs` bloqueia edição dos arquivos protegidos do motor
(`AD-022`) e avisa nos demais; `scripts/check-types.mjs` roda `typecheck` ao fim de cada
sessão. Configurados em `.claude/settings.json`.
