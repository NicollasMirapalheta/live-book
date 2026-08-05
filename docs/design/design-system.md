# Sistema de design

Direção visual do Live Book: **biblioteca amadeirada e aconchegante**, com "papel
iluminado" **literal** — o ambiente (home, mesa de leitura) é madeira quente em penumbra;
a **página é a superfície clara**, iluminada por um poço de luz de abajur. Definida com o
autor em 5 rodadas de exploração (`AD-031`), supersede a paleta bege+lilás e a regra
"herói só no side menu" do `AD-015`, mantendo os **princípios estruturais** dele (escopo de
token, Fraunces+Inter, sem novas dependências, sem toggle claro/escuro).

> **Fidelidade x direção.** Os mockups de exploração são procedurais (CSS). A fidelidade
> final de madeira e luz vem da implementação — uma textura de madeira leve bem escolhida
> mais os gradientes de luz. Este documento fixa a **direção e as regras**; valores de
> textura/luz são afináveis depois sem retravar a identidade.

---

## Princípios

1. **O livro é o objeto; o app é a sala e a mesa.** Nada no cromo pode competir com a
   virada nem com a página. Se um elemento chama mais atenção que o livro, está errado.
2. **Papel iluminado numa sala quente.** O fundo é madeira em penumbra; a página brilha.
   Superfícies quentes, sombras difusas, zero neon. O escuro é a **sala**, não a página —
   por isso não há "modo escuro" (não se inverte o papel).
3. **A magia é morna e reservada.** Explícita (livro que levita, faíscas âmbar), mas só na
   home, no carregando e no vazio. **Nunca durante a leitura.** Respeita `reduced-motion`.
4. **Tipografia carrega a hierarquia.** Antes de caixa, borda ou cor, resolva com tamanho,
   peso e espaço.
5. **O conteúdo do usuário manda.** Numa página de álbum, a foto domina e a interface some.

---

## Escopo dos tokens — a regra que preserva a portabilidade

O componente `live-book/` declara suas variáveis **dentro de `.lb-root`** de propósito: é
o que permite reusá-lo em outro projeto trocando só as custom properties. Contrato inquebrável.

| Camada | Prefixo | Onde é declarado | Quem consome |
|---|---|---|---|
| Motor | `--lb-*` | `.lb-root` | `live-book/`, blocos dentro da página |
| Produto | `--app-*` | `:root` | home/estante, leitor (cromo), criar/importar, side menu |
| Tema de surface | `--lb-*` | inline no root do `LiveBook` | sobrescreve o motor por volume |

`--app-*` **espelha** os valores de `--lb-*`, não os importa. Duplicação consciente: o
preço de manter o componente destacável. Nunca use `--lb-*` fora da página nem `--app-*`
dentro dela.

O **reskin do motor** (`AD-032`) entra **por aqui**: cor/textura do papel, borda/sombra de
folha, tipografia de capítulo/número, e o fundo do palco (a mesa)/abajur/vinheta trafegam
por `--lb-*` e por CSS **não-geométrico**. Geometria, `faces`, `angles`, `surfaceCache`,
`constants.ts` e o timing da virada **não se tocam** (`AD-022`).

---

## Paleta

Mundo quente. Duas famílias de superfície: **madeira** (a sala, penumbra) e **papel** (a
página, iluminada). Dois acentos com papéis distintos: **brasa** (terracota) chama à ação;
**sálvia** (verde) é o interativo calmo.

