export type BookFormat =
  | 'epub'
  | 'pdf'
  | 'mobi'
  | 'azw3'
  | 'fb2'
  | 'cbz'
  | 'cbr'
  | 'txt'
  | 'html'
  | 'md'
  | 'docx'
  | 'odt';

const FORMAT_EXTENSIONS: Record<string, BookFormat> = {
  '.epub': 'epub',
  '.pdf': 'pdf',
  '.mobi': 'mobi',
  '.azw3': 'azw3',
  '.fb2': 'fb2',
  '.cbz': 'cbz',
  '.cbr': 'cbr',
  '.txt': 'txt',
  '.html': 'html',
  '.htm': 'html',
  '.md': 'md',
  '.markdown': 'md',
  '.docx': 'docx',
  '.odt': 'odt',
};

const FORMAT_MIME_TYPES: Record<string, BookFormat> = {
  'application/epub+zip': 'epub',
  'application/pdf': 'pdf',
  'application/x-mobipocket-ebook': 'mobi',
  'application/vnd.amazon.ebook': 'azw3',
  'application/x-fictionbook+xml': 'fb2',
  'application/vnd.comicbook+zip': 'cbz',
  'application/vnd.comicbook-rar': 'cbr',
  'text/plain': 'txt',
  'text/html': 'html',
  'text/markdown': 'md',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.oasis.opendocument.text': 'odt',
};

export function detectFormat(filename: string, mimeType?: string): BookFormat | null {
  if (mimeType && FORMAT_MIME_TYPES[mimeType]) {
    return FORMAT_MIME_TYPES[mimeType];
  }
  const ext = filename.toLowerCase().match(/\.[^.]+$/)?.[0];
  return ext ? FORMAT_EXTENSIONS[ext] ?? null : null;
}

export function getFormatDisplayName(format: BookFormat): string {
  return format.toUpperCase();
}

export function isWebViewFormat(format: BookFormat): boolean {
  return ['epub', 'mobi', 'azw3', 'fb2', 'txt', 'html', 'md', 'docx', 'odt'].includes(format);
}

export function isPdfFormat(format: BookFormat): boolean {
  return format === 'pdf';
}

export function isComicFormat(format: BookFormat): boolean {
  return format === 'cbz' || format === 'cbr';
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatReadingTime(minutes: number): string {
  if (minutes < 1) return 'Less than a minute';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatPercentage(value: number): string {
  return `${Math.round(value * 100)}%`;
}
