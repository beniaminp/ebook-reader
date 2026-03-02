/**
 * OPDS Service
 * Parses OPDS Atom/XML feeds for catalog browsing
 * Supports navigation feeds (catalogs) and acquisition feeds (books)
 */

import { XMLParser } from 'fast-xml-parser';
import { Capacitor, CapacitorHttp } from '@capacitor/core';

// ============================================================================
// TYPES
// ============================================================================

export interface OpdsCatalog {
  id: string;
  name: string;
  url: string;
  description?: string;
  icon?: string;
  username?: string;
  password?: string;
}

export interface OpdsLink {
  href: string;
  rel: string;
  type: string;
  title?: string;
}

export interface OpdsEntry {
  id: string;
  title: string;
  author?: string;
  summary?: string;
  content?: string;
  updated?: string;
  coverUrl?: string;
  thumbnailUrl?: string;
  links: OpdsLink[];
  categories?: string[];
}

export interface OpdsBook extends OpdsEntry {
  downloadLinks: OpdsDownloadLink[];
  isAcquisition: true;
}

export interface OpdsNavEntry extends OpdsEntry {
  isAcquisition: false;
}

export interface OpdsDownloadLink {
  href: string;
  type: string;
  format: 'epub' | 'pdf' | 'mobi' | 'fb2' | 'txt' | 'unknown';
  title?: string;
}

export interface OpdsFeed {
  id: string;
  title: string;
  updated?: string;
  entries: (OpdsBook | OpdsNavEntry)[];
  nextPageUrl?: string;
  prevPageUrl?: string;
  startUrl?: string;
  searchUrl?: string;
  totalResults?: number;
  isAcquisitionFeed: boolean;
}

// ============================================================================
// WELL-KNOWN CATALOGS
// ============================================================================

export const DEFAULT_OPDS_CATALOGS: OpdsCatalog[] = [
  {
    id: 'project-gutenberg',
    name: 'Project Gutenberg',
    url: 'https://www.gutenberg.org/ebooks.opds/',
    description: 'Over 60,000 free eBooks',
    icon: 'book',
  },
  {
    id: 'standard-ebooks',
    name: 'Standard Ebooks',
    url: 'https://standardebooks.org/opds',
    description: 'Free, high-quality public domain ebooks',
    icon: 'bookmarks',
  },
  {
    id: 'manybooks',
    name: 'ManyBooks',
    url: 'https://manybooks.net/opds/index.php',
    description: 'Free eBooks in multiple formats',
    icon: 'library',
  },
];

// ============================================================================
// CONSTANTS - OPDS MIME TYPES / REL VALUES
// ============================================================================

const ACQUISITION_RELS = [
  'http://opds-spec.org/acquisition',
  'http://opds-spec.org/acquisition/open-access',
  'http://opds-spec.org/acquisition/buy',
  'http://opds-spec.org/acquisition/borrow',
  'http://opds-spec.org/acquisition/subscribe',
  'http://opds-spec.org/acquisition/sample',
];

const FORMAT_TYPES: Record<string, OpdsDownloadLink['format']> = {
  'application/epub+zip': 'epub',
  'application/pdf': 'pdf',
  'application/x-mobipocket-ebook': 'mobi',
  'application/x-fb2+zip': 'fb2',
  'text/plain': 'txt',
  'text/plain;charset=utf-8': 'txt',
};

const COVER_RELS = ['http://opds-spec.org/image', 'http://opds-spec.org/cover', 'cover'];

const THUMBNAIL_RELS = [
  'http://opds-spec.org/image/thumbnail',
  'http://opds-spec.org/thumbnail',
  'thumbnail',
];

// ============================================================================
// XML PARSER
// ============================================================================

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  isArray: (tagName) => ['entry', 'link', 'author', 'category'].includes(tagName),
  parseAttributeValue: true,
});

// ============================================================================
// PARSING HELPERS
// ============================================================================

function normalizeText(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    if (obj['#text']) return String(obj['#text']);
    if (obj['div']) return extractText(obj['div']);
  }
  return String(value);
}

function extractText(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(extractText).join(' ');
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    return Object.values(obj)
      .filter((v) => typeof v === 'string')
      .join(' ');
  }
  return '';
}

function parseLinks(entry: Record<string, unknown>): OpdsLink[] {
  const rawLinks = entry['link'];
  if (!rawLinks) return [];

  const links = Array.isArray(rawLinks) ? rawLinks : [rawLinks];
  return links
    .filter((l): l is Record<string, unknown> => typeof l === 'object' && l !== null)
    .map((link) => ({
      href: String(link['@_href'] || ''),
      rel: String(link['@_rel'] || ''),
      type: String(link['@_type'] || ''),
      title: link['@_title'] ? String(link['@_title']) : undefined,
    }))
    .filter((l) => l.href);
}

