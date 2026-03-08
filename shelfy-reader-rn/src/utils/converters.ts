/**
 * Shared conversion utilities for React Native.
 *
 * - Base64 ↔ ArrayBuffer (using RN-compatible APIs, no FileReader/Blob)
 * - Snake_case ↔ camelCase for DB row mapping
 */

/**
 * Convert an ArrayBuffer to a base64 string.
 * Uses chunked processing to avoid call stack limits with large files.
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const CHUNK_SIZE = 0x8000;
  const chunks: string[] = [];
  for (let i = 0; i < bytes.byteLength; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, bytes.byteLength));
    chunks.push(String.fromCharCode(...chunk));
  }
  // btoa is available in RN (Hermes) and Expo
  return btoa(chunks.join(''));
}

/**
 * Convert a base64 string to an ArrayBuffer.
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  // Strip data URI prefix if present (e.g. "data:application/octet-stream;base64,")
  const raw = base64.includes(',') ? base64.split(',')[1] : base64;
  const binaryString = atob(raw);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Convert a snake_case string to camelCase.
 * Example: "book_id" → "bookId"
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

/**
 * Convert a camelCase string to snake_case.
 * Example: "bookId" → "book_id"
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Convert all keys of a record from snake_case to camelCase.
 * Useful for mapping DB rows to app-layer types.
 */
export function mapRowKeys<T extends Record<string, unknown>>(
  row: Record<string, unknown>,
): T {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(row)) {
    result[snakeToCamel(key)] = row[key];
  }
  return result as T;
}

/**
 * Convert all keys of a record from camelCase to snake_case.
 * Useful for preparing app-layer objects for DB insertion.
 */
export function mapToDbKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    result[camelToSnake(key)] = obj[key];
  }
  return result;
}
