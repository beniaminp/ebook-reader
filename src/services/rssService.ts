/**
 * RSS/Atom Feed Service
 *
 * Fetches and parses RSS and Atom feeds, converting articles
 * into a format suitable for reading in the ebook reader.
 */

import { XMLParser } from 'fast-xml-parser';

export interface RssFeed {
  id: string;
  url: string;
  title: string;
  description?: string;
  lastFetched?: string;
}

export interface RssArticle {
  id: string;
  feedId: string;
  title: string;
  author?: string;
  url: string;
  content: string;
  summary?: string;
  publishDate?: string;
  read: boolean;
  savedToLibrary: boolean;
}

interface ParsedFeed {
  title: string;
  description?: string;
  articles: Omit<RssArticle, 'id' | 'feedId' | 'read' | 'savedToLibrary'>[];
}

const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
];

async function fetchWithCorsProxy(url: string): Promise<string> {
  // Try direct fetch first
  try {
    const resp = await fetch(url, { mode: 'cors' });
    if (resp.ok) return await resp.text();
  } catch {
    // CORS blocked, try proxies
  }

  for (const proxy of CORS_PROXIES) {
    try {
      const resp = await fetch(`${proxy}${encodeURIComponent(url)}`);
      if (resp.ok) return await resp.text();
    } catch {
      continue;
    }
  }

  throw new Error('Failed to fetch feed - all methods failed');
}

function parseXml(xml: string): ParsedFeed {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
  });
  const parsed = parser.parse(xml);

  // RSS 2.0
  if (parsed.rss?.channel) {
    return parseRss2(parsed.rss.channel);
  }

  // Atom
  if (parsed.feed) {
    return parseAtom(parsed.feed);
  }

  // RSS 1.0 (RDF)
  if (parsed['rdf:RDF']) {
    return parseRdf(parsed['rdf:RDF']);
  }

  throw new Error('Unrecognized feed format');
}

function parseRss2(channel: any): ParsedFeed {
  const items = Array.isArray(channel.item) ? channel.item : channel.item ? [channel.item] : [];

  return {
    title: channel.title || 'Untitled Feed',
    description: channel.description,
    articles: items.map((item: any) => ({
      title: item.title || 'Untitled',
      author: item['dc:creator'] || item.author,
      url: item.link || '',
      content: item['content:encoded'] || item.description || '',
      summary: item.description,
      publishDate: item.pubDate,
    })),
  };
}

function parseAtom(feed: any): ParsedFeed {
  const entries = Array.isArray(feed.entry) ? feed.entry : feed.entry ? [feed.entry] : [];

  return {
    title: feed.title?.['#text'] || feed.title || 'Untitled Feed',
    description: feed.subtitle?.['#text'] || feed.subtitle,
    articles: entries.map((entry: any) => {
      const link = Array.isArray(entry.link)
        ? entry.link.find((l: any) => l['@_rel'] === 'alternate' || !l['@_rel'])?.['@_href']
        : entry.link?.['@_href'] || entry.link;

      return {
        title: entry.title?.['#text'] || entry.title || 'Untitled',
        author: entry.author?.name,
        url: link || '',
        content: entry.content?.['#text'] || entry.content || entry.summary?.['#text'] || entry.summary || '',
        summary: entry.summary?.['#text'] || entry.summary,
        publishDate: entry.published || entry.updated,
      };
    }),
  };
}

function parseRdf(rdf: any): ParsedFeed {
  const items = Array.isArray(rdf.item) ? rdf.item : rdf.item ? [rdf.item] : [];

  return {
    title: rdf.channel?.title || 'Untitled Feed',
    description: rdf.channel?.description,
    articles: items.map((item: any) => ({
      title: item.title || 'Untitled',
      author: item['dc:creator'],
      url: item.link || '',
      content: item['content:encoded'] || item.description || '',
      summary: item.description,
      publishDate: item['dc:date'],
    })),
  };
}

/**
 * Fetch and parse an RSS/Atom feed.
 */
export async function fetchFeed(url: string): Promise<ParsedFeed> {
  const xml = await fetchWithCorsProxy(url);
  return parseXml(xml);
}

/**
 * Convert an article's HTML content into a standalone HTML document
 * suitable for import as a book.
 */
export function articleToHtml(article: RssArticle): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(article.title)}</title>
  <meta name="author" content="${escapeHtml(article.author || 'Unknown')}">
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 16px; }
    img { max-width: 100%; height: auto; }
    a { color: #2563eb; }
    h1 { font-size: 1.5em; margin-bottom: 0.5em; }
    .meta { color: #666; font-size: 0.9em; margin-bottom: 1.5em; }
  </style>
</head>
<body>
  <h1>${escapeHtml(article.title)}</h1>
  <div class="meta">
    ${article.author ? `<span>By ${escapeHtml(article.author)}</span>` : ''}
    ${article.publishDate ? `<span> &middot; ${new Date(article.publishDate).toLocaleDateString()}</span>` : ''}
    ${article.url ? `<br><a href="${escapeHtml(article.url)}">Original article</a>` : ''}
  </div>
  <article>${article.content}</article>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
