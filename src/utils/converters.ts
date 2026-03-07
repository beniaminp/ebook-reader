/**
 * Shared blob/buffer conversion utilities
 */

/**
 * Convert a Blob to a base64 data URL string using FileReader.
 * Returns the full data URL (e.g., "data:application/octet-stream;base64,...").
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert a Blob to a text string using FileReader.
 */
export function blobToText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(blob);
  });
}

/**
 * Convert an ArrayBuffer to a base64 string.
 * Uses chunked processing to avoid O(n^2) string concatenation and call stack limits.
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const CHUNK_SIZE = 0x8000;
  const chunks: string[] = [];
  for (let i = 0; i < bytes.byteLength; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, bytes.byteLength));
    chunks.push(String.fromCharCode(...chunk));
  }
  return btoa(chunks.join(''));
}
