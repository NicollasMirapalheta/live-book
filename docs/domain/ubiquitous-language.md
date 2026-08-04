# Linguagem ubíqua

Vocabulário canônico do Live Book. Quando código, comentário, spec, commit ou conversa
usarem um destes termos, é **neste** sentido.

> **Regra dura:** nunca escreva "página" sem qualificar. A palavra significa quatro
> coisas diferentes neste projeto e a confusão entre elas já custou um bug — capítulos
> caindo um spread adiante, corrigido com `Math.ceil(f/2)` em
> [LiveBook.tsx:241](../../src/live-book/LiveBook.tsx). Use `PageNumber`, `BookPage`,
> `FaceIndex` ou `LeafIndex`.

---

## As quatro unidades de paginação

| Termo | O que é | Base | Contexto | Tipo |
|---|---|---|---|---|
| **Face** | um lado de uma folha; a menor unidade que o motor monta. Inclui capa, guardas e enchimento — não só miolo. | 0 | Reading | `FaceIndex` |
| **Folha** *(leaf)* | a lâmina física que gira em torno da lombada. Tem exatamente 2 faces: frente (`2i`) e verso (`2i+1`). | 0 | Reading | `LeafIndex` |
| **Número de página** | o número impresso no rodapé. Conta só o miolo — capa e guardas não recebem número. | 1 | Reading / leitor | `PageNumber` |
| **Página** *(BookPage)* | uma unidade de conteúdo autoral no documento, com id estável e uma lista de blocos. | — | Composition | `BookPage` |

**`leaf` também é o nome do estado de leitura**: quantas folhas já foram viradas,
de `0` (livro fechado) a `leaves` (livro no fim). É a única variável de estado do motor.

### Conversões canônicas

Estas fórmulas são a fonte única de verdade. Toda conversão no projeto passa por
`src/book/units.ts` — nunca reimplemente inline.

```
faces         = [capa, guarda, ...miolo..., (enchimento?), guarda, contracapa]
leaves        = faces.length / 2
folha i       → frente = face 2i, verso = face 2i+1
spread em L   → esquerda = face 2L-1, direita = face 2L

faceOfPageNumber(n)   = n + 1
pageNumberOfFace(f)   = f - 1            // só quando a face é de miolo
leafOfFace(f)         = ceil(f / 2)      // a folha que precisa estar virada
leafOfPageNumber(n)   = ceil((n + 1) / 2)
```

O `ceil` não é arredondamento defensivo: o spread em `L` mostra o **verso** da folha
`L-1` à esquerda e a **frente** da folha `L` à direita. Uma face ímpar (verso) só
aparece quando a folha seguinte já virou.

---

## Estrutura física do volume

| Termo | Definição |
|---|---|
| **Volume** | um livro completo: casca, miolo e metadados. Sinônimo de "livro" no domínio. |
| **Casca** | capa, contracapa e guardas — a parte que não é miolo. Fornecida à parte do conteúdo. |
| **Capa** *(cover)* | face 0, a arte da frente. O lado de dentro é uma guarda. |
| **Contracapa** *(back cover)* | a última face, a arte do verso. |
| **Guarda** *(endpaper)* | o lado interno da capa ou da contracapa. Sempre em branco. |
| **Enchimento** *(blank)* | folha inserida quando o total de faces ficaria ímpar. Um livro só fecha com pares. |
| **Miolo** | as páginas de conteúdo, entre as duas guardas. É o que recebe numeração. |
| **Spread** | o par de faces visível ao mesmo tempo: verso da folha `L-1` + frente da folha `L`. |
| **Lombada** | o eixo de rotação das folhas e o elemento visual da estante. |
| **Palco** *(stage)* | a caixa de 1120×760 px onde o livro é desenhado, reduzida por `scale` até caber na janela. |

---

## Composição do conteúdo

