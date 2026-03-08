/**
 * Firebase Storage Stub
 *
 * React Native version:
 * - Exports the same interface as the Ionic version
 * - All operations log warnings and return safe defaults / throw
 * - To integrate: install @react-native-firebase/storage
 *
 * TODO: Replace with real implementation using @react-native-firebase/storage
 */

/**
 * Upload a book file to Firebase Storage for sharing.
 * Stub: throws until Firebase is configured.
 */
export async function uploadBook(
  bookId: string,
  fileData: ArrayBuffer,
  fileName: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  console.warn('[Firebase Storage] uploadBook called but Firebase is not configured');
  throw new Error(
    'Firebase is not configured. Install @react-native-firebase/storage to enable file uploads.'
  );
}

/**
 * Download a book file from Firebase Storage.
 * Stub: throws until Firebase is configured.
 */
export async function downloadBook(
  downloadURL: string,
  onProgress?: (progress: number) => void
): Promise<{ data: ArrayBuffer; fileName: string }> {
  console.warn('[Firebase Storage] downloadBook called but Firebase is not configured');

  // Fall back to a simple fetch if a valid URL is provided
  // This allows basic download even without Firebase SDK
  if (downloadURL.startsWith('http')) {
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

    const data = await response.arrayBuffer();
    onProgress?.(1);
    return { data, fileName };
  }

  throw new Error(
    'Firebase is not configured. Install @react-native-firebase/storage to enable file downloads.'
  );
}

/**
 * Delete a book file from Firebase Storage.
 * Stub: no-op until Firebase is configured.
 */
export async function deleteBook(bookId: string, fileName: string): Promise<void> {
  console.warn('[Firebase Storage] deleteBook called but Firebase is not configured');
}

export const firebaseStorageService = {
  uploadBook,
  downloadBook,
  deleteBook,
};
