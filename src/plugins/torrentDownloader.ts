import { registerPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';

export interface TorrentDownloadResult {
  fileData: string; // Base64-encoded
  fileName: string;
}

export interface TorrentProgressEvent {
  progress: number;
  downloadSpeed: number;
  numPeers: number;
  downloaded: number;
  totalSize: number;
  timeRemaining: number;
}

export interface TorrentDownloaderPlugin {
  download(options: { magnetURI: string }): Promise<TorrentDownloadResult>;
  cancel(): Promise<void>;
  addListener(
    eventName: 'downloadProgress',
    listenerFunc: (event: TorrentProgressEvent) => void
  ): Promise<PluginListenerHandle>;
}

export const TorrentDownloader = registerPlugin<TorrentDownloaderPlugin>('TorrentDownloader');
