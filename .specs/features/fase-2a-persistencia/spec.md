# Fase 2A — Persistência e acesso

**Escopo**: Complex
**Status**: Draft

> **Divisão da Fase 2.** O roadmap tratava dados, rotas, estante, side menu e acessibilidade
> como uma fase só. O trabalho de spec mostrou treze requisitos com dois vocabulários
> distintos — persistência/autorização de um lado, navegação/biblioteca do outro — e sem
> dependência entre boa parte deles. Ficou dividida em **2A (persistência)** e
> **2B (rotas e biblioteca)**. 2B depende de 2A.

## Problem Statement

O documento existe (Fase 1) mas só em módulo TypeScript. Não há como criar, salvar,
carregar, apagar ou compartilhar um volume — e sem isso o livro-presente não sai do
repositório.

Esta fase também paga duas dívidas com data marcada: a sanitização adiada por `AD-024`
(a partir daqui o documento vem da rede) e os dois furos de durabilidade da revisão do
plano — recuperação do token de edição (`AD-017`) e histórico de revisões (`AD-018`).

## Goals

- [ ] Criar, carregar, salvar, apagar e compartilhar volumes
- [ ] Uma suíte de contrato única passa nas três implementações do adapter
- [ ] Escrita anônima autorizada sem que o id do volume dê poder de edição
- [ ] Nenhum save destrói versão anterior sem possibilidade de recuperação

## Out of Scope

| Item | Motivo |
|---|---|
| Rotas, estante e side menu | Fase 2B |
| Upload de imagem | Fase 3 — esta fase persiste `AssetRef`, não arquivos |
| Editor visual | Fase 4 |
| Login e billing | Fase 7; os ganchos ficam inertes aqui |
| Colaboração em tempo real | `rev` + aviso de conflito bastam |

---

## Assumptions & Open Questions

| Assunção / decisão | Default escolhido | Razão | Confirmado? |
|---|---|---|---|
| Adapter escolhido em runtime | env var; sem `VITE_SUPABASE_URL`, cai no local | permite desenvolver offline sem configurar backend | s |
| Token de edição guardado | `localStorage` por id de volume | não há conta onde guardar | s |
| Link de resgate | exibido uma única vez na criação, sem reenvio | não há e-mail nem conta para recuperá-lo | s |
| Revisões retidas | últimas 20 por volume, podadas no próprio `save_book` | teto previsível de armazenamento na cota gratuita | **n** |
| Sanitização de HTML | no carregamento, antes do render | sanitizar no save deixaria dado sujo já gravado passar | s |
| Volume sem dono | `owner_id` nulo e `visibility: "link"` | é o estado da v1 inteira | s |
| Conflito de `rev` | trava o autosave e avisa; nunca sobrescreve | perder edição em silêncio é o pior resultado | s |

**Open question:** o teto de 20 revisões é chute — precisa ser confrontado com o tamanho
real de um documento de álbum antes da implementação.

---

## Dimensões implícitas

| Dimensão | Cobertura |
|---|---|
| Validação e limites | `save_book` valida ≤ 400 páginas e ≤ 4 MB; limites centralizados em `src/config/limits.ts` e espelhados no SQL |
| Falha e falha parcial | save atômico por ser documento único; falha de rede mantém o estado local e sinaliza |
| Idempotência | save com o mesmo `rev` duas vezes: o segundo é conflito, não duplicata |
| Fronteiras de autorização | DATA-05; leitura por `visibility`, escrita só por RPC com token |
| Concorrência e ordenação | `rev` com `select … for update`; conflito é erro explícito |
| Ciclo de vida do dado | revisões podadas em 20; assets órfãos coletados no save |
| Observabilidade | erro de save reportado ao usuário, com código distinguindo conflito de falha de rede |
| Falha de dependência externa | projeto Supabase pausado por inatividade acorda no primeiro request; a UI mostra estado de carregamento, não erro |
| Integridade de transição | `visibility` só transita entre `private` e `link` |

---

## User Stories

### P1: Contrato de armazenamento ⭐ MVP

**User Story**: Como desenvolvedor, quero uma interface de armazenamento com uma suíte de
contrato única, para que trocar de fornecedor ou rodar offline não exija reescrever nada.

**Acceptance Criteria**:

1. QUANDO a suíte de contrato roda contra `SupabaseAdapter`, `LocalAdapter` e `PublicAdapter` ENTÃO todas DEVEM passar nos casos aplicáveis ao seu `canWrite`
2. QUANDO `assetUrl` é chamada ENTÃO DEVE ser síncrona e devolver string
3. QUANDO um volume é salvo e recarregado ENTÃO o documento DEVE voltar estruturalmente idêntico, **incluindo blocos de `type` desconhecido**
4. QUANDO `PublicAdapter` recebe qualquer operação de escrita ENTÃO DEVE rejeitar
5. QUANDO `VITE_SUPABASE_URL` está ausente ENTÃO o app DEVE subir no `LocalAdapter` sem erro

---

### P1: Autorização sem login ⭐ MVP

