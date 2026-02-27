import { create } from 'zustand';
import { torrentService } from '../services/torrentService';
import { sharingService, type SharedBookDoc } from '../services/sharingService';
import { getUserId } from '../services/userIdentityService';
import { webFileStorage } from '../services/webFileStorage';
import { useAppStore } from './useAppStore';

interface SharingState {
  communityBooks: SharedBookDoc[];
  mySharedBooks: SharedBookDoc[];
  isSharingBook: boolean;
  isDownloading: boolean;
  downloadProgress: number;
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
      const magnetURI = await torrentService.seed(fileData, fileName);
      await sharingService.shareBook({
        magnetURI,
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
      if (doc.magnetURI) {
        torrentService.stopSeeding(doc.magnetURI);
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
      const { data, fileName } = await torrentService.download(
        doc.magnetURI,
        (progress) => set({ downloadProgress: progress })
      );
      const bookId = `p2p_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      await webFileStorage.storeFile(bookId, data);
      const appStore = useAppStore.getState();
      await appStore.addBook({
        id: bookId,
        title: doc.title,
        author: doc.author,
        filePath: fileName,
        format: doc.format as 'epub' | 'pdf' | 'txt' | 'html' | 'htm' | 'md' | 'markdown' | 'mobi' | 'azw3' | 'fb2' | 'cbz' | 'cbr' | 'chm' | 'docx' | 'odt',
        totalPages: 0,
        currentPage: 0,
        progress: 0,
        lastRead: new Date(),
        source: 'local',
        downloaded: true,
      });
      set({ isDownloading: false, downloadProgress: 1 });
    } catch (error) {
      set({
        isDownloading: false,
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
    try {
      const userId = await getUserId();
      const myBooks = await sharingService.getMySharedBooks(userId);
      set({ mySharedBooks: myBooks });
      for (const book of myBooks) {
        if (!(await torrentService.isSeeding(book.magnetURI))) {
          const fileData = await webFileStorage.getFile(book.localBookId);
          if (fileData) {
            const fileName = `${book.title}.${book.format}`;
            await torrentService.seed(fileData, fileName);
          }
        }
      }
    } catch (error) {
      console.error('Failed to resume seeding:', error);
    }
  },
}));
