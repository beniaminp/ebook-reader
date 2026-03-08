import { Paths, File, Directory } from 'expo-file-system';

const BOOKS_DIR = new Directory(Paths.document, 'books');

export async function ensureBooksDir(): Promise<void> {
  if (!BOOKS_DIR.exists) {
    BOOKS_DIR.create({ intermediates: true });
  }
}

export async function storeBookFile(
  bookId: string,
  filename: string,
  data: ArrayBuffer
): Promise<string> {
  const dir = new Directory(BOOKS_DIR, bookId);
  if (!dir.exists) {
    dir.create({ intermediates: true });
  }
  const file = new File(dir, filename);
  const bytes = new Uint8Array(data);
  file.write(bytes);
  return file.uri;
}

export async function readBookFile(filePath: string): Promise<ArrayBuffer> {
  const file = new File(filePath);
  const bytes = await file.bytes();
  return bytes.buffer;
}

export async function deleteBookFile(bookId: string): Promise<void> {
  const dir = new Directory(BOOKS_DIR, bookId);
  if (dir.exists) {
    dir.delete();
  }
}

export async function getBookFilePath(
  bookId: string,
  filename: string
): Promise<string | null> {
  const file = new File(BOOKS_DIR, bookId, filename);
  return file.exists ? file.uri : null;
}

export async function getBookFileSize(filePath: string): Promise<number> {
  const file = new File(filePath);
  return file.exists ? file.size : 0;
}

export async function listBookFiles(bookId: string): Promise<string[]> {
  const dir = new Directory(BOOKS_DIR, bookId);
  if (!dir.exists) return [];
  const entries = dir.list();
  return entries
    .filter((e): e is File => e instanceof File)
    .map((f) => f.uri.split('/').pop() ?? '');
}

export async function storeCoverImage(
  bookId: string,
  data: ArrayBuffer,
  ext: string = 'jpg'
): Promise<string> {
  const dir = new Directory(BOOKS_DIR, bookId);
  if (!dir.exists) {
    dir.create({ intermediates: true });
  }
  const file = new File(dir, `cover.${ext}`);
  const bytes = new Uint8Array(data);
  file.write(bytes);
  return file.uri;
}

export async function getCoverPath(bookId: string): Promise<string | null> {
  const dir = new Directory(BOOKS_DIR, bookId);
  if (!dir.exists) return null;

  const entries = dir.list();
  const cover = entries.find(
    (e): e is File =>
      e instanceof File && e.uri.split('/').pop()?.startsWith('cover.') === true
  );
  return cover ? cover.uri : null;
}
