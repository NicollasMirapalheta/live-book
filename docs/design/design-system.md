# Sistema de design

Direção visual do Live Book: **editorial/papelaria**, com a pilha de lombadas 3D como
elemento-herói apenas no side menu de troca rápida (`AD-015`).

O sistema não inventa paleta. Ele parte do tema que já existe em
[live-book.css](../../src/live-book/live-book.css) — bege e lilás — e o estende para o
resto do produto.

---

## Princípios

1. **O livro é o objeto; o app é a mesa.** Nada no cromo do produto pode competir com a
   virada. Se um elemento da interface chama mais atenção que o livro, está errado.
2. **Papel, não tela.** Superfícies quentes, sombras difusas e curtas, zero neon.
3. **Tipografia carrega a hierarquia.** Antes de adicionar caixa, borda ou cor, resolva
   com tamanho, peso e espaço.
4. **O conteúdo do usuário manda.** Numa página de álbum, a foto domina e a interface
   some.

---

## Escopo dos tokens — a regra que preserva a portabilidade

O componente `live-book/` declara suas variáveis **dentro de `.lb-root`** de propósito:
é o que permite reusá-lo em outro projeto trocando só as custom properties. Esse contrato
não pode ser quebrado.

Portanto:

| Camada | Prefixo | Onde é declarado | Quem consome |
|---|---|---|---|
| Motor | `--lb-*` | `.lb-root` | `live-book/`, blocos dentro da página |
| Produto | `--app-*` | `:root` | estante, editor, side menu, cromo |
| Tema de surface | `--lb-*` | inline no root do `LiveBook` | sobrescreve o motor por volume |

`--app-*` **espelha** os valores de `--lb-*`, não os importa. Duplicação consciente:
o preço de manter o componente destacável.

Tema por volume entra como `style` inline no root do `LiveBook`, porque variável herdada
de um ancestral perde para a declaração em `.lb-root`.

---

## Paleta

Valores canônicos, herdados do motor:

```css
:root {
  /* superfícies */
  --app-bg:         #efe9dd;   /* fundo da mesa */
  --app-bg-deep:    #e3dccc;   /* fundo em degradê, base */
  --app-surface:    #fdfbf6;   /* cartão, painel — o "papel" */
  --app-surface-2:  #f7f1e6;   /* papel secundário, hover */
  --app-edge:       #e9e0cf;   /* borda de papel */

  /* tinta */
  --app-ink:        #3a3247;   /* texto principal */
  --app-ink-soft:   #6f6684;   /* secundário, legendas */
  --app-ink-faint:  #a29ab4;   /* placeholder, desabilitado */
  --app-line:       #e8e0d0;   /* divisor */

  /* acento */
  --app-accent:     #7a55d1;   /* ação primária, foco */
  --app-accent-2:   #a98bf0;   /* hover, realce */
  --app-accent-3:   #c9b6fb;   /* borda de realce */
  --app-tint:       #efe8ff;   /* fundo de estado selecionado */

  /* semânticos — únicos fora da paleta do motor */
  --app-ok:         #4b7f5e;
  --app-warn:       #a8702a;
  --app-danger:     #a33b46;
}
```

**Regra de contraste:** `--app-ink` sobre `--app-surface` dá ~10:1. `--app-ink-soft`
sobre `--app-surface` dá ~5.4:1. `--app-ink-faint` **não passa** em AA para texto e só
pode ser usado em placeholder e elemento desabilitado — nunca em conteúdo real.
`--app-accent` sobre `--app-surface` fica em ~5.9:1, então serve para texto de link.

**Sem modo escuro na v1.** A metáfora do produto é papel iluminado; um tema escuro exige
repensar sombra, brilho de lombada e a própria capa, e entregaria uma segunda identidade
para manter. Decisão revisável quando existir mais de uma surface consolidada.

---

## Tipografia

Duas famílias, já carregadas no `index.html`: **Fraunces** (display, serifada variável)
e **Inter** (texto).

```css
:root {
  --app-font:    "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  --app-display: "Fraunces", Georgia, "Times New Roman", serif;
}
```

