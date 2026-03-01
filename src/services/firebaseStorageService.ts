import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { storage } from '../config/firebaseConfig';

export async function uploadBook(
  bookId: string,
  fileData: ArrayBuffer,
  fileName: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  const storageRef = ref(storage, `shared-books/${bookId}/${fileName}`);
  const uploadTask = uploadBytesResumable(storageRef, new Uint8Array(fileData));

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (onProgress) {
          onProgress(snapshot.bytesTransferred / snapshot.totalBytes);
        }
      },
      (error) => reject(error),
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(downloadURL);
      }
    );
  });
}

export async function downloadBook(
  downloadURL: string,
  onProgress?: (progress: number) => void
): Promise<{ data: ArrayBuffer; fileName: string }> {
  const response = await fetch(downloadURL);
  if (!response.ok) {
    throw new Error(`Download failed: ${response.statusText}`);
  }

  const contentDisposition = response.headers.get('content-disposition');
  let fileName = 'book';
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
    if (match) fileName = match[1];
  }
  // Try to extract filename from URL path as fallback
  if (fileName === 'book') {
    try {
      const url = new URL(downloadURL);
      const pathParts = decodeURIComponent(url.pathname).split('/');
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart && lastPart.includes('.')) {
        fileName = lastPart;
      }
    } catch {
      // keep default
    }
  }

  if (onProgress) {
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      const total = parseInt(contentLength, 10);
      const reader = response.body?.getReader();
      if (reader) {
        const chunks: Uint8Array[] = [];
        let received = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          received += value.length;
          onProgress(received / total);
        }
        const combined = new Uint8Array(received);
        let offset = 0;
        for (const chunk of chunks) {
          combined.set(chunk, offset);
          offset += chunk.length;
        }
        return { data: combined.buffer as ArrayBuffer, fileName };
      }
    }
  }

  const data = await response.arrayBuffer();
  return { data, fileName };
}

export async function deleteBook(bookId: string, fileName: string): Promise<void> {
  const storageRef = ref(storage, `shared-books/${bookId}/${fileName}`);
  await deleteObject(storageRef);
}

export const firebaseStorageService = {
  uploadBook,
  downloadBook,
  deleteBook,
};
