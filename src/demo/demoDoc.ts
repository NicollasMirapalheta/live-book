import type { BookDoc, BookPage, CoverSpec } from "../book/schema";
import { SCHEMA_VERSION } from "../book/schema";

/**
 * O demo atual expresso como BookDoc (DOC-09). Prova o schema contra conteudo
 * real antes de existir editor.
 *
 * Cada pagina do demo e uma layout de prosa full-page (`.lb-prose`, coluna flex de
 * altura total: centraliza capitulos, empurra callouts com margin-top:auto,
 * estica figuras com flex). Um bloco `text` carrega esse HTML EXATO — reproduzir a
 * marcacao `lb-*` (estilada por prose.css) e o que mantem o volume indistinguivel
 * da versao anterior. Nenhum conteudo foi alterado; onde o schema precisou de algo,
 * o campo `html` do bloco text ja o expressa (DOC-09 AC4).
 */

const textPage = (
  id: string,
  meta: Partial<Omit<BookPage, "id" | "blocks">>,
  html: string,
): BookPage => ({
  id,
  ...meta,
  blocks: [{ id: `${id}-body`, type: "text", html }],
});

const cover: CoverSpec = {
  blocks: [
    {
      id: "cover-body",
      type: "text",
      html: `<div class="lb-prose lb-cover">
  <div>
    <p class="lb-kicker">Volume 01</p>
    <div class="lb-rule" style="margin:18px 0 22px"></div>
    <h1 class="lb-h1">Um livro<br/>que vira<br/>de verdade</h1>
  </div>
  <div>
    <p class="lb-lead">Folhas em CSS 3D, conteúdo React vivo dentro da página. Sem biblioteca de flipbook tomando conta do DOM.</p>
    <p class="lb-kicker" style="margin-top:18px">clique ou arraste →</p>
  </div>
</div>`,
    },
  ],
};

const backCover: CoverSpec = {
  blocks: [
    {
      id: "back-body",
      type: "text",
      html: `<div class="lb-prose lb-cover">
  <div>
    <p class="lb-kicker">Fim do volume</p>
    <div class="lb-rule" style="margin:18px 0 22px"></div>
    <h2 class="lb-h1">Até a próxima edição</h2>
  </div>
  <p class="lb-lead">Este componente é o esqueleto. O conteúdo é seu.</p>
</div>`,
    },
  ],
};