| Termo | Definição |
|---|---|
| **Documento** *(BookDoc)* | a representação serializável de um volume. É o que vai para o banco e o que o editor manipula. |
| **Bloco** *(Block)* | a menor unidade de conteúdo dentro de uma página: texto, imagem, galeria, citação, régua. União discriminada por `type`. |
| **Bloco desconhecido** | bloco cujo `type` não está registrado neste cliente. **Nunca é descartado** — preservado no round-trip, senão salvar numa versão antiga apaga conteúdo do usuário. |
| **Layout** | template nomeado que arruma os blocos de uma página (ex.: `full-bleed`, `meia-meia`). Registrado pela surface. |
| **Capítulo** | rótulo em uma página que a promove a abertura de seção. Alimenta sumário, fita lateral e marca de progresso — automaticamente. |
| **Tom** *(tone)* | variação estética da folha: `paper`, `cover`, `accent`, `chapter`. Puramente visual. |

---

## Os dois eixos de variação

| Termo | Definição |
|---|---|
| **Surface** | **como o volume se apresenta.** É o único eixo armazenado no documento. Define tema, layouts disponíveis, blocos extras e cromo de página. v1: `album`, `manuscript`. Futuro: `journal`, `scan`. |
| **Ingestor** | **como páginas entram no volume.** Um catálogo separado de importadores (`photos`, `pdf`, `blank`). Não é propriedade do volume — é uma ação que se roda sobre ele, quantas vezes quiser. |
| **Provenance** | histórico de quais ingestões produziram quais páginas. Rastreabilidade, **não** restrição. |
| **Preset** | par (surface, ingestor) exposto na UX de criação. "Criar um álbum" = `album` + `photos`. Açúcar de interface, não existe no schema. |

Consequência do desenho: "PDF apresentado como álbum" é `album` + ingestor `pdf`,
e "diário com fotos" é rodar o ingestor `photos` num volume `journal` a qualquer
momento. Nenhum dos dois exige tipo novo.

**Capacidades de edição não vêm de tipo nenhum** — derivam do conteúdo. Uma página
de blocos `scan` não é editável como texto porque é raster, não porque "o livro é um PDF".

---

## Biblioteca e acesso

| Termo | Definição |
|---|---|
| **Estante** *(shelf)* | a coleção de volumes. Também a rota home. |
| **Troca rápida** | o side menu dentro do leitor que alterna de volume sem sair da leitura. |
| **Link de compartilhamento** | URL pública de leitura, derivada de `share_token`. Quem tem o link, lê. |
| **Token de edição** | segredo que autoriza escrita sem login. Guardado no browser e recuperável por link de resgate. |
| **Link de resgate** | forma de recuperar o token de edição fora do browser. Exibido uma única vez na criação. |
| **Revisão** *(rev)* | contador de versão do documento. Save com `rev` divergente é conflito, nunca sobrescrita silenciosa. |

---

## Termos do motor de virada

Vocabulário interno do contexto Reading. Composition não usa nenhum deles.

| Termo | Definição |
|---|---|
| **Virada** *(flip)* | a animação de uma folha girando de 0° a -180°, ou o inverso. |
| **Cascata** *(stagger)* | o atraso progressivo entre folhas quando a navegação salta mais de uma. |
| **Janela** *(window)* | o intervalo de folhas mantidas montadas no DOM em volta do spread atual. Base da virtualização. |
| **Assentar** *(settle)* | posicionar uma folha no ângulo final instantaneamente, sem animação nem som — o que se faz com folhas fora da janela. |
| **Alça** *(grab / corner)* | as áreas de arraste: o canto enrolado e a faixa externa da folha. |
| **Escala** *(scale)* | fator que reduz o palco para caber na viewport. Só encolhe, nunca amplia. |

---

## Termos proibidos

| Não use | Use |
|---|---|
| "página" sem qualificar | `PageNumber`, `BookPage`, `FaceIndex`, `LeafIndex` |
| "tipo de livro", `kind` | `surface` (apresentação) ou `ingestor` (entrada) |
| "slide" | face, ou spread |
| "flipbook" | o motor, ou Live Book |
| "documento" para o PDF de origem | "arquivo de origem"; **documento** é sempre o `BookDoc` |
