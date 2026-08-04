# Fase 3 — Imagens, surface `album` e modo retrato

**Escopo**: Complex
**Status**: Draft
**Pré-requisito**: Fases 2A e 2B concluídas

## Problem Statement

Falta o que torna o livro-presente possível: colocar fotos dentro dele. E falta o que
torna o presente **entregável**: hoje, num viewport de 390 px, `fit()` limita a escala em
0.25 ([useStageScale.ts:56](../../../src/live-book/useStageScale.ts)) e cada página fica com
~140 px. O link vai ser aberto no celular. Ilegível não serve.

Esta é a fase de maior risco do projeto: é o único lugar onde a geometria do motor é
alterada (`AD-005`), e é onde a memória de textura pode derrubar a máquina alvo (`AD-014`).

Por `AD-023`, a surface `album` também é entregue aqui, junto do pipeline que a torna
exercitável.

## Goals

- [ ] Foto entra num volume sem estourar memória de textura nem cota de armazenamento
- [ ] O volume é legível no celular **com a virada 3D preservada**
- [ ] `album` existe como surface completa, com tema, layouts e molduras
- [ ] Metas de performance são verificadas por máquina, não por impressão

## Out of Scope

| Item | Motivo |
|---|---|
| Editor visual | Fase 4 — aqui o upload é exercitado por rota de importação simples |
| Import de PDF | Fase 6 |
| HEIC | detectado e recusado com mensagem; `heic2any` custa 1.4 MB |
| Zoom/lightbox | variante `full` fica desligada por padrão |
| Leitor vertical alternativo | rejeitado: a virada é o produto (`AD-005`) |

---

## Assumptions & Open Questions

| Assunção / decisão | Default escolhido | Razão | Confirmado? |
|---|---|---|---|
| Resolução da variante `page` | 1100 px no maior lado | teto real de exibição é 1120×1520 em DPR 2; o palco só encolhe | s |
| Janela de virtualização com imagem | `windowRadius = 2` | 10 faces ≈ 36 MB de textura, contra ≈ 138 MB com raio 4 | s |
| Processamento | worker no cliente | decodificar 12 MP na main thread trava a UI ~400 ms, 30× num drop de pasta | s |
| `loading` das imagens | `eager`, nunca `lazy` | faces de verso ficam `visibility: hidden` em contexto `preserve-3d`; o heurístico do lazy é inconsistente e a foto chegaria durante a virada | s |
| Original em alta | não guardado por padrão | cota gratuita de 1 GB | s |
| Gatilho do modo retrato | `matchMedia("(max-aspect-ratio: 3/4)")` | separa celular em pé de tablet e desktop | **n** |
| Navegação em retrato | swipe alterna lado do spread; no limite, vira a folha | mantém a virada como gesto principal | **n** |

**Open questions:** o gatilho e o gesto do modo retrato precisam de protótipo em celular
real antes de virar tarefa — nenhum dos dois é decidível no papel.

---

## Dimensões implícitas

| Dimensão | Cobertura |
|---|---|
| Validação e limites | tipos aceitos `jpeg/png/webp/avif`; HEIC recusado por magic bytes; teto de 2 MB por objeto no bucket |
| Falha e falha parcial | upload em lote é retomável; o documento registra o que já subiu |
| Idempotência | reenviar o mesmo arquivo gera novo `assetId`; a coleta de órfãos limpa o que saiu do documento |
| Fronteiras de autorização | herdadas de 2A; upload passa pelo adapter |
| Concorrência | upload em pipeline (processa N+1 enquanto sobe N), serial por arquivo |
| Ciclo de vida do dado | `gcAssets` no save remove assets fora do documento |
| Observabilidade | métricas de FPS e faces montadas viram asserção de teste, não log |
| Falha de dependência externa | falha de upload preserva o arquivo na fila e permite retomar |
| Integridade de transição | ingestão cancelada não deixa página parcial no documento |

---

## User Stories

### P1: Pipeline de imagem ⭐ MVP

**Acceptance Criteria**:

1. QUANDO uma imagem é processada ENTÃO DEVEM ser produzidas as variantes `page` (1100 px), `thumb` (320 px) e `lqip` (20 px)
2. QUANDO a orientação EXIF indica rotação ENTÃO a imagem processada DEVE sair na orientação correta
3. QUANDO o processamento roda ENTÃO DEVE ocorrer em worker, e a thread principal NÃO DEVE bloquear por mais de 50 ms por arquivo
4. QUANDO `OffscreenCanvas` não existe ENTÃO DEVE haver fallback funcional na main thread, um arquivo por vez
5. QUANDO um arquivo HEIC é escolhido ENTÃO DEVE ser recusado com mensagem explicando exportar como JPEG
6. QUANDO a variante `page` é gerada ENTÃO DEVE pesar no máximo 200 KB
7. QUANDO o `lqip` é gerado ENTÃO DEVE ser embutido no documento como data URL de no máximo 1 KB

---

### P1: Imagem no volume sem estourar memória ⭐ MVP

**Acceptance Criteria**:

