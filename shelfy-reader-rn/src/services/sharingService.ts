/**
 * Sharing Service - Stub
 * Placeholder for book sharing functionality.
 * WebTorrent P2P is not available in React Native.
 */

export interface ShareInfo {
  bookId: string;
  shareUrl?: string;
  status: 'idle' | 'sharing' | 'error';
  error?: string;
}

export async function shareBook(_bookId: string): Promise<ShareInfo> {
  console.warn('Sharing not yet implemented in React Native');
  return {
    bookId: _bookId,
    status: 'error',
    error: 'Sharing is not available in the React Native version',
  };
}

export async function stopSharing(_bookId: string): Promise<void> {
  // No-op
}

export const sharingService = {
  shareBook,
  stopSharing,
};

export default sharingService;