| Papel | Família | Tamanho / linha | Peso | Uso |
|---|---|---|---|---|
| `display-xl` | Fraunces | 56 / 1.05 | 600 | título da estante, capa |
| `display-l` | Fraunces | 40 / 1.10 | 600 | título de volume |
| `display-m` | Fraunces | 28 / 1.15 | 600 | seção |
| `title` | Inter | 18 / 1.30 | 600 | título de cartão, painel |
| `body` | Inter | 15 / 1.60 | 400 | texto de interface |
| `small` | Inter | 13 / 1.50 | 400 | legenda, metadado |
| `kicker` | Inter | 11 / 1.20 | 600 | rótulo em caixa alta, `letter-spacing: .12em` |

Fraunces é variável: use `font-optical-sizing: auto` e `wght`; em `display-xl`,
`opsz` alto deixa as serifas mais expressivas — é onde a fonte rende.

> `prose.css` define a escala **dentro** da página (`lb-h1`, `lb-h2`, `lb-lead`, …).
> São escalas irmãs, não concorrentes: a de cima é o cromo, a de baixo é o conteúdo.
> Nunca use classe `lb-` no cromo nem `app-` dentro da página.

---

## Espaço, raio e sombra

```css
:root {
  --app-s1: 4px;   --app-s2: 8px;   --app-s3: 12px;  --app-s4: 16px;
  --app-s5: 24px;  --app-s6: 32px;  --app-s7: 48px;  --app-s8: 64px;

  --app-radius-s: 8px;
  --app-radius:   12px;    /* cartão, painel */
  --app-radius-l: 20px;    /* = --lb-radius, para o cromo casar com o livro */

  --app-shadow-1: 0 1px 2px rgba(58, 50, 71, .06), 0 2px 8px rgba(58, 50, 71, .05);
  --app-shadow-2: 0 2px 6px rgba(58, 50, 71, .08), 0 12px 28px rgba(58, 50, 71, .10);
  --app-shadow-in: inset 0 1px 0 rgba(255, 255, 255, .7);
}
```

Sombra é **difusa e curta**, nunca dura. Papel sobre papel não projeta contorno nítido.

---

## Estante

Grade responsiva de capas. A proporção do cartão segue a proporção real da página do
motor — 560×760, ou seja `0.7368` — para que a capa na estante e a capa aberta sejam o
mesmo objeto.

```css
.app-shelf {
  display: grid;
  gap: var(--app-s5);
  grid-template-columns: repeat(auto-fill, minmax(184px, 1fr));
}
.app-shelf__cover { aspect-ratio: 560 / 760; border-radius: var(--app-radius); }
```

**Anatomia do cartão:** capa (imagem ou gradiente da surface) → título em `title` →
metadado em `small` (`{surface} · {n} páginas · {atualizado}`).

**Estados:**

| Estado | Tratamento |
|---|---|
| repouso | `--app-shadow-1`, capa levemente inclinada em 0° |
| hover | eleva 4px, `--app-shadow-2`, transição 180 ms |
| foco | anel de 2px em `--app-accent` com 2px de deslocamento — **nunca** `outline: none` |
| carregando | bloco em `--app-surface-2` com pulsação suave |
| vazio | ilustração leve + "Nenhum volume ainda" + ação primária |

O hover **eleva**, não escala: escalar reamostra a imagem da capa e revela artefato de
compressão do WebP a 320 px.

---

## Side menu — a pilha de lombadas

É o único lugar com compromisso skeuomórfico, e é onde ele rende: um painel estreito à
direita do leitor, com os volumes de lombada, empilhados.

- **Repouso:** lombadas verticais de ~28px, cor derivada do `--lb-cover` de cada surface,
  título rotacionado em `writing-mode: vertical-rl`, Fraunces em `small`
- **Hover:** a lombada desliza ~14px para fora da pilha e revela a capa em miniatura ao
  lado; `transform: translateX()` + `rotateY(-8deg)`, 200 ms
- **Volume atual:** deslocado permanentemente e com marcador em `--app-accent`
- **Clique:** troca de volume sem sair da leitura

