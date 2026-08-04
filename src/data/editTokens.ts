/**
 * Token de edicao por volume e link de resgate (DATA-06, `AD-017`).
 *
 * Sem login, a permissao de editar um volume e o `edit_token`, guardado em
 * `localStorage` por id de volume. Limpar o navegador apagaria essa permissao
 * permanentemente — por isso ha um caminho de recuperacao FORA do navegador: o link
 * de resgate, exibido uma vez na criacao para o autor guardar.
 *
 * O token viaja no FRAGMENTO da URL de resgate (`#...`), nunca em query string:
 * fragmento nao vai ao servidor nem entra em log de acesso (regra de privacidade).
 *
 * `localStorage` indisponivel (navegador sem armazenamento, modo restrito) lanca
 * erro explicito — a edicao e recusada com explicacao, nunca falha em silencio.
 */

const KEY_PREFIX = "lb.editToken.";

class StorageUnavailableError extends Error {
  constructor() {
    super(
      "editTokens: localStorage indisponivel — a edicao nao pode ser autorizada neste navegador.",
    );
    this.name = "StorageUnavailableError";
  }
}

/** Le `localStorage` no momento da chamada (nao cacheia), lancando erro explicito se
 * indisponivel. Ler no momento da chamada mantem a funcao testavel via stub. */
function storage(): Storage {
  let ls: Storage | undefined;
  try {
    ls = globalThis.localStorage;
  } catch {
    // acesso pode lancar (SecurityError com cookies bloqueados)
    throw new StorageUnavailableError();
  }
  if (!ls) throw new StorageUnavailableError();
  return ls;
}

export function getEditToken(bookId: string): string | null {
  return storage().getItem(KEY_PREFIX + bookId);
}

export function setEditToken(bookId: string, token: string): void {
  storage().setItem(KEY_PREFIX + bookId, token);
}

export function clearEditToken(bookId: string): void {
  storage().removeItem(KEY_PREFIX + bookId);
}

/** Monta o fragmento de URL do link de resgate. Devolve algo como
 * `#b=<id>&t=<token>` — sempre no fragmento, para o token nao vazar ao servidor. */
export function encodeRescue(bookId: string, token: string): string {
  const params = new URLSearchParams({ b: bookId, t: token });
  return `#${params.toString()}`;
}

/** Le o fragmento do link de resgate de volta para `{ id, token }`. Devolve `null`
 * quando o fragmento nao e um resgate valido (o navegador entrega hashes variados). */
export function decodeRescue(hash: string): { id: string; token: string } | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(raw);
  const id = params.get("b");
  const token = params.get("t");
  if (!id || !token) return null;
  return { id, token };
}
