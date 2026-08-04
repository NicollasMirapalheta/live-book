/**
 * Migracao de schema (DOC-01, DOC-02).
 *
 * Roda no CARREGAMENTO do documento, nunca no save (migrar ao salvar propagaria
 * versao sem o usuario pedir). Leva um documento de qualquer versao conhecida ate
 * a corrente, preservando blocos de `type` desconhecido — perde-los apagaria
 * conteudo do usuario silenciosamente.
 */

import { SCHEMA_VERSION, type BookDoc } from "./schema";

/** Uma migracao leva o documento da versao `v` para `v + 1`. Recebe e devolve a
 * forma crua (a versao antiga nao satisfaz o tipo corrente). */
type Migration = (doc: Record<string, unknown>) => Record<string, unknown>;

/** Cadeia de migracoes, indexada pela versao de ORIGEM. Vazia enquanto so existe
 * a v1; a primeira migracao real (v1 -> v2) entra aqui quando o schema evoluir. */
const MIGRATIONS: Record<number, Migration> = {};

export interface MigrateResult {
  doc: BookDoc;
  /** Documento veio de uma versao futura: abre travado para leitura, porque
   * salvar destruiria campos que este cliente nao conhece. */
  readOnly: boolean;
}

export function migrateDoc(raw: unknown): MigrateResult {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error("migrateDoc: documento invalido — esperado um objeto BookDoc.");
  }

  const obj = raw as Record<string, unknown>;
  const version = obj.schemaVersion;

  if (typeof version !== "number") {
    throw new Error(
      "migrateDoc: documento sem schemaVersion numerico — nao e um BookDoc valido.",
    );
  }

  // Versao futura: nao migra para tras nem descarta o desconhecido. Abre so-leitura.
  if (version > SCHEMA_VERSION) {
    return { doc: obj as unknown as BookDoc, readOnly: true };
  }

  // Ja na versao corrente: no-op idempotente, devolve o mesmo documento.
  if (version === SCHEMA_VERSION) {
    return { doc: obj as unknown as BookDoc, readOnly: false };
  }

  // Versao antiga: aplica a cadeia de migracoes ate a corrente.
  let doc = obj;
  let v = version;
  while (v < SCHEMA_VERSION) {
    const migrate = MIGRATIONS[v];
    if (!migrate) {
      throw new Error(`migrateDoc: sem migracao de v${v} para v${v + 1}.`);
    }
    doc = migrate(doc);
    v += 1;
  }

  return { doc: doc as unknown as BookDoc, readOnly: false };
}