```css
:root {
  /* a sala — madeira em penumbra (cromo da home e do leitor) */
  --app-sala:          #241610;   /* fundo profundo da sala */
  --app-sala-2:        #3a2617;   /* topo do degradê, mais claro */
  --app-madeira:       #8a5a2f;   /* carvalho — estante e mesa */
  --app-madeira-clara: #c79a63;   /* madeira sob a luz */
  --app-madeira-fundo: #5f3c20;   /* madeira na sombra / prateleira */

  /* o papel — a página iluminada (cartão, painel, folha) */
  --app-papel:         #faf3e2;   /* papel principal — a coisa clara */
  --app-papel-2:       #f1e2c6;   /* papel secundário / hover */
  --app-papel-borda:   #e2cfa8;   /* borda de papel */

  /* tinta sobre papel */
  --app-tinta:         #2a1e14;   /* texto principal (~11:1 no papel) */
  --app-tinta-suave:   #6e5a45;   /* secundário, legenda (~5:1) */
  --app-tinta-fraca:   #a08a6e;   /* placeholder/desabilitado — NUNCA conteúdo */

  /* texto sobre madeira (a sala escura) */
  --app-creme:         #f6ead2;   /* texto claro sobre sala/madeira */
  --app-creme-suave:   #cbb393;   /* secundário sobre madeira */

  /* acentos */
  --app-brasa:         #b5622a;   /* terracota — CTA, destaque, palavra em realce */
  --app-brasa-clara:   #c9824a;   /* hover */
  --app-salvia:        #5f7f4c;   /* verde — foco, link, marca-página */
  --app-salvia-clara:  #7fa06a;
  --app-ambar:         #e0a24e;   /* luz quente */
  --app-ambar-glow:    #ffcf88;   /* halo do abajur / faísca */

  /* semânticos (fora dos acentos) */
  --app-ok:            #5f7f4c;   /* = sálvia */
  --app-aviso:         #c98a2e;
  --app-erro:          #a8402a;
}
```

**Contraste (alvo AA, verificar na implementação — DS-12):**
- `--app-tinta` sobre `--app-papel`: texto de conteúdo, folgado.
- `--app-creme` sobre `--app-sala`/`--app-madeira-fundo`: cromo da sala, folgado.
- `--app-brasa`: usar como **fundo de CTA** (texto claro por cima) ou realce de palavra em
  título; **evitar** como texto pequeno sobre papel sem checar AA.
- `--app-salvia` sobre `--app-papel`: link/estado interativo — verificar ~AA; se faltar,
  escurecer para o tom de fundo.
- `--app-tinta-fraca` **não passa** em AA: só placeholder e desabilitado.

**Sem toggle claro/escuro.** A sala já é quente-escura por identidade; o papel é claro por
metáfora. Inverter o papel descaracterizaria o produto. (Mantém a decisão do `AD-015`.)

---

## Tipografia

Duas famílias, já carregadas: **Fraunces** (display, serifada variável) e **Inter** (texto).

```css
:root {
  --app-font:    "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  --app-display: "Fraunces", Georgia, "Times New Roman", serif;
}
```

| Papel | Família | Tamanho / linha | Peso | Uso |
|---|---|---|---|---|
| `display-xl` | Fraunces | 56 / 1.05 | 600 | título da home ("Minha biblioteca") |
| `display-l` | Fraunces | 40 / 1.10 | 600 | título de volume, seção grande |
| `display-m` | Fraunces | 28 / 1.15 | 600 | seção |
| `title` | Inter | 18 / 1.30 | 600 | título de cartão/painel |
| `body` | Inter | 15 / 1.60 | 400 | texto de interface |
| `small` | Inter | 13 / 1.50 | 400 | legenda, metadado |
| `kicker` | Inter | 11 / 1.20 | 600 | rótulo caixa-alta, `letter-spacing:.14em` |

Fraunces é variável: `font-optical-sizing: auto`; em `display-xl`, `opsz` alto deixa as
serifas expressivas — é onde a fonte rende. **Palavra em realce** no título usa `--app-brasa`
(o tratamento que o autor aprovou nas rodadas).

> `prose.css` define a escala **dentro** da página (`lb-h1`, `lb-lead`, …). Escalas irmãs:
> a de cima é o cromo, a de baixo é o conteúdo.

---

## Espaço, raio e sombra

```css
:root {
  --app-s1:4px; --app-s2:8px; --app-s3:12px; --app-s4:16px;
  --app-s5:24px; --app-s6:32px; --app-s7:48px; --app-s8:72px;

  --app-radius-s: 8px;
  --app-radius:   12px;   /* cartão, painel, botão-bloco */
  --app-radius-l: 20px;   /* = --lb-radius, cromo casa com o livro */
  --app-pill:     999px;  /* botão de ação, chip */

  /* sombras — quentes, difusas; na sala escura ganham profundidade */
  --app-shadow-1: 0 2px 6px rgba(20,10,2,.28);
  --app-shadow-2: 0 14px 34px -12px rgba(16,8,2,.55);
  --app-shadow-lift: 0 22px 40px -14px rgba(12,6,1,.6);   /* lombada puxada, livro na mesa */
}
```

