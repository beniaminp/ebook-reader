import { Capacitor } from '@capacitor/core';

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

  private async getClient() {
    if (Capacitor.isNativePlatform()) {
      throw new Error('WebTorrent is not supported on native platforms');
    }
    if (!this.client) {
      const WT = await loadWebTorrent();
      this.client = new WT({ dht: false, lsd: false } as unknown as Record<string, unknown>);
    }
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
          if (!settled) {
            settled = true;
            console.log(`Seeding ${fileName}, magnet: ${torrent.magnetURI}`);
            resolve(torrent.magnetURI);
          }
        };
        // Wait for tracker to acknowledge the announce so peers can find us
        (torrent as unknown as { on(event: string, cb: () => void): void }).on(
          'trackerAnnounce',
          finish
        );
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
          // Emit final stats with progress=1
          emitStats();

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
    const client = await this.getClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const torrent = client.get(magnetURI) as any;
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
    const client = await this.getClient();
    const torrent = await client.get(magnetURI);
    if (torrent) {
      torrent.destroy();
    }
  }

  async isSeeding(magnetURI: string): Promise<boolean> {
    if (Capacitor.isNativePlatform()) return false;
    const client = await this.getClient();
    const torrent = await client.get(magnetURI);
    return !!torrent;
  }

  destroy(): void {
    if (this.client) {
      this.client.destroy();
      this.client = null;
    }
  }
}

export const torrentService = new TorrentService();