Fica **à direita**, acima das `lb-tabs`. A esquerda já é do `lb-toc`, e disputar aquele
espaço quebraria o sumário.

**Limite:** acima de ~12 volumes a pilha satura visualmente e passa a rolar, com as
lombadas mantendo largura fixa. A estante continua sendo o lugar de navegar coleção
grande; o side menu é troca rápida, não catálogo.

---

## Temas por surface

Cada surface sobrescreve `--lb-*` inline no root do `LiveBook`.

### `manuscript` — texto corrido

O tema atual, sem mudança. Bege e lilás, margens generosas, numeração visível, coluna
única. É a referência das demais.

### `album` — fotos e legenda

A foto manda; a interface recua.

```
--lb-paper:  #fefdfb    papel mais neutro, para não tingir a foto
--lb-ink:    #2e2a35    tinta mais fria, porque compete menos com cor
--lb-accent: herdado    acento só em elemento de interface, nunca em conteúdo
```

- Margem de página **estreita** (`chrome.margin: "tight"`), para a imagem respirar
- Legenda em `small`, `--app-ink-soft`, alinhada à esquerda sob a foto
- Numeração discreta, e ausente em página `full-bleed`
- Molduras disponíveis: `plain`, `polaroid`, `bleed`, `circle`

**Layouts do `album`:**

| id | Composição |
|---|---|
| `full-bleed` | uma foto sangrando na página inteira, sem numeração |
| `single` | uma foto centrada com legenda |
| `duo` | duas fotos empilhadas, legenda opcional em cada |
| `grid` | 4 fotos em grade 2×2 |
| `photo-text` | foto na metade superior, texto na inferior |
| `text` | só texto — a página de carta, no meio do álbum |

---

## Movimento

A virada é a única animação com direito a protagonismo. Todo o resto é discreto.

| Elemento | Duração | Curva |
|---|---|---|
| virada de folha | 880 ms | `cubic-bezier(.65,0,.35,1)` *(do motor)* |
| snap do arraste | 520 ms | idem |
| hover de cartão | 180 ms | `ease-out` |
| lombada saindo da pilha | 200 ms | `ease-out` |
| painel entrando | 240 ms | `cubic-bezier(.2,.8,.2,1)` |
| toast | 160 ms | `ease-out` |

**`prefers-reduced-motion` não desliga a virada.** Ela é o produto, não um enfeite — um
livro que não vira não é este produto. A preferência reduz o que é acessório: hover,
entrada de painel, pulsação de carregamento. Essa é uma escolha deliberada e documentada,
não um esquecimento.

---

## Acessibilidade

Requisito de aceite, não backlog (`AD-019`).

- **Foco sempre visível.** Anel de 2px em `--app-accent` com 2px de deslocamento. Nenhum
  `outline: none` sem substituto equivalente.
- **Nada focável dentro de `aria-hidden`.** Existe hoje: as fitas de capítulo estão numa
  subárvore `aria-hidden` contendo `<button>` ([LiveBook.tsx:651](../../src/live-book/LiveBook.tsx)).
  Precisa ser corrigido, e o teste de aceite é navegar o leitor inteiro só com Tab.
- **Ordem de foco acompanha o spread.** Ao virar, o foco não pode continuar numa folha
  que saiu da janela.
- **Alvo de toque ≥ 44×44 px** em qualquer controle no celular.
- **Toda imagem carrega `alt`.** O editor pede o texto alternativo no upload; vazio é
  escolha explícita (decorativa), nunca omissão.
- **Contraste AA** para todo texto de conteúdo. `--app-ink-faint` é a única exceção, e
  só em placeholder e desabilitado.

---

## Não fazer

- Modo escuro na v1
- Segunda família tipográfica
- Ícones com traço grosso ou geometria dura — o vocabulário é papel
- Sombra com contorno nítido
- Escalar a capa no hover (reamostra e revela artefato de compressão)
- Usar `--lb-*` fora da página ou `--app-*` dentro dela
- Animação de entrada em item de lista: a estante precisa aparecer pronta
