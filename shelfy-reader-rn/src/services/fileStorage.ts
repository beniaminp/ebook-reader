import * as FileSystem from 'expo-file-system';

const BOOKS_DIR = `${FileSystem.documentDirectory}books/`;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function ensureBooksDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(BOOKS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(BOOKS_DIR, { intermediates: true });
  }
}

export async function storeBookFile(
  bookId: string,
  filename: string,
  data: ArrayBuffer
): Promise<string> {
  const dir = `${BOOKS_DIR}${bookId}/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const path = `${dir}${filename}`;
  const base64 = arrayBufferToBase64(data);
  await FileSystem.writeAsStringAsync(path, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return path;
}

export async function readBookFile(filePath: string): Promise<ArrayBuffer> {
  const base64 = await FileSystem.readAsStringAsync(filePath, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return base64ToArrayBuffer(base64);
}

export async function deleteBookFile(bookId: string): Promise<void> {
  const dir = `${BOOKS_DIR}${bookId}/`;
  const info = await FileSystem.getInfoAsync(dir);
  if (info.exists) {
    await FileSystem.deleteAsync(dir, { idempotent: true });
  }
}

export async function getBookFilePath(
  bookId: string,
  filename: string
): Promise<string | null> {
  const path = `${BOOKS_DIR}${bookId}/${filename}`;
  const info = await FileSystem.getInfoAsync(path);
  return info.exists ? path : null;
}

export async function getBookFileSize(filePath: string): Promise<number> {
  const info = await FileSystem.getInfoAsync(filePath, { size: true });
  return info.exists && 'size' in info ? (info.size ?? 0) : 0;
}

export async function listBookFiles(bookId: string): Promise<string[]> {
  const dir = `${BOOKS_DIR}${bookId}/`;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) return [];
  return FileSystem.readDirectoryAsync(dir);
}

export async function storeCoverImage(
  bookId: string,
  data: ArrayBuffer,
  ext: string = 'jpg'
): Promise<string> {
  const dir = `${BOOKS_DIR}${bookId}/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const path = `${dir}cover.${ext}`;
  const base64 = arrayBufferToBase64(data);
  await FileSystem.writeAsStringAsync(path, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return path;
}

export async function getCoverPath(bookId: string): Promise<string | null> {
  const dir = `${BOOKS_DIR}${bookId}/`;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) return null;

  const files = await FileSystem.readDirectoryAsync(dir);
  const cover = files.find((f) => f.startsWith('cover.'));
  return cover ? `${dir}${cover}` : null;
}
