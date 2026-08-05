/**
 * `exif` — leitura da orientacao EXIF de um JPEG (MEDIA-01 AC2).
 *
 * So a tag de orientacao (0x0112) importa aqui: o pipeline usa o valor 1..8 para
 * girar/espelhar a imagem no canvas, de modo que a variante processada saia na
 * orientacao correta. PNG/WEBP/AVIF nao carregam esse marcador no fluxo que
 * tratamos — retornam 1 (sem rotacao), assim como um JPEG sem EXIF.
 *
 * Robustez e requisito: um buffer truncado ou malformado NUNCA lanca — retorna 1.
 */

/** Marcador APP1 de um JPEG (onde o bloco Exif vive). */
const APP1 = 0xffe1;
/** Marcador SOS (inicio do scan): dados de imagem comecam aqui, EXIF ja passou. */
const SOS = 0xffda;
/** Tag TIFF de orientacao. */
const ORIENTATION_TAG = 0x0112;

/**
 * Devolve a orientacao EXIF (1..8) de um JPEG, ou 1 quando ausente/ilegivel.
 * Nunca lanca: qualquer overrun de limites cai no retorno neutro 1.
 */
export function readExifOrientation(buf: ArrayBuffer): number {
  try {
    const view = new DataView(buf);
    if (view.byteLength < 2) return 1;
    // Nao e JPEG (FFD8): nenhum marcador APP1 a procurar.
    if (view.getUint16(0) !== 0xffd8) return 1;

    let offset = 2;
    while (offset + 4 <= view.byteLength) {
      const marker = view.getUint16(offset);
      // Segmentos validos comecam com 0xFF__; fora disso, aborta.
      if ((marker & 0xff00) !== 0xff00) return 1;
      if (marker === SOS) return 1; // chegou ao scan sem achar EXIF
      const size = view.getUint16(offset + 2);
      if (size < 2) return 1;
      if (marker === APP1) {
        const found = parseApp1(view, offset + 4, offset + 2 + size);
        if (found !== null) return found;
      }
      offset += 2 + size;
    }
    return 1;
  } catch {
    return 1;
  }
}

/** Le o bloco APP1 (`start`..`end`); devolve a orientacao ou null se nao houver. */
function parseApp1(view: DataView, start: number, end: number): number | null {
  // Prefixo obrigatorio "Exif\0\0" (6 bytes) antes do cabecalho TIFF.
  if (start + 6 > end) return null;
  if (
    view.getUint8(start) !== 0x45 || // E
    view.getUint8(start + 1) !== 0x78 || // x
    view.getUint8(start + 2) !== 0x69 || // i
    view.getUint8(start + 3) !== 0x66 || // f
    view.getUint8(start + 4) !== 0x00 ||
    view.getUint8(start + 5) !== 0x00
  ) {
    return null;
  }

  const tiff = start + 6;
  if (tiff + 8 > end) return null;

  // Ordem de bytes do TIFF: "II" (little) ou "MM" (big).
  const byteOrder = view.getUint16(tiff);
  const little = byteOrder === 0x4949;
  if (!little && byteOrder !== 0x4d4d) return null;

  // Offset da IFD0 (relativo ao inicio do TIFF).
  const ifdOffset = view.getUint32(tiff + 4, little);
  const ifd = tiff + ifdOffset;
  if (ifd + 2 > end) return null;

  const count = view.getUint16(ifd, little);
  for (let i = 0; i < count; i++) {
    const entry = ifd + 2 + i * 12;
    if (entry + 12 > end) return null;
    if (view.getUint16(entry, little) === ORIENTATION_TAG) {
      // Orientacao e um SHORT; o valor fica nos 2 primeiros bytes do campo valor.
      const value = view.getUint16(entry + 8, little);
      return value >= 1 && value <= 8 ? value : 1;
    }
  }
  return null;
}