Sombra é **difusa e quente**, nunca dura nem cinza-azulada. Na sala escura, a elevação vem
de sombra mais profunda + um fio de luz superior (`inset 0 1px 0 rgba(255,220,170,.2)`).

---

## A home — a estante frontal (`AD-033`)

A home **é uma estante**, não um catálogo. O usuário **tira uma lombada**, não clica num card.

- **Sala:** fundo `--app-sala` com um halo quente no topo (o abajur da sala). Barra enxuta:
  título `display` (`Minha biblioteca`) à esquerda, **`＋ Novo volume`** (pílula `--app-brasa`)
  à direita.
- **Prateleira:** plano de `--app-madeira-fundo` com fio de luz no topo e sombra de contato
  embaixo. **A largura acompanha o acervo** — mede os volumes + folga curta e centraliza;
  cresce até a largura total no teto de **~50 volumes**. Nunca um trilho fixo meio-vazio.
- **Lombada = volume:** retângulo vertical, cor derivada do `--lb-cover`/tema da surface,
  título em Fraunces `small` rotacionado (`writing-mode: vertical-rl`), alturas levemente
  variadas. Ao **mirar** (hover/foco), a lombada **sai ~15% para a frente** e mostra
  título + metadado num balão de papel.
- **Slot "＋":** o último vão é um alvo pontilhado convidando ao próximo volume — o vazio
  vira proposital.
- **Além de ~50:** vista de **acervo** (expansão futura). Corredor em perspectiva **fora
  de escopo** por ora.

**Estados da home:**

| Estado | Tratamento |
|---|---|
| vazia | motivo da **magia** (livro-farol) + "Seu primeiro livro aparece aqui" + `＋ Novo volume` |
| poucos | prateleira compacta e centrada, lombadas com corpo, slot "＋" ao lado |
| muitos | ganha fileiras e rola verticalmente — a estante de cima a baixo |
| carregando | lombadas em `--app-madeira` com pulsação suave (some com reduced-motion) |
| foco | anel `--app-salvia` de 3px, deslocamento 3px — **nunca** `outline: none` |

---

## A leitura — o reskin do motor (`AD-032`, só a pele)

O livro pousa numa **mesa amadeirada** sob um **poço de luz de abajur**. Tudo aqui é a
**casca**; a mecânica da virada não muda.

- **Mesa (fundo do palco):** madeira quente **texturada** (cor sólida + grão fino), **não
  tábuas montadas**, sem objetos no canto. Um poço de luz radial no alto, **vinheta** suave
  nas bordas e uma **sombra de contato** sob o livro para ele pousar. Entra por `--lb-bg`/
  fundo não-geométrico do palco.
- **Página:** `--app-papel`, **fosca** (sem reflexo de verniz). Borda de folha com sombra
  curta; vinco do miolo (gutter) discreto.
- **Miolo:** abertura de capítulo em Fraunces `kicker` (`--app-madeira`), **capitular** na
  primeira letra em `--app-brasa`. Numeração discreta em `small`.
- **Marca-página:** fita fina em `--app-salvia`, saindo do topo da folha.
- **Luz:** o papel é sempre a coisa mais clara; a vinheta fecha a cena **sem** escurecer a
  página.

**Fronteira do reskin (o que NÃO se toca):** `Face`, `faces`, `surfaceOf`, `angles`,
`surfaceCache`, `inWindow`, `toc`, `Leaf.tsx`, `constants.ts`, e a **geometria** de
`live-book.css` (dimensões, transformações, perspectiva, ângulos, timing). A caracterização
da Fase 0 é a rede: qualquer regressão de mecânica quebra teste.

---

## A magia — o livro-farol

Motivo de marca para os momentos mágicos. **Explícito, morno, reservado.**

- **Forma:** um livro aberto que **levita**, com páginas soltando como folhas, **faíscas
  âmbar** (`--app-ambar-glow`) subindo e um brilho quente por baixo. Sem neon.
