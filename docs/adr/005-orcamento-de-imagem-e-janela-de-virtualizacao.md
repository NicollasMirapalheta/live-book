# ADR-005: Orçamento de imagem e janela de virtualização para máquina fraca

- **Date**: 2026-08-03
- **Status**: Accepted
- **Deciders**: nicollasMirapalheta
- **Tags**: performance, media, memory

## Context and Problem Statement

Máquinas fracas com GPU integrada são alvo explícito do projeto, e o motor foi afinado
para isso (300 páginas de ~3 para ~37 FPS sob throttle 4x de CPU). Introduzir fotos
ameaça esse resultado por um caminho que o throttle de CPU não mede: **memória de textura**.

O motor mantém uma janela de folhas montadas em volta do spread. Com o raio padrão de 4
são 9 folhas × 2 faces = 18 superfícies vivas. Se cada face tiver uma foto de 1600 px,
a conta é 18 × 1600 × 1200 × 4 B ≈ **138 MB** de textura — o suficiente para derrubar
uma GPU integrada ou forçar swap de VRAM, que aparece como travamento na virada.

## Decision Drivers

- Máquina fraca é requisito, não otimização
- Cota gratuita do Supabase Storage: 1 GB
- Upload acontece em lote (arrastar uma pasta de fotos), na thread do usuário
- A página tem 560×760 CSS px e o palco **só encolhe** (`fit` limita em 1)

## Considered Options

- **A** — Uma variante única em resolução alta (1600 px), raio de janela padrão
- **B** — Variante `page` a 1100 px + `windowRadius = 2` para surfaces com imagem
- **C** — `srcSet` com múltiplas resoluções, escolhidas por `devicePixelRatio`
- **D** — Processar imagem no servidor (Edge Function) em vez do cliente

## Decision Outcome

Escolhida a **opção B**. A variante que a folha renderiza (`page`) tem 1100 px no maior
lado, em WebP com qualidade 0.80, e surfaces com imagem usam `windowRadius = 2`. O
pipeline roda em worker no cliente, produzindo quatro variantes: `page` (1100 px),
`thumb` (320 px), `full` (1600 px, desligada por padrão) e `lqip` (20 px como data URL
dentro do próprio documento).

O teto real de resolução é 1120×1520 (560×760 em DPR 2), porque o palco nunca amplia.
Renderizar 1600 px queima 45% mais memória de textura sem entregar um pixel visível.

Com `page` a 1100 px e raio 2 são 10 faces montadas: ≈ 36 MB. Vive.

### Positive Consequences

- Memória de textura cai de ~138 MB para ~36 MB, quase 4×
- Cada foto pesa 90–160 KB, então 300 páginas cabem folgadas na cota gratuita
- O `lqip` mora no documento e pinta antes de qualquer requisição — zero layout shift
  e nenhuma rede no caminho crítico
- Worker mantém a thread principal livre: decodificar 12 MP na main thread trava a UI
  por ~400 ms, e num arrastar de pasta isso acontece 30 vezes seguidas

### Negative Consequences

- Foto full-bleed pode granular em monitor 4K, e essa perda é irreversível: o original
  em alta não é guardado por padrão
- Raio 2 encurta a cascata de animação em saltos grandes, tornando a virada visualmente
  menos rica que em surfaces de texto
- Quatro variantes por imagem multiplicam o número de objetos no bucket e o trabalho
  de coleta de órfãos
- Sem `OffscreenCanvas` o fallback processa na main thread, e nesses navegadores a
  experiência de upload em lote é sensivelmente pior

## Pros and Cons of the Options

### B — 1100 px + raio 2 ✅ Escolhida

- ✅ Cabe no orçamento de memória da máquina alvo
- ✅ Resolução casada com o teto real de exibição; nada é desperdiçado
- ❌ Sem margem para zoom ou telas de densidade muito alta

### A — 1600 px, raio padrão

- ✅ Melhor qualidade em qualquer tela; nenhuma decisão a tomar
- ❌ ~138 MB de textura derruba a máquina alvo
- ❌ Quase triplica o consumo da cota de armazenamento

### C — `srcSet` por densidade

- ✅ Qualidade adaptada a cada dispositivo
- ❌ O problema é memória de textura, e `srcSet` não a reduz — só desloca a escolha
- ❌ Reservado como saída futura, condicionada a `devicePixelRatio > 1.5` e máquina capaz

### D — Processar no servidor

- ✅ Resultado previsível, independente do navegador
- ❌ Consome cota de execução e exige upload do original em tamanho cheio
- ❌ Cliente é grátis, funciona offline e evita subir arquivos de 8 MB

## Links

- [ADR-002](002-traducao-de-documento-por-funcao-pura.md) — por que a virtualização precisa sobreviver
- `AD-014` em [STATE.md](../../.specs/STATE.md)
