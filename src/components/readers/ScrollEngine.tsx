/**
 * ScrollEngine — consolidated scroll-based renderer for TXT, HTML, and Markdown.
 *
 * Implements ReaderEngineRef. Renders content in a scrollable div with
 * ReaderContainer for theme integration.
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { ReaderContainer } from '../reader-ui/ReaderContainer';
import type { ReaderEngineRef, SearchResult, ReaderProgress, Chapter } from '../../types/reader';

export interface ScrollEngineProps {
  /** Raw text content (plain text, HTML, or Markdown source). */
  content: string;
  /** Determines how content is processed before rendering. */
  contentType: 'text' | 'html' | 'markdown';
  /** Ref to the parent IonContent for scroll control. */
  ionContentRef?: React.RefObject<HTMLIonContentElement | null>;
  /** Called on scroll progress changes. */
  onRelocate?: (progress: ReaderProgress) => void;
  /** Called once content is ready. */
  onLoadComplete?: () => void;
}

const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    'p',
    'br',
    'b',
    'i',
    'em',
    'strong',
    'u',
    's',
    'strike',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'ul',
    'ol',
    'li',
    'blockquote',
    'pre',
    'code',
    'a',
    'img',
    'figure',
    'figcaption',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    'div',
    'span',
    'section',
    'article',
    'header',
    'footer',
    'nav',
    'hr',
    'sub',
    'sup',
  ],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id'],
};

export const ScrollEngine = forwardRef<ReaderEngineRef, ScrollEngineProps>((props, ref) => {
  const { content, contentType, ionContentRef, onRelocate, onLoadComplete } = props;

  const innerRef = useRef<HTMLDivElement>(null);

  const [renderedHtml, setRenderedHtml] = useState<string | null>(null);
  const [plainText, setPlainText] = useState('');
  const [loading, setLoading] = useState(true);

  const progressRef = useRef(0);

  // Stable callback refs
  const onRelocateRef = useRef(onRelocate);
  const onLoadCompleteRef = useRef(onLoadComplete);
  onRelocateRef.current = onRelocate;
  onLoadCompleteRef.current = onLoadComplete;

  // Process content based on type
  useEffect(() => {
    if (!content) return;

    const process = async () => {
      let html: string | null = null;
      let text = '';

      if (contentType === 'text') {
        // Plain text — no HTML processing, just use text directly
        text = content;
        html = null; // Signal to render as plain text
      } else if (contentType === 'html') {
        html = DOMPurify.sanitize(content, SANITIZE_CONFIG);
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        text = tmp.textContent || tmp.innerText || '';
      } else if (contentType === 'markdown') {
        const rawHtml = await marked(content, { async: true });
        html = DOMPurify.sanitize(rawHtml, SANITIZE_CONFIG);
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        text = tmp.textContent || tmp.innerText || '';
      }

      setRenderedHtml(html);
      setPlainText(contentType === 'text' ? content : text);
      setLoading(false);
      onLoadCompleteRef.current?.();
    };

    process();
  }, [content, contentType]);

  // Handle scroll events from IonContent
  const handleScroll = useCallback((e: CustomEvent) => {
    const scrollEl = e.target as HTMLElement;
    const scrollTop = scrollEl.scrollTop;
    const scrollHeight = scrollEl.scrollHeight - scrollEl.clientHeight;
    if (scrollHeight > 0) {
      const pct = Math.round((scrollTop / scrollHeight) * 100);
      progressRef.current = pct;
      onRelocateRef.current?.({
        current: pct,
        total: 100,
        fraction: pct / 100,
        label: `${pct}%`,
        locationString: String(pct),
      });
    }
  }, []);

  // Attach scroll listener to IonContent
  useEffect(() => {
    const ionContent = ionContentRef?.current;
    if (!ionContent) return;

    ionContent.scrollEvents = true;
    const handler = (e: Event) => handleScroll(e as CustomEvent);
    ionContent.addEventListener('ionScroll', handler);
    return () => ionContent.removeEventListener('ionScroll', handler);
  }, [ionContentRef, handleScroll, loading]);

  const scrollByViewport = useCallback(
    (direction: 1 | -1) => {
      const ionContent = ionContentRef?.current;
      if (!ionContent) return;

      ionContent.getScrollElement().then((scrollEl) => {
        const viewportH = scrollEl.clientHeight;
        const newTop = scrollEl.scrollTop + direction * viewportH * 0.9;
        ionContent.scrollToPoint(0, Math.max(0, newTop), 200);
      });
    },
    [ionContentRef]
  );

  const scrollToCharIndex = useCallback(
    (charIndex: number) => {
      const ionContent = ionContentRef?.current;
      if (!ionContent || !innerRef.current) return;

      const totalChars = plainText.length;
      if (totalChars === 0) return;
      const ratio = charIndex / totalChars;
      ionContent.scrollToPoint(0, ratio * (innerRef.current.scrollHeight || 0), 300);
    },
    [ionContentRef, plainText]
  );

  useImperativeHandle(
    ref,
    () => ({
      next: () => scrollByViewport(1),
      prev: () => scrollByViewport(-1),
      goToLocation: (location: string) => {
        const pct = parseInt(location, 10);
        if (isNaN(pct)) return;
        const ionContent = ionContentRef?.current;
        if (!ionContent || !innerRef.current) return;
        const target = (pct / 100) * (innerRef.current.scrollHeight || 0);
        ionContent.scrollToPoint(0, target, 300);
      },
      goToChapter: () => {
        /* scroll content has no chapters */
      },
      getChapters: (): Chapter[] => [],
      getProgress: (): ReaderProgress => ({
        current: progressRef.current,
        total: 100,
        fraction: progressRef.current / 100,
        label: `${progressRef.current}%`,
        locationString: String(progressRef.current),
      }),
      search: async (query: string): Promise<SearchResult[]> => {
        if (!query.trim()) return [];
        const text = plainText.toLowerCase();
        const lowerQuery = query.toLowerCase();
        const results: SearchResult[] = [];
        let idx = 0;

        while ((idx = text.indexOf(lowerQuery, idx)) !== -1) {
          const start = Math.max(0, idx - 40);
          const end = Math.min(plainText.length, idx + query.length + 40);
          results.push({
            location: String(idx),
            excerpt:
              (start > 0 ? '...' : '') +
              plainText.slice(start, end) +
              (end < plainText.length ? '...' : ''),
            label: `Position ${idx}`,
          });
          idx += query.length;
        }

        return results;
      },
    }),
    [scrollByViewport, scrollToCharIndex, ionContentRef, plainText]
  );

  if (loading) {
    return null; // Parent shows loading spinner
  }

  return (
    <ReaderContainer>
      <div ref={innerRef} style={{ wordBreak: 'break-word' }}>
        {renderedHtml === null ? (
          // Plain text
          <div style={{ whiteSpace: 'pre-wrap' }}>{content}</div>
        ) : (
          // Sanitized HTML (from html or markdown)
          <div
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
            className={contentType === 'markdown' ? 'markdown-content' : undefined}
          />
        )}
      </div>
    </ReaderContainer>
  );
});

ScrollEngine.displayName = 'ScrollEngine';

export default ScrollEngine;