1. QUANDO um volume com fotos é folheado com `windowRadius = 2` ENTÃO no máximo 10 faces DEVEM estar montadas
2. QUANDO uma imagem é renderizada ENTÃO DEVE emitir `width` e `height`, e o `lqip` DEVE pintar antes de qualquer requisição
3. QUANDO 20 páginas com foto são folheadas sob throttle 4× de CPU ENTÃO a taxa de quadros DEVE ficar em ao menos 30 FPS
4. QUANDO a folha atual muda ENTÃO as imagens das folhas vizinhas DEVEM ser pré-carregadas em tempo ocioso
5. QUANDO uma imagem é renderizada ENTÃO `loading` NÃO DEVE ser `lazy`

---

### P1: Surface `album` ⭐ MVP

**Acceptance Criteria**:

1. QUANDO um volume `album` é aberto ENTÃO DEVE usar tema próprio, margens estreitas e `defaultWindowRadius = 2`
2. QUANDO os layouts são listados ENTÃO DEVEM existir `full-bleed`, `single`, `duo`, `grid`, `photo-text` e `text`
3. QUANDO uma página usa `full-bleed` ENTÃO a imagem DEVE sangrar até a borda e a numeração NÃO DEVE aparecer
4. QUANDO uma moldura é aplicada ENTÃO `plain`, `polaroid`, `bleed` e `circle` DEVEM produzir resultados distintos
5. QUANDO `album` é registrada ENTÃO nenhum arquivo existente DEVE precisar de alteração

---

### P1: Modo retrato com a virada preservada ⭐ MVP

**User Story**: Como leitora abrindo o link no celular, quero conseguir ler o livro e ver
as páginas virarem, porque a virada é o que torna esse presente diferente de uma galeria.

**Why P1**: Sem isso o presente não é entregável. É P0 de cronograma, não backlog.

**Acceptance Criteria**:

1. QUANDO o viewport é 390×844 ENTÃO a página exibida DEVE ter ao menos 320 px de largura
2. QUANDO uma página é virada em retrato ENTÃO a animação de virada 3D DEVE ocorrer, igual ao desktop
3. QUANDO o usuário desliza dentro de um spread ENTÃO o enquadramento DEVE alternar entre a página esquerda e a direita
4. QUANDO o usuário desliza além do limite do spread ENTÃO o sistema DEVE virar a folha e reposicionar o enquadramento
5. QUANDO o viewport volta a ser largo ENTÃO o modo retrato DEVE ser desativado sem recarregar
6. QUANDO o modo retrato está implementado ENTÃO **toda a caracterização da Fase 0 DEVE continuar verde**
7. QUANDO o modo retrato está desativado ENTÃO o comportamento em desktop DEVE ser idêntico ao anterior

---

### P2: Verificação automatizada de performance

**Acceptance Criteria**:

1. QUANDO a suíte e2e roda ENTÃO DEVE medir FPS ao folhear e falhar abaixo de 30
2. QUANDO a suíte e2e roda ENTÃO DEVE contar as faces montadas e falhar acima de 10
3. QUANDO `shot.mjs` é executado ENTÃO DEVE resolver o navegador pelo próprio Playwright, e não por caminho fixo

---

## Edge Cases

- QUANDO uma imagem é maior que 8000 px ENTÃO DEVE ser processada ou recusada com mensagem, nunca travar
- QUANDO o arquivo não é imagem apesar da extensão ENTÃO DEVE ser recusado sem quebrar o lote
- QUANDO o upload falha no meio do lote ENTÃO os já enviados DEVEM permanecer e o lote DEVE ser retomável
- QUANDO uma imagem é removida do documento ENTÃO seus assets DEVEM ser coletados no save seguinte
- QUANDO uma imagem tem proporção extrema ENTÃO a moldura DEVE conter sem distorcer
- QUANDO o dispositivo é tablet em pé ENTÃO o gatilho de retrato NÃO DEVE disparar (aspecto acima de 3/4)

---

## Requirement Traceability

| ID | Story | Fase | Status |
|---|---|---|---|
| MEDIA-01 | Pipeline — variantes e EXIF | — | Pending |
| MEDIA-02 | Pipeline — worker e fallback | — | Pending |
| MEDIA-03 | Pipeline — limites e recusa de formato | — | Pending |
| MEDIA-04 | Render — memória e faces montadas | — | Pending |
| MEDIA-05 | Render — LQIP, reserva de caixa e prefetch | — | Pending |
| MEDIA-06 | Surface `album` — tema e layouts | — | Pending |
| MEDIA-07 | Surface `album` — molduras | — | Pending |
| MEDIA-08 | Retrato — legibilidade | — | Pending |
| MEDIA-09 | Retrato — virada preservada e gesto | — | Pending |
| MEDIA-10 | Retrato — sem regressão em desktop | — | Pending |
| MEDIA-11 | Verificação automatizada de performance | — | Pending |

---

## Success Criteria

- [ ] 20 páginas com foto sob throttle 4× mantêm ≥ 30 FPS
- [ ] No máximo 10 faces montadas com `windowRadius = 2`
- [ ] Em 390×844 a página é legível **e a virada acontece**
- [ ] A caracterização da Fase 0 continua verde depois de mexer em `stageOffset`
- [ ] Um álbum de 60 fotos cabe em menos de 15 MB de armazenamento
