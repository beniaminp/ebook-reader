import { Capacitor } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';

const WSS_TRACKERS = [
  'wss://tracker.openwebtorrent.com',
  'wss://tracker.btorrent.xyz',
];

export interface TorrentStats {
  progress: number;
  downloadSpeed: number;
  uploadSpeed: number;
  numPeers: number;
  downloaded: number;
  totalSize: number;
  timeRemaining: number;
}

// Lazy-load WebTorrent to avoid crashes on Android WebView
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let WebTorrentModule: any = null;
async function loadWebTorrent() {
  if (!WebTorrentModule) {
    const mod = await import('webtorrent');
    WebTorrentModule = mod.default;
  }
  return WebTorrentModule;
}

class TorrentService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private client: any = null;
  // Prevent concurrent initialization creating multiple clients
  private clientPromise: Promise<any> | null = null;

  private isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Returns true if torrent downloads are supported on the current platform.
   * Now supported on both web (WebTorrent) and native (jlibtorrent).
   */
  isSupported(): boolean {
    return true;
  }

  private async getClient() {
    if (this.isNative()) {
      throw new Error('WebTorrent is not supported on native platforms');
    }
    if (this.client) return this.client;
    // Use a cached promise to prevent race conditions where multiple
    // callers trigger concurrent initialization
    if (!this.clientPromise) {
      this.clientPromise = (async () => {
        try {
          const WT = await loadWebTorrent();
          return new WT({ dht: false, lsd: false } as unknown as Record<string, unknown>);
        } catch (err) {
          // Reset so future calls can retry
          this.clientPromise = null;
          throw new Error(
            `WebTorrent initialization failed: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      })();
    }
    this.client = await this.clientPromise;
    return this.client;
  }

  async seed(fileData: ArrayBuffer, fileName: string): Promise<string> {
    const client = await this.getClient();
    return new Promise((resolve, reject) => {
      let settled = false;
      const file = new File([fileData], fileName);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      client.seed(file as unknown as Buffer, { announce: WSS_TRACKERS }, (torrent: any) => {
        const finish = () => {
          if (settled) return;
          settled = true;
          torrent.removeListener('trackerAnnounce', finish);
          console.log(`Seeding ${fileName}, magnet: ${torrent.magnetURI}`);
          resolve(torrent.magnetURI);
        };
        // Wait for tracker to acknowledge the announce so peers can find us
        torrent.on('trackerAnnounce', finish);
        // Fallback: resolve after 3s even without tracker confirmation
        setTimeout(finish, 3000);
      });
      setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error('Seeding timed out'));
        }
      }, 30000);
    });
  }

  async download(
    magnetURI: string,
    onProgress?: (stats: TorrentStats) => void
  ): Promise<{ data: ArrayBuffer; fileName: string }> {
    if (this.isNative()) {
      return this.downloadNative(magnetURI, onProgress);
    }
    return this.downloadWeb(magnetURI, onProgress);
  }

  private async downloadNative(
    magnetURI: string,
    onProgress?: (stats: TorrentStats) => void
  ): Promise<{ data: ArrayBuffer; fileName: string }> {
    const { TorrentDownloader } = await import('../plugins/torrentDownloader');

    let listenerHandle: PluginListenerHandle | null = null;

    if (onProgress) {
      listenerHandle = await TorrentDownloader.addListener('downloadProgress', (event) => {
        onProgress({
          progress: event.progress,
          downloadSpeed: event.downloadSpeed,
          uploadSpeed: 0,
          numPeers: event.numPeers,
          downloaded: event.downloaded,
          totalSize: event.totalSize,
          timeRemaining: event.timeRemaining,
        });
      });
    }

    try {
      const result = await TorrentDownloader.download({ magnetURI });

      // Emit final progress
      if (onProgress) {
        onProgress({
          progress: 1,
          downloadSpeed: 0,
          uploadSpeed: 0,
          numPeers: 0,
          downloaded: 0,
          totalSize: 0,
          timeRemaining: 0,
        });
      }

      // Decode base64 to ArrayBuffer
      const binaryString = atob(result.fileData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      return { data: bytes.buffer, fileName: result.fileName };
    } finally {
      if (listenerHandle) {
        listenerHandle.remove();
      }
    }
  }

  private async downloadWeb(
    magnetURI: string,
    onProgress?: (stats: TorrentStats) => void
  ): Promise<{ data: ArrayBuffer; fileName: string }> {
    const client = await this.getClient();
    return new Promise((resolve, reject) => {
      let settled = false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      client.add(magnetURI, { announce: WSS_TRACKERS }, (torrent: any) => {
        const emitStats = () => {
          if (onProgress) {
            onProgress({
              progress: torrent.progress,
              downloadSpeed: torrent.downloadSpeed,
              uploadSpeed: torrent.uploadSpeed,
              numPeers: torrent.numPeers,
              downloaded: torrent.downloaded,
              totalSize: torrent.length,
              timeRemaining: torrent.timeRemaining,
            });
          }
        };

        torrent.on('download', emitStats);

        // Emit initial stats so UI shows peers connecting
        emitStats();

        torrent.on('done', () => {
          // Clean up the download progress listener
          torrent.removeListener('download', emitStats);

          // Emit final stats with progress=1
          if (onProgress) {
            onProgress({
              progress: 1,
              downloadSpeed: 0,
              uploadSpeed: torrent.uploadSpeed,
              numPeers: torrent.numPeers,
              downloaded: torrent.downloaded,
              totalSize: torrent.length,
              timeRemaining: 0,
            });
          }

          const file = torrent.files[0];
          if (!file) {
            if (!settled) { settled = true; reject(new Error('No files in torrent')); }
            return;
          }
          (file as unknown as { arrayBuffer: () => Promise<ArrayBuffer> })
            .arrayBuffer()
            .then((data: ArrayBuffer) => {
              // Don't destroy the torrent — let it auto-seed for the community
              if (!settled) { settled = true; resolve({ data, fileName: file.name }); }
            })
            .catch((err: Error) => {
              if (!settled) { settled = true; reject(err); }
            });
        });
      });
      setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error('Download timed out'));
        }
      }, 300000);
    });
  }

  async getSeedingStats(magnetURI: string): Promise<TorrentStats | null> {
    if (!this.client) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const torrent = this.client.get(magnetURI) as any;
    if (!torrent) return null;
    return {
      progress: torrent.progress,
      downloadSpeed: torrent.downloadSpeed,
      uploadSpeed: torrent.uploadSpeed,
      numPeers: torrent.numPeers,
      downloaded: torrent.downloaded,
      totalSize: torrent.length,
      timeRemaining: torrent.timeRemaining,
    };
  }

  async stopSeeding(magnetURI: string): Promise<void> {
    if (!this.client) return;
    // client.get() is synchronous — do not await it
    const torrent = this.client.get(magnetURI);
    if (torrent) {
      torrent.destroy();
    }
  }

  async isSeeding(magnetURI: string): Promise<boolean> {
    if (!this.client) return false;
    // client.get() is synchronous — do not await it
    const torrent = this.client.get(magnetURI);
    return !!torrent;
  }

  destroy(): void {
    if (this.client) {
      this.client.destroy();
      this.client = null;
      this.clientPromise = null;
    }
  }
}

export const torrentService = new TorrentService();
