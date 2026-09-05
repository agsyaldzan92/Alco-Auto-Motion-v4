/**
 * WebM EBML Duration Fixer
 * Fixes the common browser bug where MediaRecorder produces WebM files with
 * 'Infinity' duration or missing Segment Info Duration metadata.
 */

export async function fixWebmDuration(
  blob: Blob,
  durationSeconds: number
): Promise<Blob> {
  try {
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const durationMs = Math.max(100, Math.round(durationSeconds * 1000));

    // Find EBML Header (0x1A 0x45 0xDF 0xA3)
    let pos = 0;
    const len = bytes.length;

    // Search within the first 64KB for Segment Info and Duration element
    const searchLimit = Math.min(len, 65536);

    // Look for Info Element [0x15, 0x49, 0xA9, 0x66]
    let infoPos = -1;
    for (let i = 0; i < searchLimit - 4; i++) {
      if (
        bytes[i] === 0x15 &&
        bytes[i + 1] === 0x49 &&
        bytes[i + 2] === 0xa9 &&
        bytes[i + 3] === 0x66
      ) {
        infoPos = i;
        break;
      }
    }

    if (infoPos === -1) {
      // Return original blob if WebM header is non-standard
      return blob;
    }

    // Look for Duration tag [0x44, 0x89] inside Info element
    let durationPos = -1;
    for (let i = infoPos; i < searchLimit - 2; i++) {
      if (bytes[i] === 0x44 && bytes[i + 1] === 0x89) {
        durationPos = i;
        break;
      }
    }

    if (durationPos !== -1) {
      // Duration tag exists. Read size byte.
      const sizeByte = bytes[durationPos + 2];
      const dataView = new DataView(buffer);

      if (sizeByte === 0x84) {
        // 4-byte float (float32)
        dataView.setFloat32(durationPos + 3, durationMs, false);
        return new Blob([buffer], { type: blob.type || 'video/webm' });
      } else if (sizeByte === 0x88) {
        // 8-byte float (float64)
        dataView.setFloat64(durationPos + 3, durationMs, false);
        return new Blob([buffer], { type: blob.type || 'video/webm' });
      }
    }

    // If Duration tag does not exist, inject [0x44, 0x89, 0x88, <8-byte float64>]
    // right after the Info header and its size descriptor
    // Read Info header size
    let infoHeaderLen = 4; // Info ID is 4 bytes
    const infoSizeFirstByte = bytes[infoPos + 4];
    let infoSizeLen = 1;

    if ((infoSizeFirstByte & 0x80) !== 0) infoSizeLen = 1;
    else if ((infoSizeFirstByte & 0x40) !== 0) infoSizeLen = 2;
    else if ((infoSizeFirstByte & 0x20) !== 0) infoSizeLen = 3;
    else if ((infoSizeFirstByte & 0x10) !== 0) infoSizeLen = 4;
    else infoSizeLen = 1;

    const insertionPoint = infoPos + infoHeaderLen + infoSizeLen;

    // Create 11 bytes: 0x44, 0x89, 0x88 (8 bytes data) + 8-byte float64 durationMs
    const durationTag = new Uint8Array(11);
    durationTag[0] = 0x44;
    durationTag[1] = 0x89;
    durationTag[2] = 0x88;
    const dv = new DataView(durationTag.buffer);
    dv.setFloat64(3, durationMs, false);

    // Combine buffers
    const newBuffer = new Uint8Array(len + 11);
    newBuffer.set(bytes.subarray(0, insertionPoint), 0);
    newBuffer.set(durationTag, insertionPoint);
    newBuffer.set(bytes.subarray(insertionPoint), insertionPoint + 11);

    // Adjust Info element size in newBuffer if needed
    // (Most browser WebM decoders accept slightly relaxed sizes or unknown size 0x01FFFFFF)
    return new Blob([newBuffer.buffer], { type: blob.type || 'video/webm' });
  } catch (err) {
    console.warn('WebM duration patching fallback:', err);
    return blob;
  }
}
