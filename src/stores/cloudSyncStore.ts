/**
 * Cloud Sync Store
 * Manages cloud synchronization state and settings
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { cloudSyncService } from '../services/cloudSyncService';
import type {
  CloudProviderType,
  CloudCredentials,
  SyncStatus,
  SyncProgress,
  SyncResult,
  ConflictResolution,
  CloudBookFile,
} from '../types/cloudSync';

interface CloudSyncState {
  // Connection state
  connectedProvider: CloudProviderType | null;
  isConnected: boolean;
  accountEmail: string | null;
  accountName: string | null;
  quotaUsed: number | null;
  quotaTotal: number | null;

  // Sync settings
  autoSync: boolean;
  syncInterval: number; // minutes
  syncOnWifiOnly: boolean;
  conflictResolution: ConflictResolution;

  // Sync state
  syncStatus: SyncStatus;
  lastSyncTime: number;
  lastSyncResult: SyncResult | null;
  syncProgress: SyncProgress | null;

  // Cloud books
  cloudBooks: CloudBookFile[];

  // Error state
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  connect: (providerType: CloudProviderType, credentials: CloudCredentials) => Promise<boolean>;
  disconnect: () => Promise<void>;
  testConnection: () => Promise<boolean>;

  // Sync actions
  syncData: (
    bookmarks: any[],
    highlights: any[],
    progress: any[]
  ) => Promise<SyncResult>;
  manualSync: () => Promise<void>;
  cancelSync: () => void;

  // Book actions
  listCloudBooks: () => Promise<CloudBookFile[]>;
  uploadBook: (localPath: string, remotePath: string) => Promise<string>;
  downloadBook: (remotePath: string, localPath: string) => Promise<string>;
  deleteCloudBook: (remotePath: string) => Promise<boolean>;

  // Settings actions
  setAutoSync: (enabled: boolean) => void;
  setSyncInterval: (minutes: number) => void;
  setSyncOnWifiOnly: (enabled: boolean) => void;
  setConflictResolution: (resolution: ConflictResolution) => void;

  // State actions
  setSyncStatus: (status: SyncStatus) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useCloudSyncStore = create<CloudSyncState>()(
  persist(
    (set, get) => ({
      // Initial state
      connectedProvider: null,
      isConnected: false,
      accountEmail: null,
      accountName: null,
      quotaUsed: null,
      quotaTotal: null,
      autoSync: false,
      syncInterval: 30,
      syncOnWifiOnly: true,
      conflictResolution: 'last-write-wins',
      syncStatus: 'idle',
      lastSyncTime: 0,
      lastSyncResult: null,
      syncProgress: null,
      cloudBooks: [],
      error: null,

      // Initialize the service
      initialize: async () => {
        try {
          await cloudSyncService.initialize();
          const providerType = cloudSyncService.getCurrentProviderType();
          const isConnected = cloudSyncService.isConnected();
          const lastSyncTime = await cloudSyncService.getStoredLastSyncTime();

          set({
            connectedProvider: providerType,
            isConnected,
            lastSyncTime,
          });

          if (isConnected) {
            // Load cloud books
            const books = await cloudSyncService.listBooks();
            set({ cloudBooks: books });
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to initialize cloud sync',
          });
        }
      },

      // Connect to a provider
      connect: async (providerType, credentials) => {
        set({ syncStatus: 'syncing', error: null });

        try {
          const result = await cloudSyncService.connect(providerType, credentials);

          if (result.success) {
            set({
              connectedProvider: providerType,
              isConnected: true,
              accountEmail: result.accountInfo?.email || null,
              accountName: result.accountInfo?.name || null,
              quotaUsed: result.accountInfo?.quotaUsed || null,
              quotaTotal: result.accountInfo?.quotaTotal || null,
              syncStatus: 'idle',
              error: null,
            });

            // Load cloud books
            const books = await cloudSyncService.listBooks();
            set({ cloudBooks: books });

            return true;
          }

          set({
            syncStatus: 'error',
            error: result.error || 'Failed to connect',
          });

          return false;
        } catch (error) {
          set({
            syncStatus: 'error',
            error: error instanceof Error ? error.message : 'Connection failed',
          });

          return false;
        }
      },

      // Disconnect from provider
      disconnect: async () => {
        try {
          await cloudSyncService.disconnect();
          set({
            connectedProvider: null,
            isConnected: false,
            accountEmail: null,
            accountName: null,
            quotaUsed: null,
            quotaTotal: null,
            syncStatus: 'idle',
            lastSyncTime: 0,
            lastSyncResult: null,
            cloudBooks: [],
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to disconnect',
          });
        }
      },

      // Test connection
      testConnection: async () => {
        try {
          const connected = await cloudSyncService.testConnection();
          set({ isConnected: connected });
          return connected;
        } catch {
          set({ isConnected: false });
          return false;
        }
      },

      // Sync data
      syncData: async (bookmarks, highlights, progress) => {
        set({ syncStatus: 'syncing', error: null, syncProgress: null });

        try {
          const result = await cloudSyncService.syncData(
            bookmarks,
            highlights,
            progress,
            get().conflictResolution,
            (progress) => {
              set({ syncProgress: progress });
            }
          );

          set({
            syncStatus: result.success ? 'success' : 'error',
            lastSyncTime: Date.now(),
            lastSyncResult: result,
            syncProgress: null,
          });

          if (result.errors.length > 0) {
            set({
              error: result.errors.join(', '),
            });
          }

          return result;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Sync failed';
          set({
            syncStatus: 'error',
            error: errorMessage,
            syncProgress: null,
          });

          return {
            success: false,
            bookmarksAdded: 0,
            bookmarksUpdated: 0,
            bookmarksRemoved: 0,
            highlightsAdded: 0,
            highlightsUpdated: 0,
            highlightsRemoved: 0,
            progressUpdated: 0,
            conflicts: [],
            errors: [errorMessage],
            duration: 0,
          };
        }
      },

      // Manual sync
      manualSync: async () => {
        // This will be called from the UI component with actual data
        set({ syncStatus: 'syncing', error: null });
      },

      // Cancel sync
      cancelSync: () => {
        set({
          syncStatus: 'idle',
          syncProgress: null,
        });
      },

      // List cloud books
      listCloudBooks: async () => {
        try {
          const books = await cloudSyncService.listBooks();
          set({ cloudBooks: books });
          return books;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to list books',
          });
          return [];
        }
      },

      // Upload book
      uploadBook: async (localPath, remotePath) => {
        try {
          return await cloudSyncService.uploadBook(localPath, remotePath, (progress) => {
            set({
              syncProgress: {
                status: 'syncing',
                currentOperation: 'uploading-book',
                currentFile: remotePath,
                progress,
                itemsCompleted: 0,
                itemsTotal: 1,
                bytesTransferred: 0,
                totalBytes: 0,
              },
            });
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to upload book',
          });
          throw error;
        }
      },

      // Download book
      downloadBook: async (remotePath, localPath) => {
        try {
          return await cloudSyncService.downloadBook(remotePath, localPath, (progress) => {
            set({
              syncProgress: {
                status: 'syncing',
                currentOperation: 'downloading-book',
                currentFile: remotePath,
                progress,
                itemsCompleted: 0,
                itemsTotal: 1,
                bytesTransferred: 0,
                totalBytes: 0,
              },
            });
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to download book',
          });
          throw error;
        }
      },

      // Delete cloud book
      deleteCloudBook: async (remotePath) => {
        try {
          const success = await cloudSyncService.deleteBook(remotePath);
          if (success) {
            set((state) => ({
              cloudBooks: state.cloudBooks.filter((b) => b.path !== remotePath),
            }));
          }
          return success;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to delete book',
          });
          return false;
        }
      },

      // Settings actions
      setAutoSync: (enabled) => set({ autoSync: enabled }),
      setSyncInterval: (minutes) => set({ syncInterval: minutes }),
      setSyncOnWifiOnly: (enabled) => set({ syncOnWifiOnly: enabled }),
      setConflictResolution: (resolution) => set({ conflictResolution: resolution }),

      // State actions
      setSyncStatus: (status) => set({ syncStatus: status }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'cloud-sync-storage',
      partialize: (state) => ({
        autoSync: state.autoSync,
        syncInterval: state.syncInterval,
        syncOnWifiOnly: state.syncOnWifiOnly,
        conflictResolution: state.conflictResolution,
        lastSyncTime: state.lastSyncTime,
        lastSyncResult: state.lastSyncResult,
        connectedProvider: state.connectedProvider,
        isConnected: state.isConnected,
        accountEmail: state.accountEmail,
        accountName: state.accountName,
        quotaUsed: state.quotaUsed,
        quotaTotal: state.quotaTotal,
      }),
    }
  )
);

// Re-export types
export type {
  CloudProviderType,
  CloudCredentials,
  SyncStatus,
  SyncProgress,
  SyncResult,
  ConflictResolution,
  CloudBookFile,
};
