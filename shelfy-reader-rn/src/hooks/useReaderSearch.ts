/**
 * useReaderSearch Hook
 * Provides in-book search functionality for the reader toolbar.
 *
 * Accepts a search query and book content (plain text or HTML),
 * returns match results with navigation (next / previous).
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

export interface SearchMatch {
  /** Zero-based index of this match in the matches array */
  index: number;
  /** Character offset in the stripped text where this match starts */
  startOffset: number;
  /** Character offset in the stripped text where this match ends (exclusive) */
  endOffset: number;
  /** A short excerpt of surrounding text for display */
  excerpt: string;
}

export interface UseReaderSearchOptions {
  /** The text content to search within (plain text or HTML - tags will be stripped) */
  content: string;
  /** Whether to treat the content as HTML and strip tags before searching */
  isHtml?: boolean;
  /** Maximum number of results to return (default 500) */
  maxResults?: number;
  /** Number of context characters around each match for the excerpt (default 40) */
  excerptContext?: number;
}

export interface UseReaderSearchReturn {
  /** The current search query */
  query: string;
  /** Set the search query */
  setQuery: (query: string) => void;
  /** Array of matches found */
  matches: SearchMatch[];
  /** Total number of matches */
  totalMatches: number;
  /** Index of the currently active match (0-based), -1 if no matches */
  currentMatchIndex: number;
  /** The currently active match, or null */
  currentMatch: SearchMatch | null;
  /** Navigate to the next match */
  goToNext: () => void;
  /** Navigate to the previous match */
  goToPrevious: () => void;
  /** Jump to a specific match by index */
  goToMatch: (index: number) => void;
  /** Clear search state */
  clearSearch: () => void;
  /** Whether a search is active (query is non-empty) */
  isSearching: boolean;
  /** Display string like "3 of 12" */
  matchPositionLabel: string;
}

/**
 * Strip HTML tags from a string, preserving text content
 */
function stripHtmlTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * Create a short excerpt around a match position
 */
function createExcerpt(
  text: string,
  startOffset: number,
  endOffset: number,
  contextChars: number
): string {
  const excerptStart = Math.max(0, startOffset - contextChars);
  const excerptEnd = Math.min(text.length, endOffset + contextChars);

  let excerpt = '';
  if (excerptStart > 0) excerpt += '...';
  excerpt += text.substring(excerptStart, excerptEnd);
  if (excerptEnd < text.length) excerpt += '...';

  return excerpt;
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const useReaderSearch = (options: UseReaderSearchOptions): UseReaderSearchReturn => {
  const {
    content,
    isHtml = false,
    maxResults = 500,
    excerptContext = 40,
  } = options;

  const [query, setQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce the query to avoid excessive re-computation on every keystroke
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, 200);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  // Strip HTML and prepare the searchable text
  const searchableText = useMemo(() => {
    if (!content) return '';
    return isHtml ? stripHtmlTags(content) : content;
  }, [content, isHtml]);

  // Find all matches
  const matches = useMemo((): SearchMatch[] => {
    if (!debouncedQuery || debouncedQuery.length < 2 || !searchableText) {
      return [];
    }

    const results: SearchMatch[] = [];

    try {
      const pattern = new RegExp(escapeRegex(debouncedQuery), 'gi');
      let match: RegExpExecArray | null;

      while ((match = pattern.exec(searchableText)) !== null) {
        if (results.length >= maxResults) break;

        const startOffset = match.index;
        const endOffset = startOffset + match[0].length;

        results.push({
          index: results.length,
          startOffset,
          endOffset,
          excerpt: createExcerpt(searchableText, startOffset, endOffset, excerptContext),
        });
      }
    } catch {
      // If regex fails for any reason, return empty results
    }

    return results;
  }, [debouncedQuery, searchableText, maxResults, excerptContext]);

  // Reset current match index when matches change
  useEffect(() => {
    if (matches.length > 0) {
      setCurrentMatchIndex(0);
    } else {
      setCurrentMatchIndex(-1);
    }
  }, [matches]);

  const goToNext = useCallback(() => {
    if (matches.length === 0) return;
    setCurrentMatchIndex((prev) => (prev + 1) % matches.length);
  }, [matches.length]);

  const goToPrevious = useCallback(() => {
    if (matches.length === 0) return;
    setCurrentMatchIndex((prev) => (prev - 1 + matches.length) % matches.length);
  }, [matches.length]);

  const goToMatch = useCallback(
    (index: number) => {
      if (index >= 0 && index < matches.length) {
        setCurrentMatchIndex(index);
      }
    },
    [matches.length]
  );

  const clearSearch = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
    setCurrentMatchIndex(-1);
  }, []);

  const currentMatch = matches.length > 0 && currentMatchIndex >= 0
    ? matches[currentMatchIndex]
    : null;

  const matchPositionLabel =
    matches.length > 0 && currentMatchIndex >= 0
      ? `${currentMatchIndex + 1} of ${matches.length}`
      : 'No matches';

  return {
    query,
    setQuery,
    matches,
    totalMatches: matches.length,
    currentMatchIndex,
    currentMatch,
    goToNext,
    goToPrevious,
    goToMatch,
    clearSearch,
    isSearching: query.length > 0,
    matchPositionLabel,
  };
};

export default useReaderSearch;
