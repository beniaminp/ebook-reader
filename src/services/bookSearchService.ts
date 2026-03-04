const WSS_TRACKERS = [
  'wss://tracker.openwebtorrent.com',
  'wss://tracker.btorrent.xyz',
];

export interface SearchResult {
  id: string;
  name: string;
  infoHash: string;
  seeders: number;
  leechers: number;
  size: number;
  numFiles: number;
  username: string;
  added: number;
}

const EBOOK_EXTENSIONS = [
  'epub', 'pdf', 'mobi', 'azw3', 'fb2', 'cbz', 'cbr',
  'txt', 'html', 'htm', 'md', 'docx', 'odt', 'chm',
];

export function detectFormat(name: string): string | null {
  const lower = name.toLowerCase();
  for (const ext of EBOOK_EXTENSIONS) {
    if (lower.includes(`.${ext}`)) return ext;
  }
  return null;
}

export function buildMagnetLink(infoHash: string, name: string): string {
  const dn = encodeURIComponent(name);
  const trackers = WSS_TRACKERS.map((t) => `&tr=${encodeURIComponent(t)}`).join('');
  return `magnet:?xt=urn:btih:${infoHash}&dn=${dn}${trackers}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export async function searchBooks(query: string): Promise<SearchResult[]> {
  const url = `https://apibay.org/q.php?q=${encodeURIComponent(query)}&cat=601`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Search failed: ${response.status}`);

  const data = await response.json();
  if (!Array.isArray(data)) return [];

  // API returns [{"id":"0","name":"No results..."}] when no results
  return data
    .filter((item: { id: string }) => item.id !== '0')
    .map((item: {
      id: string;
      name: string;
      info_hash: string;
      seeders: string;
      leechers: string;
      size: string;
      num_files: string;
      username: string;
      added: string;
    }) => ({
      id: item.id,
      name: item.name,
      infoHash: item.info_hash,
      seeders: parseInt(item.seeders, 10),
      leechers: parseInt(item.leechers, 10),
      size: parseInt(item.size, 10),
      numFiles: parseInt(item.num_files, 10),
      username: item.username,
      added: parseInt(item.added, 10),
    }));
}
