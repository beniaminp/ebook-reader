/**
 * Sharing Store
 * Manages P2P book sharing state.
 *
 * React Native version: WebTorrent is not available on RN.
 * Sharing uses Firebase Storage only. The torrentService references
 * are removed since RN does not support WebTorrent.
 */

import { create } from 'zustand';
import { firebaseStorageService } from '../services/firebase/storage';
import { sharingService, type SharedBookDoc } from '../services/sharingService';
import { getUserId } from '../services/userIdentityService';
import { webFileStorage } from '../services/webFileStorage';
import { useAppStore } from './useAppStore';

interface TorrentStats {
  progress: number;
  downloadSpeed: number;
  uploadSpeed: number;
  numPeers: number;
  timeRemaining: number;
}

interface SharingState {
  communityBooks: SharedBookDoc[];
  mySharedBooks: SharedBookDoc[];
  isSharingBook: boolean;
  isDownloading: boolean;
  downloadProgress: number;
  downloadStats: TorrentStats | null;
  error: string | null;

  shareBook: (book: {
    id: string;
    title: string;
    author: string;
    format: string;
  }) => Promise<void>;
  unshareBook: (doc: SharedBookDoc) => Promise<void>;
  downloadSharedBook: (doc: SharedBookDoc) => Promise<void>;
  loadCommunityBooks: () => Promise<void>;
  loadMySharedBooks: () => Promise<void>;
  resumeSeeding: () => Promise<void>;
}

const FILE_SIZE_WARN = 50 * 1024 * 1024; // 50MB

export const useSharingStore = create<SharingState>((set, get) => ({
  communityBooks: [],
  mySharedBooks: [],
  isSharingBook: false,
  isDownloading: false,
  downloadProgress: 0,
  downloadStats: null,
  error: null,

  shareBook: async (book) => {
    set({ isSharingBook: true, error: null });
    try {
      const userId = await getUserId();
      const fileData = await webFileStorage.getFile(book.id);
      if (!fileData) {
        throw new Error('Book file not found in local storage');
      }
      if (fileData.byteLength > FILE_SIZE_WARN) {
        console.warn('File is larger than 50MB, sharing may be slow');
      }
      const fileName = `${book.title}.${book.format}`;

      // RN only uses Firebase Storage (no WebTorrent)
      const downloadURL = await firebaseStorageService.uploadBook(book.id, fileData, fileName);

      await sharingService.shareBook({
        magnetURI: undefined,
        downloadURL,
        title: book.title,
        author: book.author,
        format: book.format,
        fileSize: fileData.byteLength,
        userId,
        localBookId: book.id,
      });
      await get().loadMySharedBooks();
      set({ isSharingBook: false });
    } catch (error) {
      set({
        isSharingBook: false,
        error: error instanceof Error ? error.message : 'Failed to share book',
      });
    }
  },

  unshareBook: async (doc) => {
    try {
      // Delete from Firebase Storage if applicable
      if (doc.downloadURL) {
        try {
          const fileName = `${doc.title}.${doc.format}`;
          await firebaseStorageService.deleteBook(doc.localBookId, fileName);
        } catch (err) {
          console.warn('Failed to delete from Firebase Storage:', err);
        }
      }
      if (doc.id) {
        await sharingService.unshareBook(doc.id);
      }
      await get().loadMySharedBooks();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to unshare book',
      });
    }
  },

  downloadSharedBook: async (doc) => {
    set({ isDownloading: true, downloadProgress: 0, error: null });
    try {
      let data: ArrayBuffer;
      let fileName: string;

      if (doc.downloadURL) {
        const result = await firebaseStorageService.downloadBook(
          doc.downloadURL,
          (progress) => set({ downloadProgress: progress, downloadStats: null })
        );
        data = result.data;
        fileName = result.fileName;
      } else {
        throw new Error('No download source available for this book');
      }

      const bookId = `p2p_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      await webFileStorage.storeFile(bookId, data);
      const appStore = useAppStore.getState();
      await appStore.addBook({
        id: bookId,
        title: doc.title,
        author: doc.author,
        filePath: `indexeddb://${bookId}/${fileName}`,
        format: doc.format as 'epub' | 'pdf' | 'txt' | 'html' | 'htm' | 'md' | 'markdown' | 'mobi' | 'azw3' | 'fb2' | 'cbz' | 'cbr' | 'chm' | 'docx' | 'odt',
        totalPages: 0,
        currentPage: 0,
        progress: 0,
        lastRead: new Date(),
        source: 'local',
        downloaded: true,
      });
      set({ isDownloading: false, downloadProgress: 1, downloadStats: null });
    } catch (error) {
      set({
        isDownloading: false,
        downloadStats: null,
        error: error instanceof Error ? error.message : 'Failed to download book',
      });
    }
  },

  loadCommunityBooks: async () => {
    try {
      const books = await sharingService.getAllSharedBooks();
      set({ communityBooks: books });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load community books',
      });
    }
  },

  loadMySharedBooks: async () => {
    try {
      const userId = await getUserId();
      const books = await sharingService.getMySharedBooks(userId);
      set({ mySharedBooks: books });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load shared books',
      });
    }
  },

  resumeSeeding: async () => {
    // WebTorrent seeding is not available on React Native -- no-op
    return;
  },
}));
