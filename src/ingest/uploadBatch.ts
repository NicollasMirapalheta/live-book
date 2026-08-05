/**
 * `uploadBatch` — lote de upload resumivel em pipeline (dimensoes implicitas da
 * spec: falha parcial, concorrencia, integridade de transicao).
 *
 * Processa N+1 enquanto sobe N (pipeline de um-a-frente), com upload SERIAL por
 * arquivo. Um arquivo recusado (HEIC/nao-imagem) ou que falhe no upload vai para
 * `failed` sem quebrar o lote; os que subiram ficam em `uploaded`. Como so devolve
 * `AssetRef`s (NUNCA escreve pagina nem documento), uma ingestao interrompida jamais
 * deixa pagina parcial — anexar pagina e salvar sao responsabilidade da rota (T10),
 * e so acontecem para os assets efetivamente em `uploaded`.
 *
 * Retomar = chamar de novo com os arquivos que faltaram: os ja enviados nao sao
 * reenviados porque nao voltam na lista.
 *
 * O `process` e um seam injetavel (default `processInPipeline`): os testes injetam
 * um fake e exercitam pipeline/serie/falha sem worker nem DOM.
 */

import type { AssetRef } from "../book/schema";
import type { StorageAdapter } from "../data/StorageAdapter";
import { ImageRejectedError, processInPipeline, type ProcessedImage } from "../media/pipeline";
import type { RejectReason } from "../media/validate";

/** Motivo de um arquivo nao ter subido: recusa de imagem ou falha de upload. */
export type BatchFailureReason = RejectReason | "upload-failed";

export interface BatchFailure {
  /** nome do arquivo, para o usuario reconhecer o que faltou e retomar. */
  file: string;
  reason: BatchFailureReason;
}

export interface BatchResult {
  uploaded: AssetRef[];
  failed: BatchFailure[];
}

export interface BatchProgress {
  /** quantos arquivos ja foram tentados (sucesso + falha). */
  done: number;
  total: number;
  /** quantos subiram com sucesso ate agora. */
  uploaded: number;
  /** quantos falharam ate agora. */
  failed: number;
}

/** Seam de ambiente: o default processa via worker/fallback; testes injetam fake. */
export interface UploadBatchDeps {
  process(file: File): Promise<ProcessedImage>;
}

const defaultDeps: UploadBatchDeps = { process: processInPipeline };

function reasonOf(err: unknown): BatchFailureReason {
  return err instanceof ImageRejectedError ? err.reason : "upload-failed";
}

/**
 * Sobe `files` para `bookId`, pipeline de um-a-frente, upload serial. Devolve os
 * `AssetRef`s enviados e a lista de falhas. So depende de `uploadAsset` do adapter:
 * estruturalmente incapaz de escrever pagina ou documento.
 */
export async function uploadBatch(
  files: File[],
  bookId: string,
  adapter: Pick<StorageAdapter, "uploadAsset">,
  onProgress?: (p: BatchProgress) => void,
  deps: UploadBatchDeps = defaultDeps,
): Promise<BatchResult> {
  const uploaded: AssetRef[] = [];
  const failed: BatchFailure[] = [];
  const total = files.length;

  // Pipeline: mantem SEMPRE o proximo arquivo em processamento enquanto o atual sobe.
  // `settle` guarda o resultado sem estourar a Promise ainda, para o await do proximo
  // nunca lancar fora do loop.
  let processing: Promise<ProcessedImage> | null = total > 0 ? deps.process(files[0]) : null;

  for (let i = 0; i < total; i++) {
    const current = processing;
    // Dispara o processamento do PROXIMO agora, para sobrepor ao upload do atual.
    processing = i + 1 < total ? deps.process(files[i + 1]) : null;

    let img: ProcessedImage;
    try {
      img = await (current as Promise<ProcessedImage>);
    } catch (err) {
      failed.push({ file: files[i].name, reason: reasonOf(err) });
      onProgress?.({ done: i + 1, total, uploaded: uploaded.length, failed: failed.length });
      continue;
    }

    try {
      // Serial: um unico `uploadAsset` em voo por vez (o proximo so em process()).
      const ref = await adapter.uploadAsset(bookId, img);
      uploaded.push(ref);
    } catch (err) {
      failed.push({ file: files[i].name, reason: reasonOf(err) });
    }

    onProgress?.({ done: i + 1, total, uploaded: uploaded.length, failed: failed.length });
  }

  return { uploaded, failed };
}