const pages: BookPage[] = [
  // 01 — sumario (3a face: o miolo comeca aqui)
  textPage(
    "p01",
    { tone: "accent" },
    `<div class="lb-prose">
  <p class="lb-kicker">Neste volume</p>
  <h2 class="lb-h2">Sumário</h2>
  <div class="lb-rule"></div>
  <ol style="margin:0;padding:0;list-style:none;display:grid;gap:14px">
    <li><strong>01 · Começando</strong><br/><span style="color:var(--lb-ink-soft);font-size:13px">O modelo de folhas, o palco e a escala — pág. 2</span></li>
    <li><strong>02 · No dia a dia</strong><br/><span style="color:var(--lb-ink-soft);font-size:13px">Formas de navegar e o arraste da folha — pág. 5</span></li>
    <li><strong>03 · Notas</strong><br/><span style="color:var(--lb-ink-soft);font-size:13px">O que já existe e o que vem depois — pág. 8</span></li>
  </ol>
  <div class="lb-callout" style="margin-top:auto">
    <span class="lb-callout__icon">i</span>
    <p>Tudo nesta página é HTML normal: links, tabelas e botões continuam clicáveis mesmo com a folha girando.</p>
  </div>
</div>`,
  ),
  // 02 — abertura cap. 1
  textPage(
    "p02",
    { tone: "chapter", chapter: "01 · Começando", title: "O modelo de folhas" },
    `<div class="lb-prose lb-chapter">
  <span class="lb-chapter__n">01</span>
  <h2 class="lb-h1">Começando</h2>
  <div class="lb-rule"></div>
  <p class="lb-lead">Uma folha tem frente e verso. Uma única variável de estado diz até onde você leu — o resto é geometria.</p>
</div>`,
  ),
  // 03
  textPage(
    "p03",
    { title: "Palco e escala" },
    `<div class="lb-prose">
  <p class="lb-kicker">Fundamentos</p>
  <h2 class="lb-h2">Palco fixo, escala fluida</h2>
  <p>O livro é desenhado num palco de 1120 × 760 px e reduzido por <code>transform: scale()</code> até caber na janela. Nada dentro da página precisa saber o tamanho da tela.</p>
  <div class="lb-callout"><span class="lb-callout__icon">!</span><p>A escala inicial é estimada pela janela antes da primeira medição. Sem isso, o livro abre grande e se conserta sozinho no primeiro frame.</p></div>
  <div class="lb-figure lb-figure--tall">espaço para imagem</div>
</div>`,
  ),
  // 04
  textPage(
    "p04",
    { title: "Anatomia" },
    `<div class="lb-prose">
  <p class="lb-kicker">Referência</p>
  <h2 class="lb-h2">Peças do componente</h2>
  <table class="lb-table">
    <thead><tr><th>Peça</th><th>Papel</th></tr></thead>
    <tbody>
      <tr><td><strong>Palco</strong></td><td>Define perspectiva e escala</td></tr>
      <tr><td><strong>Folha</strong></td><td>Gira em torno da lombada</td></tr>
      <tr><td><strong>Face</strong></td><td>Frente e verso independentes</td></tr>
      <tr><td><strong>Página</strong></td><td>Seu conteúdo, intocado</td></tr>
    </tbody>
  </table>
  <div class="lb-cards">
    <div class="lb-card"><strong>Sem lock-in</strong><span>Troque as variáveis CSS e o livro muda de identidade.</span></div>
    <div class="lb-card"><strong>Sem canvas</strong><span>Texto continua selecionável e indexável.</span></div>
  </div>
</div>`,
  ),
  // 05 — abertura cap. 2
  textPage(
    "p05",
    { tone: "chapter", chapter: "02 · No dia a dia", title: "Formas de navegar" },
    `<div class="lb-prose lb-chapter">
  <span class="lb-chapter__n">02</span>
  <h2 class="lb-h1">No dia a dia</h2>
  <div class="lb-rule"></div>
  <p class="lb-lead">Sete formas de virar a página. Todas resolvem no mesmo método, então todas soam e animam igual.</p>
</div>`,
  ),
  // 06
  textPage(
    "p06",
    { title: "Sete entradas, um caminho" },
    `<div class="lb-prose">
  <p class="lb-kicker">Navegação</p>
  <h2 class="lb-h2">Tudo cai no mesmo lugar</h2>
  <div class="lb-pipeline">
    <div class="lb-pipeline__item"><span class="lb-pipeline__dot">1</span><span>Setas laterais</span></div>
    <div class="lb-pipeline__item"><span class="lb-pipeline__dot">2</span><span>Teclado ← →</span></div>
    <div class="lb-pipeline__item"><span class="lb-pipeline__dot">3</span><span>Scroll do mouse</span></div>
    <div class="lb-pipeline__item"><span class="lb-pipeline__dot">4</span><span>Canto enrolado</span></div>
    <div class="lb-pipeline__item"><span class="lb-pipeline__dot">5</span><span>Arraste da folha</span></div>
    <div class="lb-pipeline__item"><span class="lb-pipeline__dot">6</span><span>Fitas de capítulo</span></div>
    <div class="lb-pipeline__item"><span class="lb-pipeline__dot">7</span><span>Itens do sumário</span></div>
  </div>
</div>`,
  ),
  // 07
  textPage(
    "p07",
    { title: "O arraste" },
    `<div class="lb-prose">
  <p class="lb-kicker">Gesto</p>
  <h2 class="lb-h2">Puxar e soltar</h2>
  <ol class="lb-steps">
    <li class="lb-step"><span class="lb-step__n">1</span><div><span class="lb-step__t">Pegue pela borda</span><span class="lb-step__d">A alça vive no canto e na faixa externa. Assim o gesto nunca disputa com um link no meio do texto.</span></div></li>
    <li class="lb-step"><span class="lb-step__n">2</span><div><span class="lb-step__t">A folha acompanha o cursor</span><span class="lb-step__d">O deslocamento vira progresso dividido pela largura da página e pela escala do palco.</span></div></li>
    <li class="lb-step"><span class="lb-step__n">3</span><div><span class="lb-step__t">Solte</span><span class="lb-step__d">Abaixo de 28% ela volta com snap. Acima, completa a virada de onde parou.</span></div></li>
  </ol>
  <div class="lb-figure lb-figure--wide">espaço para imagem</div>
</div>`,
  ),
  // 08 — abertura cap. 3
  textPage(
    "p08",
    { tone: "chapter", chapter: "03 · Notas", title: "Estado atual" },
    `<div class="lb-prose lb-chapter">
  <span class="lb-chapter__n">03</span>
  <h2 class="lb-h1">Notas</h2>
  <div class="lb-rule"></div>
  <p class="lb-lead">O que já está de pé nesta primeira versão.</p>
</div>`,
  ),
  // 09
  textPage(
    "p09",
    { title: "Nesta versão" },
    `<div class="lb-prose">
  <p class="lb-kicker">v0.1</p>
  <h2 class="lb-h2">O que já funciona</h2>
  <div class="lb-cards">
    <div class="lb-card"><strong>Virada 3D</strong><span>Levantar e sombra derivados do ângulo, frame a frame.</span></div>
    <div class="lb-card"><strong>Canto e arraste</strong><span>Curl por clip-path e gesto com snap.</span></div>
    <div class="lb-card"><strong>Sumário</strong><span>Fita lateral, fitas de capítulo e progresso.</span></div>
    <div class="lb-card"><strong>Som</strong><span>Ruído de papel gerado em WebAudio.</span></div>
  </div>
  <p style="margin-top:auto"><span class="lb-pill lb-pill--ok">estável</span> <span class="lb-pill">API sujeita a mudança</span></p>
</div>`,
  ),
  // 10
  textPage(
    "p10",
    { title: "Próximos passos" },
    `<div class="lb-prose">
  <p class="lb-kicker">Backlog</p>
  <h2 class="lb-h2">O que vem depois</h2>
  <ul style="margin:0;padding-left:18px;display:grid;gap:10px">
    <li>Modo retrato: uma página só em telas estreitas.</li>
    <li>Toque e gesto em tablet, com inércia.</li>
    <li>Virtualização das folhas para volumes longos.</li>
    <li>Rotas: cada capítulo com URL própria.</li>
    <li>Acessibilidade: ordem de foco acompanhando o spread.</li>
  </ul>
  <div class="lb-callout"><span class="lb-callout__icon">?</span><p>Curvatura de papel real continua fora do escopo: exigiria WebGL e custaria o conteúdo interativo.</p></div>
</div>`,
  ),
];

export const demoDoc: BookDoc = {
  schemaVersion: SCHEMA_VERSION,
  id: "demo",
  title: "Live Book",
  subtitle: "componente de livro digital modular",
  surface: "manuscript",
  cover,
  backCover,
  pages,
};
