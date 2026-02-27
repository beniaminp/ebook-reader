import WebTorrent from 'webtorrent';

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

class TorrentService {
  private client: WebTorrent.Instance | null = null;

  private getClient(): WebTorrent.Instance {
    if (!this.client) {
      this.client = new WebTorrent({ dht: false, lsd: false } as unknown as WebTorrent.Options);
    }
    return this.client;
  }

  seed(fileData: ArrayBuffer, fileName: string): Promise<string> {
    return new Promise((resolve, reject) => {
      let settled = false;
      const client = this.getClient();
      const file = new File([fileData], fileName);
      client.seed(file as unknown as Buffer, { announce: WSS_TRACKERS }, (torrent) => {
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

  download(
    magnetURI: string,
    onProgress?: (stats: TorrentStats) => void
  ): Promise<{ data: ArrayBuffer; fileName: string }> {
    return new Promise((resolve, reject) => {
      let settled = false;
      const client = this.getClient();
      client.add(magnetURI, { announce: WSS_TRACKERS }, (torrent) => {
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

  getSeedingStats(magnetURI: string): TorrentStats | null {
    const client = this.getClient();
    const torrent = client.get(magnetURI) as unknown as WebTorrent.Torrent | void;
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
    const client = this.getClient();
    const torrent = await client.get(magnetURI);
    if (torrent) {
      torrent.destroy();
    }
  }

  async isSeeding(magnetURI: string): Promise<boolean> {
    const client = this.getClient();
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