- **Onde vive:** herói da **home** (sobretudo vazia), **carregando** (enquanto o volume
  abre) e **estado vazio** de volume. **Nunca** durante a leitura.
- **`reduced-motion`:** sem movimento, vira uma composição **parada** igualmente bonita —
  não some, só para de animar.

---

## Side menu — troca rápida (secundário)

A pilha de lombadas continua útil como **troca rápida dentro do leitor** (não é mais o
herói — a home é). Painel estreito à direita, acima das `lb-tabs`:

- Lombadas de ~28px, cor do `--lb-cover` da surface, título `small` vertical.
- Hover: desliza ~14px e revela a capa em miniatura (`translateX` + `rotateY(-8deg)`, 200ms).
- Volume atual: deslocado, marcador `--app-salvia`. Acima de ~12 volumes, rola.

---

## Temas por surface

Cada surface sobrescreve `--lb-*` inline no root do `LiveBook`, sobre a base amadeirada.

### `manuscript` — texto corrido
Papel quente, tinta escura, margens generosas, numeração visível, coluna única. A base de
referência, agora dentro da sala amadeirada.

### `album` — fotos e legenda
A foto manda; a interface recua.
```
--lb-paper:  #fefdfb   papel neutro, para não tingir a foto
--lb-ink:    #2e2a35   tinta mais fria
--lb-accent: herdado   acento só em interface, nunca em conteúdo
```
- Margem estreita (`chrome.margin:"tight"`), imagem respira.
- Legenda em `small`, `--app-tinta-suave`, à esquerda sob a foto.
- Numeração discreta; ausente em `full-bleed`.
- Molduras: `plain`, `polaroid`, `bleed`, `circle`.
- Layouts: `full-bleed`, `single`, `duo`, `grid`, `photo-text`, `text`.

---

## Movimento

A virada é a única animação com protagonismo. Todo o resto é discreto.

| Elemento | Duração | Curva |
|---|---|---|
| virada de folha | 880 ms | `cubic-bezier(.65,0,.35,1)` *(do motor — não muda)* |
| snap do arraste | 520 ms | idem |
| lombada saindo da estante/pilha | 200 ms | `ease-out` |
| hover de controle | 140 ms | `ease-out` |
| painel entrando | 240 ms | `cubic-bezier(.2,.8,.2,1)` |
| livro-farol / faíscas | ambiente, lento | `ease-in-out` alternando |

**`prefers-reduced-motion` não desliga a virada** — ela é o produto. Reduz o acessório:
hover, entrada de painel, pulsação, e a magia (que para, mas não some). Escolha deliberada.

---

## Acessibilidade

Requisito de aceite, não backlog (`AD-019`).

- **Foco sempre visível:** anel de 3px em `--app-salvia` (ou `--app-brasa` sobre madeira),
  deslocamento 3px. Nenhum `outline: none` sem substituto.
- **Nada focável dentro de `aria-hidden`** (já corrigido na 2B; manter).
- **Ordem de foco acompanha o spread** ao virar.
- **Alvo de toque ≥ 44×44 px** em qualquer controle.
- **Toda imagem carrega `alt`**; vazio é escolha explícita (decorativa), nunca omissão.
- **Contraste AA** para todo texto de conteúdo (`--app-tinta-fraca` é a única exceção, só
  placeholder/desabilitado). Verificar os acentos sobre papel na implementação (DS-12).

---

## Não fazer

- Toggle claro/escuro (a sala já é escura, o papel já é claro — por identidade).
- Simular tábuas na mesa, ou objetos "post-it" no canto — madeira sólida texturada basta.
- Corredor em perspectiva na home agora (fora de escopo, `AD-033`).
- Segunda família tipográfica além de Fraunces + Inter.
- Nova dependência de runtime (Tailwind, lib de componentes, etc.).
- Sombra dura/cinza-azulada — o vocabulário é papel e madeira quente.
- Escalar a capa/lombada no hover (reamostra e revela artefato); **eleva/desliza**, não escala.
- Magia durante a leitura.
- Tocar geometria/mecânica do motor a pretexto de design (`AD-022`/`AD-032`).
- Usar `--lb-*` fora da página ou `--app-*` dentro dela.