function detectFormat(type: string): OpdsDownloadLink['format'] {
  const normalized = type.toLowerCase().split(';')[0].trim();
  return FORMAT_TYPES[normalized] || 'unknown';
}

function parseFeedEntry(entry: Record<string, unknown>): OpdsBook | OpdsNavEntry {
  const id = normalizeText(entry['id']);
  const title = normalizeText(entry['title']);
  const summary = normalizeText(entry['summary']);
  const content = normalizeText(entry['content']);
  const updated = normalizeText(entry['updated']);

  // Parse author
  let author: string | undefined;
  const rawAuthor = entry['author'];
  if (rawAuthor) {
    const authors = Array.isArray(rawAuthor) ? rawAuthor : [rawAuthor];
    const authorNames = authors
      .filter((a): a is Record<string, unknown> => typeof a === 'object' && a !== null)
      .map((a) => normalizeText(a['name']));
    if (authorNames.length > 0) author = authorNames.join(', ');
  }

  // Parse categories
  const rawCategories = entry['category'];
  const categories: string[] = [];
  if (rawCategories) {
    const cats = Array.isArray(rawCategories) ? rawCategories : [rawCategories];
    cats.forEach((c) => {
      if (typeof c === 'object' && c !== null) {
        const cat = c as Record<string, unknown>;
        const label = cat['@_label'] || cat['@_term'];
        if (label) categories.push(String(label));
      }
    });
  }

  const links = parseLinks(entry);

  // Find cover and thumbnail
  const coverLink = links.find((l) => COVER_RELS.includes(l.rel));
  const thumbnailLink = links.find((l) => THUMBNAIL_RELS.includes(l.rel));
  const coverUrl = coverLink?.href;
  const thumbnailUrl = thumbnailLink?.href;

  // Find download links (acquisition links)
  const downloadLinks: OpdsDownloadLink[] = links
    .filter((l) => ACQUISITION_RELS.includes(l.rel))
    .map((l) => ({
      href: l.href,
      type: l.type,
      format: detectFormat(l.type),
      title: l.title,
    }));

  const isAcquisition = downloadLinks.length > 0;

  const base: OpdsEntry = {
    id,
    title,
    author,
    summary,
    content,
    updated,
    coverUrl,
    thumbnailUrl,
    links,
    categories,
  };

  if (isAcquisition) {
    return { ...base, downloadLinks, isAcquisition: true };
  }
  return { ...base, isAcquisition: false };
}

// ============================================================================
// MAIN FEED PARSER
// ============================================================================

export function parseOpdsFeed(xmlString: string, baseUrl?: string): OpdsFeed {
  const parsed = parser.parse(xmlString);

  const feed = parsed['feed'] || parsed;
  if (!feed) {
    throw new Error('Invalid OPDS feed: no feed element found');
  }

  const feedId = normalizeText(feed['id']);
  const feedTitle = normalizeText(feed['title']);
  const feedUpdated = normalizeText(feed['updated']);

  // Parse feed-level links
  const feedLinks = parseLinks(feed);

  const nextPageUrl = feedLinks.find((l) => l.rel === 'next')?.href;
  const prevPageUrl = feedLinks.find((l) => l.rel === 'previous' || l.rel === 'prev')?.href;
  const startUrl = feedLinks.find((l) => l.rel === 'start')?.href;
  const searchLink = feedLinks.find(
    (l) => l.type === 'application/opensearchdescription+xml' || l.rel === 'search'
  );
  const searchUrl = searchLink?.href;

  // Parse total results from opensearch
  const totalResults = feed['os:totalResults'] || feed['totalResults'];
  const total = totalResults ? parseInt(String(totalResults), 10) : undefined;

  // Parse entries
  const rawEntries = feed['entry'] || [];
  const entries = Array.isArray(rawEntries) ? rawEntries : [rawEntries];
  const parsedEntries = entries
    .filter((e): e is Record<string, unknown> => typeof e === 'object' && e !== null)
    .map(parseFeedEntry);

  // Detect if this is an acquisition feed (has books with download links)
  const isAcquisitionFeed = parsedEntries.some((e) => e.isAcquisition);

  // Resolve relative URLs against the feed's base URL
  const resolve = (href: string | undefined) => {
    if (!href || !baseUrl) return href;
    try {
      return new URL(href, baseUrl).href;
    } catch {
      return href;
    }
  };

  // Resolve URLs in all entries
  if (baseUrl) {
    for (const entry of parsedEntries) {
      entry.coverUrl = resolve(entry.coverUrl);
      entry.thumbnailUrl = resolve(entry.thumbnailUrl);
      for (const link of entry.links) {
        link.href = resolve(link.href)!;
      }
      if (entry.isAcquisition) {
        for (const dl of (entry as OpdsBook).downloadLinks) {
          dl.href = resolve(dl.href)!;
        }
      }
    }
  }

  return {
    id: feedId,
    title: feedTitle,
    updated: feedUpdated,
    entries: parsedEntries,
    nextPageUrl: resolve(nextPageUrl),
    prevPageUrl: resolve(prevPageUrl),
    startUrl: resolve(startUrl),
    searchUrl: resolve(searchUrl),
    totalResults: total,
    isAcquisitionFeed,
  };
}

