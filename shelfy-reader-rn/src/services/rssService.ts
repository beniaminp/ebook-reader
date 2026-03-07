/**
 * RSS Service - Stub
 * Placeholder for RSS feed reading functionality.
 */

export interface RssFeed {
  id: string;
  title: string;
  url: string;
  description?: string;
  lastFetched?: string;
  lastUpdated?: Date;
}

export interface RssArticle {
  id: string;
  feedId: string;
  title: string;
  url: string;
  content: string;
  link?: string;
  author?: string;
  published?: Date;
  read: boolean;
  savedToLibrary: boolean;
}

export interface ParsedFeed {
  title: string;
  description?: string;
  articles: Array<{
    title: string;
    url: string;
    content: string;
    link?: string;
    author?: string;
    published?: Date;
  }>;
}

export async function fetchFeed(_url: string): Promise<ParsedFeed> {
  console.warn('RSS service not yet implemented');
  return {
    title: '',
    description: '',
    articles: [],
  };
}

export async function parseFeedXml(_xml: string): Promise<ParsedFeed> {
  return {
    title: '',
    description: '',
    articles: [],
  };
}

export const rssService = {
  fetchFeed,
  parseFeedXml,
};

export default rssService;
