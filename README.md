# Live Book

Componente de livro digital modular. Virada de página em CSS 3D, conteúdo React
vivo dentro da folha — links, tabelas, botões e imagens continuam interativos
porque nenhuma biblioteca de flipbook toma conta do DOM das páginas.

## Rodar

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # tsc + vite build
```

## Usar

```tsx
import { LiveBook, Page } from "./live-book";
import "./live-book/prose.css"; // opcional: tipografia de conteúdo

<LiveBook title="Meu livro" subtitle="edição 2026" sound>
  <Page tone="cover" hideNumber>…</Page>
  <Page tone="accent">…</Page>
  <Page tone="chapter" chapter="01 · Começando" title="Fundamentos">…</Page>
  <Page>…</Page>
</LiveBook>
```

Qualquer `<Page>` com a prop `chapter` vira automaticamente um item do sumário
e uma fita na borda direita. `title` aparece como subtítulo no sumário.

### Props

| `LiveBook` | |
|---|---|
| `children` | sequência de `<Page>` |
| `title` / `subtitle` | cabeçalho |
| `initialLeaf` | folha inicial (0 = fechado) |
| `sound` | liga o ruído de papel |
| `windowRadius` | folhas montadas de cada lado do spread (virtualização; padrão 4) |
| `onLeafChange(leaf)` | callback de navegação |

| `Page` | |
|---|---|
| `chapter` | rótulo do capítulo → sumário + fita |
| `title` | subtítulo no sumário |
| `tone` | `paper` (padrão), `cover`, `accent`, `chapter` |
| `hideNumber` | esconde a numeração |

## Tema

Todas as cores são custom properties em `.lb-root`. Para reaproveitar o
componente em outro projeto, sobrescreva o que precisar:

```css
.lb-root {
  --lb-bg: #f4eee2;      /* fundo bege */
  --lb-paper: #fdfbf6;   /* papel */
  --lb-accent: #7a55d1;  /* roxo */
  --lb-accent-2: #a98bf0;/* lilás */
  --lb-radius: 20px;
}
```

## Como funciona

**Modelo de folhas.** Uma folha = frente + verso. Uma variável de estado, `leaf`,
diz quantas folhas estão viradas. Folhas com índice `< leaf` estão em −180°, o
resto em 0°, todas ancoradas na lombada com `transform-origin: left center`.

O spread visível em `leaf = n` é o **verso da folha n−1** à esquerda e a
**frente da folha n** à direita. Por isso o sumário converte página → folha com
`Math.ceil(page / 2)`; sem isso todo capítulo cai um spread adiante.

**Animação.** Cada folha tem um `MotionValue` de ângulo. Tudo que depende do
ângulo é derivado dele no mesmo frame, via `useTransform`:

```
arc   = sin(|angle| / 180 × π)   // 0 nas pontas, 1 no meio
lift  = arc × 34px               // a folha sai do plano do livro
shade = arc × 0.85               // opacidade da sombra que varre
face  = |angle| > 90 ? verso : frente
```

Derivar do ângulo *alvo* daria seno zero no primeiro frame e a folha nunca
levantaria nem sombrearia. Duração de 880 ms por folha, 130 ms de stagger em
saltos de mais de uma folha (pular para o capítulo 03 folheia em cascata), 520 ms
no snap do arraste.

**Arraste.** A alça vive no canto inferior e numa faixa fina na borda externa —
nunca no meio do texto. É o que permite ter link clicável dentro da página sem
disputar com o gesto. O deslocamento vira progresso dividido pela largura da
página **e pela escala do palco**; sem a escala o arraste descola do cursor em
telas pequenas. `setPointerCapture` mantém o gesto vivo quando o cursor sai da
folha. Abaixo de 28% ela volta; acima, completa a virada de onde parou.

**Canto enrolando.** Não é a folha inclinada: são triângulos recortados por
`clip-path` que crescem de 26 a 132 px em 300 ms — um simula o verso do papel,
outro o vinco em lilás, e um radial atrás faz a sombra na página de baixo.
Dobra com curvatura real exigiria WebGL.

**Escala.** Palco fixo de 1120 × 760 reduzido por `transform: scale()`. A escala
inicial é estimada por `window.innerWidth/Height` já no `useState` — esperar a
primeira medição do `ref` faz o livro abrir grande e se consertar sozinho.

**Som.** Ruído gerado em WebAudio a cada virada: buffer de ruído filtrado por um
band-pass que varre de 720 Hz a 2,8 kHz, com envelope curto. Nenhum arquivo.

## Armadilhas conhecidas (já resolvidas aqui)

1. **Sombra sempre em zero** — o `arc` tem que vir do ângulo interpolado do
   frame, não do alvo.
2. **`backface-visibility` não basta** — frente e verso precisam de
   `translateZ(0.6px)` e de `visibility` comutada em 90°, senão sobra artefato em
   alguns motores de render.
3. **Escala errada na abertura** — estimar antes de medir.
4. **z-index não funciona dentro de `preserve-3d`** — a ordem de pintura vem da
   profundidade. As alças de arraste ficam **fora** do palco, num wrapper que
   também carrega a `perspective`; dentro dele as folhas passariam por cima.

## Desempenho

Pensado para rodar liso em máquinas fracas (GPU integrada), inclusive em volumes
longos.

- **Virtualização.** Só as folhas dentro de uma janela (`windowRadius`, padrão 4)
  em volta do spread — mais capa e contracapa — entram no DOM. Os `MotionValue`s
  de ângulo vivem no componente pai, então uma folha remonta já no ângulo certo
  ao reentrar na janela, sem pulo. Custo de memória/camadas **constante**: um
  livro de 500 páginas custa o mesmo que um de 10. A mesma janela limita a
  cascata — pular muitos capítulos anima só as folhas perto do destino.
- **`will-change` dinâmico.** Promovido a camada de GPU só enquanto a folha se
  move (virada ou arraste), nunca de forma permanente.
- **Faces sob demanda.** O conteúdo de cada página é construído ao entrar na
  janela e cacheado com referência estável, então virar a página não reconcilia
  o DOM das outras páginas.

## Dependências

| | |
|---|---|
| React 18 | estado da folha |
| motion (Framer Motion) ~12 | `MotionValue`, `useTransform`, `animate` |
| CSS 3D, WebAudio, ResizeObserver | nativos |

Nenhuma biblioteca de livro: sem `turn.js`, `StPageFlip`, GSAP ou three.js.
O Motion entra só como motor de animação — ele anima transforms e não encosta
no DOM das páginas.

## Backlog

- Modo retrato: uma página só em telas estreitas
- Toque e inércia em tablet
- Rotas por capítulo
- Ordem de foco acompanhando o spread (acessibilidade)
- Scroll interno da página sem disputar com o scroll de virada