**User Story**: Como autor, quero que só eu consiga editar meu volume, mesmo sem ter conta,
para poder compartilhar o link de leitura sem medo.

**Acceptance Criteria**:

1. QUANDO alguém com o id do volume tenta salvar sem o token ENTÃO o sistema DEVE recusar
2. QUANDO o volume é lido pela view pública ENTÃO o `edit_token` NÃO DEVE constar da resposta
3. QUANDO `anon` tenta `update`, `insert` ou `delete` direto na tabela ENTÃO DEVE ser recusado pela RLS
4. QUANDO um volume é criado ENTÃO o `edit_token` DEVE ser devolvido exatamente uma vez
5. QUANDO o script de verificação de RLS roda ENTÃO as seis operações proibidas DEVEM falhar

---

### P1: Durabilidade do acesso e do conteúdo ⭐ MVP

**User Story**: Como autor, quero não perder nem o acesso de edição nem semanas de
diagramação por um acidente, porque o volume é um presente construído ao longo de semanas.

**Why P1**: Furos ② e ③ da revisão do plano. São os dois riscos que destroem o objetivo
do projeto, não apenas atrapalham.

**Acceptance Criteria**:

1. QUANDO um volume é criado ENTÃO o sistema DEVE exibir um link de resgate, com instrução explícita de guardá-lo fora do navegador
2. QUANDO o link de resgate é aberto ENTÃO o token DEVE ser restaurado no navegador atual
3. QUANDO um save é feito ENTÃO a versão anterior DEVE ir para o histórico antes da sobrescrita
4. QUANDO o histórico passa de 20 revisões ENTÃO as mais antigas DEVEM ser podadas na mesma transação
5. QUANDO o autor pede restauração ENTÃO o documento DEVE voltar ao estado da revisão escolhida, e essa restauração DEVE ela mesma gerar uma revisão

---

### P1: Concorrência explícita ⭐ MVP

**Acceptance Criteria**:

1. QUANDO um save carrega `rev` diferente do servidor ENTÃO DEVE falhar com `RevConflictError` e o servidor NÃO DEVE alterar nada
2. QUANDO ocorre conflito ENTÃO a interface DEVE avisar e **travar** o autosave, em vez de tentar de novo
3. QUANDO um save é bem-sucedido ENTÃO `rev` DEVE ser incrementado em exatamente 1

---

### P1: Sanitização de HTML ⭐ MVP

**User Story**: Como leitor, quero que abrir um link compartilhado não execute script de
terceiros.

**Why P1**: `AD-024` criou esta obrigação com data marcada. A partir desta fase o documento
vem da rede.

**Acceptance Criteria**:

1. QUANDO um documento carregado contém `<script>` num bloco `text` ENTÃO ele NÃO DEVE ser executado
2. QUANDO contém atributo de evento (`onerror`, `onload`) ENTÃO o atributo DEVE ser removido
3. QUANDO contém HTML legítimo de formatação ENTÃO ele DEVE ser preservado
4. QUANDO a sanitização ocorre ENTÃO DEVE ser no carregamento, antes do primeiro render

---

## Edge Cases

- QUANDO o projeto Supabase está pausado ENTÃO a primeira requisição DEVE mostrar carregamento, não erro
- QUANDO o documento excede 4 MB ENTÃO o save DEVE ser recusado com mensagem acionável
- QUANDO `localStorage` está indisponível ENTÃO a edição DEVE ser recusada com explicação, não falhar em silêncio
- QUANDO um volume é apagado e o link antigo é aberto ENTÃO DEVE aparecer "não encontrado", não erro genérico
- QUANDO o mesmo volume está aberto em duas abas ENTÃO a segunda a salvar DEVE receber conflito
- QUANDO um documento salvo tem `schemaVersion` futura ENTÃO DEVE abrir em somente-leitura e o save DEVE ficar desabilitado

---

## Requirement Traceability

| ID | Story | Fase | Status |
|---|---|---|---|
| DATA-01 | Contrato de armazenamento | — | Pending |
| DATA-02 | Contrato — round-trip fiel | — | Pending |
| DATA-03 | Contrato — adapter local e público | — | Pending |
| DATA-04 | Autorização — token e RPC | — | Pending |
| DATA-05 | Autorização — RLS e view pública | — | Pending |
| DATA-06 | Durabilidade — link de resgate | — | Pending |
| DATA-07 | Durabilidade — histórico de revisões | — | Pending |
| DATA-08 | Concorrência por `rev` | — | Pending |
| DATA-09 | Sanitização de HTML | — | Pending |

**Cobertura:** 9 requisitos, 0 mapeados (Design e Tasks pendentes).

---

## Success Criteria

- [ ] A mesma suíte de contrato passa nos três adapters
- [ ] `scripts/check-rls.mjs` recusa as seis operações proibidas
- [ ] Criar → recarregar → abrir → apagar funciona ponta a ponta
- [ ] Restaurar uma revisão devolve exatamente o conteúdo anterior
- [ ] Nenhum `import` de `@supabase/supabase-js` fora de `src/data/supabase/`
