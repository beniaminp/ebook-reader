import WebTorrent from 'webtorrent';

const WSS_TRACKERS = [
  'wss://tracker.openwebtorrent.com',
  'wss://tracker.btorrent.xyz',
];

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
        if (!settled) {
          settled = true;
          resolve(torrent.magnetURI);
        }
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
    onProgress?: (progress: number) => void
  ): Promise<{ data: ArrayBuffer; fileName: string }> {
    return new Promise((resolve, reject) => {
      let settled = false;
      const client = this.getClient();
      client.add(magnetURI, { announce: WSS_TRACKERS }, (torrent) => {
        if (onProgress) {
          torrent.on('download', () => {
            onProgress(torrent.progress);
          });
        }
        torrent.on('done', () => {
          const file = torrent.files[0];
          if (!file) {
            if (!settled) { settled = true; reject(new Error('No files in torrent')); }
            return;
          }
          (file as unknown as { arrayBuffer: () => Promise<ArrayBuffer> })
            .arrayBuffer()
            .then((data: ArrayBuffer) => {
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
