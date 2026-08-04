/**
 * Unidades de paginacao como tipos distintos (ADR-006, AD-010).
 *
 * "Pagina" significa quatro coisas neste projeto e a confusao entre elas ja
 * custou um bug (capitulos um spread adiante, corrigido com `ceil(f/2)`). As tres
 * grandezas numericas viram branded types incompativeis entre si, e TODA conversao
 * passa por este arquivo — nunca reimplemente inline.
 *
 * Fonte das formulas: docs/domain/ubiquitous-language.md (conversoes canonicas).
 */

/** Um lado de uma folha; a menor unidade que o motor monta. Inclui capa, guardas
 * e enchimento — nao so miolo. Base 0. */
export type FaceIndex = number & { readonly __brand: "FaceIndex" };

/** A lamina fisica que gira em torno da lombada. Tem 2 faces: frente (2i) e verso
 * (2i+1). Base 0. Tambem e o tipo do estado de leitura `leaf`. */
export type LeafIndex = number & { readonly __brand: "LeafIndex" };

/** O numero impresso no rodape. Conta so o miolo — capa e guardas nao numeram.
 * Base 1. */
export type PageNumber = number & { readonly __brand: "PageNumber" };

// --- Construtores: a unica porta de entrada de numeros nao tipados ------------
// Um numero cru (parametro de rota, JSON do banco, atributo de DOM) so entra no
// dominio tipado por um destes. Fora daqui, nenhum `as FaceIndex` deve existir.

export const asFace = (n: number): FaceIndex => n as FaceIndex;
export const asLeaf = (n: number): LeafIndex => n as LeafIndex;
export const asPageNumber = (n: number): PageNumber => n as PageNumber;

// --- Conversoes canonicas -----------------------------------------------------
// O `ceil` nao e arredondamento defensivo: o spread em L mostra o VERSO da folha
// L-1 a esquerda e a FRENTE da folha L a direita. Uma face impar (verso) so
// aparece quando a folha seguinte ja virou.

/** A folha que precisa estar virada para a face `f` aparecer. `ceil(f / 2)`. */
export const leafOfFace = (f: FaceIndex): LeafIndex => Math.ceil(f / 2) as LeafIndex;

/** A folha que precisa estar virada para a pagina impressa `n` aparecer.
 * `ceil((n + 1) / 2)`. */
export const leafOfPageNumber = (n: PageNumber): LeafIndex =>
  Math.ceil((n + 1) / 2) as LeafIndex;

/** A face onde a pagina impressa `n` mora. `n + 1` (a casca tem 2 faces antes do
 * miolo: capa na face 0, guarda na face 1). */
export const faceOfPageNumber = (n: PageNumber): FaceIndex => (n + 1) as FaceIndex;

/** O numero impresso da face `f`, ou `null` quando `f` e face de casca (`f < 2`).
 * Devolver `null` em vez de lancar deixa o chamador tratar sem derrubar o leitor
 * por um detalhe de numeracao. */
export const pageNumberOfFace = (f: FaceIndex): PageNumber | null =>
  f < 2 ? null : ((f - 1) as PageNumber);