// ============================================================================
// HTTP FETCHING
// ============================================================================

export interface FetchFeedOptions {
  signal?: AbortSignal;
  username?: string;
  password?: string;
}

/**
 * Route a URL through a CORS proxy when running in the browser.
 * - Native Capacitor: no proxy needed (no CORS restrictions).
 * - Vite dev server: uses the local /api/cors-proxy endpoint.
 * - Production (GitHub Pages): uses allorigins.win as CORS proxy.
 */
export function proxyUrl(url: string): string {
  // Native Capacitor — no proxy needed (no CORS restrictions)
  if ((window as any)?.Capacitor?.isNativePlatform?.()) return url;

  // Dev server has a local proxy
  if (import.meta.env.DEV) {
    return `/api/cors-proxy?url=${encodeURIComponent(url)}`;
  }

  // Production (GitHub Pages) — use allorigins.win (returns raw content)
  return `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
}

export async function fetchOpdsFeed(
  url: string,
  options: FetchFeedOptions = {}
): Promise<OpdsFeed> {
  const { signal, username, password } = options;

  const headers: Record<string, string> = {
    Accept: 'application/atom+xml, application/xml, text/xml, */*',
  };

  if (username && password) {
    const credentials = btoa(`${username}:${password}`);
    headers['Authorization'] = `Basic ${credentials}`;
  }

  let text: string;

  if (Capacitor.isNativePlatform()) {
    // Use CapacitorHttp on native to bypass WebView CORS restrictions
    const res = await CapacitorHttp.request({
      url,
      method: 'GET',
      headers,
    });
    if (res.status < 200 || res.status >= 300) {
      throw new Error(`Failed to fetch OPDS feed: ${res.status}`);
    }
    text = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
  } else {
    const response = await fetch(proxyUrl(url), { headers, signal });
    if (!response.ok) {
      throw new Error(`Failed to fetch OPDS feed: ${response.status} ${response.statusText}`);
    }
    text = await response.text();
  }

  return parseOpdsFeed(text, url);
}

export async function searchOpdsCatalog(
  searchUrl: string,
  query: string,
  options: FetchFeedOptions = {}
): Promise<OpdsFeed> {
  // OPDS search uses OpenSearch template format: replace {searchTerms}
  const resolvedUrl = searchUrl.replace('{searchTerms}', encodeURIComponent(query));
  return fetchOpdsFeed(resolvedUrl, options);
}

// ============================================================================
// CATALOG STORAGE (localStorage fallback)
// ============================================================================

const OPDS_CATALOGS_KEY = 'opds_catalogs';

export function loadSavedCatalogs(): OpdsCatalog[] {
  try {
    const stored = localStorage.getItem(OPDS_CATALOGS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // ignore parse errors
  }
  return [...DEFAULT_OPDS_CATALOGS];
}

export function saveCatalogs(catalogs: OpdsCatalog[]): void {
  localStorage.setItem(OPDS_CATALOGS_KEY, JSON.stringify(catalogs));
}

export function addCatalog(catalog: Omit<OpdsCatalog, 'id'>): OpdsCatalog {
  const catalogs = loadSavedCatalogs();
  const newCatalog: OpdsCatalog = {
    ...catalog,
    id: `opds-${Date.now()}`,
  };
  catalogs.push(newCatalog);
  saveCatalogs(catalogs);
  return newCatalog;
}

export function updateCatalog(id: string, updates: Partial<Omit<OpdsCatalog, 'id'>>): void {
  const catalogs = loadSavedCatalogs().map((c) => (c.id === id ? { ...c, ...updates } : c));
  saveCatalogs(catalogs);
}

export function removeCatalog(id: string): void {
  const catalogs = loadSavedCatalogs().filter((c) => c.id !== id);
  saveCatalogs(catalogs);
}

export const opdsService = {
  parseOpdsFeed,
  fetchOpdsFeed,
  searchOpdsCatalog,
  loadSavedCatalogs,
  saveCatalogs,
  addCatalog,
  updateCatalog,
  removeCatalog,
  DEFAULT_OPDS_CATALOGS,
};

export default opdsService;
