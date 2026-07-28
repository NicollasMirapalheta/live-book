import { LiveBook, Page } from "./live-book";
import "./live-book/prose.css";

/**
 * Conteudo de demonstracao — propositalmente generico.
 * Trocar isto por qualquer outro conjunto de <Page> nao toca no componente.
 */
export default function App() {
  return (
    <LiveBook
      title="Live Book"
      subtitle="componente de livro digital modular"
      sound
      cover={
        <div className="lb-prose lb-cover">
          <div>
            <p className="lb-kicker">Volume 01</p>
            <div className="lb-rule" style={{ margin: "18px 0 22px" }} />
            <h1 className="lb-h1">
              Um livro
              <br />
              que vira
              <br />
              de verdade
            </h1>
          </div>
          <div>
            <p className="lb-lead">
              Folhas em CSS 3D, conteúdo React vivo dentro da página. Sem biblioteca
              de flipbook tomando conta do DOM.
            </p>
            <p className="lb-kicker" style={{ marginTop: 18 }}>
              clique ou arraste →
            </p>
          </div>
        </div>
      }
      backCover={
        <div className="lb-prose lb-cover">
          <div>
            <p className="lb-kicker">Fim do volume</p>
            <div className="lb-rule" style={{ margin: "18px 0 22px" }} />
            <h2 className="lb-h1">Até a próxima edição</h2>
          </div>
          <p className="lb-lead">
            Este componente é o esqueleto. O conteúdo é seu.
          </p>
        </div>
      }
    >
      {/* 01 — sumario impresso (3ª face: o miolo comeca aqui) */}
      <Page tone="accent">
        <div className="lb-prose">
          <p className="lb-kicker">Neste volume</p>
          <h2 className="lb-h2">Sumário</h2>
          <div className="lb-rule" />
          <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 14 }}>
            <li>
              <strong>01 · Começando</strong>
              <br />
              <span style={{ color: "var(--lb-ink-soft)", fontSize: 13 }}>
                O modelo de folhas, o palco e a escala — pág. 2
              </span>
            </li>
            <li>
              <strong>02 · No dia a dia</strong>
              <br />
              <span style={{ color: "var(--lb-ink-soft)", fontSize: 13 }}>
                Formas de navegar e o arraste da folha — pág. 5
              </span>
            </li>
            <li>
              <strong>03 · Notas</strong>
              <br />
              <span style={{ color: "var(--lb-ink-soft)", fontSize: 13 }}>
                O que já existe e o que vem depois — pág. 8
              </span>
            </li>
          </ol>
          <div className="lb-callout" style={{ marginTop: "auto" }}>
            <span className="lb-callout__icon">i</span>
            <p>
              Tudo nesta página é HTML normal: links, tabelas e botões continuam
              clicáveis mesmo com a folha girando.
            </p>
          </div>
        </div>
      </Page>

      {/* 02 — abertura cap. 1 */}
      <Page tone="chapter" chapter="01 · Começando" title="O modelo de folhas">
        <div className="lb-prose lb-chapter">
          <span className="lb-chapter__n">01</span>
          <h2 className="lb-h1">Começando</h2>
          <div className="lb-rule" />
          <p className="lb-lead">
            Uma folha tem frente e verso. Uma única variável de estado diz até onde
            você leu — o resto é geometria.
          </p>
        </div>
      </Page>

      {/* 03 */}
      <Page title="Palco e escala">
        <div className="lb-prose">
          <p className="lb-kicker">Fundamentos</p>
          <h2 className="lb-h2">Palco fixo, escala fluida</h2>
          <p>
            O livro é desenhado num palco de 1120 × 760 px e reduzido por{" "}
            <code>transform: scale()</code> até caber na janela. Nada dentro da página
            precisa saber o tamanho da tela.
          </p>
          <div className="lb-callout">
            <span className="lb-callout__icon">!</span>
            <p>
              A escala inicial é estimada pela janela antes da primeira medição. Sem
              isso, o livro abre grande e se conserta sozinho no primeiro frame.
            </p>
          </div>
          <div className="lb-figure lb-figure--tall">espaço para imagem</div>
        </div>
      </Page>

      {/* 04 */}
      <Page title="Anatomia">
        <div className="lb-prose">
          <p className="lb-kicker">Referência</p>
          <h2 className="lb-h2">Peças do componente</h2>
          <table className="lb-table">
            <thead>
              <tr>
                <th>Peça</th>
                <th>Papel</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>Palco</strong>
                </td>
                <td>Define perspectiva e escala</td>
              </tr>
              <tr>
                <td>
                  <strong>Folha</strong>
                </td>
                <td>Gira em torno da lombada</td>
              </tr>
              <tr>
                <td>
                  <strong>Face</strong>
                </td>
                <td>Frente e verso independentes</td>
              </tr>
              <tr>
                <td>
                  <strong>Página</strong>
                </td>
                <td>Seu conteúdo, intocado</td>
              </tr>
            </tbody>
          </table>
          <div className="lb-cards">
            <div className="lb-card">
              <strong>Sem lock-in</strong>
              <span>Troque as variáveis CSS e o livro muda de identidade.</span>
            </div>
            <div className="lb-card">
              <strong>Sem canvas</strong>
              <span>Texto continua selecionável e indexável.</span>
            </div>
          </div>
        </div>
      </Page>

      {/* 05 — abertura cap. 2 */}
      <Page tone="chapter" chapter="02 · No dia a dia" title="Formas de navegar">
        <div className="lb-prose lb-chapter">
          <span className="lb-chapter__n">02</span>
          <h2 className="lb-h1">No dia a dia</h2>
          <div className="lb-rule" />
          <p className="lb-lead">
            Sete formas de virar a página. Todas resolvem no mesmo método, então
            todas soam e animam igual.
          </p>
        </div>
      </Page>

      {/* 06 */}
      <Page title="Sete entradas, um caminho">
        <div className="lb-prose">
          <p className="lb-kicker">Navegação</p>
          <h2 className="lb-h2">Tudo cai no mesmo lugar</h2>
          <div className="lb-pipeline">
            {[
              "Setas laterais",
              "Teclado ← →",
              "Scroll do mouse",
              "Canto enrolado",
              "Arraste da folha",
              "Fitas de capítulo",
              "Itens do sumário",
            ].map((label, i) => (
              <div className="lb-pipeline__item" key={label}>
                <span className="lb-pipeline__dot">{i + 1}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </Page>

      {/* 07 */}
      <Page title="O arraste">
        <div className="lb-prose">
          <p className="lb-kicker">Gesto</p>
          <h2 className="lb-h2">Puxar e soltar</h2>
          <ol className="lb-steps">
            <li className="lb-step">
              <span className="lb-step__n">1</span>
              <div>
                <span className="lb-step__t">Pegue pela borda</span>
                <span className="lb-step__d">
                  A alça vive no canto e na faixa externa. Assim o gesto nunca disputa
                  com um link no meio do texto.
                </span>
              </div>
            </li>
            <li className="lb-step">
              <span className="lb-step__n">2</span>
              <div>
                <span className="lb-step__t">A folha acompanha o cursor</span>
                <span className="lb-step__d">
                  O deslocamento vira progresso dividido pela largura da página e pela
                  escala do palco.
                </span>
              </div>
            </li>
            <li className="lb-step">
              <span className="lb-step__n">3</span>
              <div>
                <span className="lb-step__t">Solte</span>
                <span className="lb-step__d">
                  Abaixo de 28% ela volta com snap. Acima, completa a virada de onde
                  parou.
                </span>
              </div>
            </li>
          </ol>
          <div className="lb-figure lb-figure--wide">espaço para imagem</div>
        </div>
      </Page>

      {/* 08 — abertura cap. 3 */}
      <Page tone="chapter" chapter="03 · Notas" title="Estado atual">
        <div className="lb-prose lb-chapter">
          <span className="lb-chapter__n">03</span>
          <h2 className="lb-h1">Notas</h2>
          <div className="lb-rule" />
          <p className="lb-lead">O que já está de pé nesta primeira versão.</p>
        </div>
      </Page>

      {/* 09 */}
      <Page title="Nesta versão">
        <div className="lb-prose">
          <p className="lb-kicker">v0.1</p>
          <h2 className="lb-h2">O que já funciona</h2>
          <div className="lb-cards">
            <div className="lb-card">
              <strong>Virada 3D</strong>
              <span>Levantar e sombra derivados do ângulo, frame a frame.</span>
            </div>
            <div className="lb-card">
              <strong>Canto e arraste</strong>
              <span>Curl por clip-path e gesto com snap.</span>
            </div>
            <div className="lb-card">
              <strong>Sumário</strong>
              <span>Fita lateral, fitas de capítulo e progresso.</span>
            </div>
            <div className="lb-card">
              <strong>Som</strong>
              <span>Ruído de papel gerado em WebAudio.</span>
            </div>
          </div>
          <p style={{ marginTop: "auto" }}>
            <span className="lb-pill lb-pill--ok">estável</span>{" "}
            <span className="lb-pill">API sujeita a mudança</span>
          </p>
        </div>
      </Page>

      {/* 10 */}
      <Page title="Próximos passos">
        <div className="lb-prose">
          <p className="lb-kicker">Backlog</p>
          <h2 className="lb-h2">O que vem depois</h2>
          <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 10 }}>
            <li>Modo retrato: uma página só em telas estreitas.</li>
            <li>Toque e gesto em tablet, com inércia.</li>
            <li>Virtualização das folhas para volumes longos.</li>
            <li>Rotas: cada capítulo com URL própria.</li>
            <li>Acessibilidade: ordem de foco acompanhando o spread.</li>
          </ul>
          <div className="lb-callout">
            <span className="lb-callout__icon">?</span>
            <p>
              Curvatura de papel real continua fora do escopo: exigiria WebGL e
              custaria o conteúdo interativo.
            </p>
          </div>
        </div>
      </Page>
    </LiveBook>
  );
}
