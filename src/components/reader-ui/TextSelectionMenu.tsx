/**
 * TextSelectionMenu - Bottom action bar that appears on text selection
 * Shows as a fixed bottom bar on mobile to avoid being covered by
 * Android's native selection toolbar which renders above the WebView.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { IonButton, IonIcon } from '@ionic/react';
import { language, bookmark, glasses, copy, create } from 'ionicons/icons';
import { useTranslationStore } from '../../stores/useTranslationStore';
import './TextSelectionMenu.css';

interface TextSelectionMenuProps {
  onTranslate?: (text: string, rect?: DOMRect) => void;
  onDefine?: (text: string, rect?: DOMRect) => void;
  onHighlight?: (text: string, color?: string) => void;
  onCopy?: (text: string) => void;
  onAddNote?: (text: string, rect?: DOMRect) => void;
  enabledActions?: Array<'translate' | 'define' | 'highlight' | 'copy' | 'note'>;
}

/**
 * Recursively find all iframes from a root, including inside shadow roots.
 */
function findAllIframes(root: Element | ShadowRoot): HTMLIFrameElement[] {
  const iframes: HTMLIFrameElement[] = [];
  const elements = root.querySelectorAll('iframe');
  elements.forEach((el) => iframes.push(el as HTMLIFrameElement));

  // Check shadow roots
  root.querySelectorAll('*').forEach((el) => {
    if (el.shadowRoot) {
      iframes.push(...findAllIframes(el.shadowRoot));
    }
  });

  return iframes;
}

/**
 * Get selected text from all iframes inside foliate-view.
 */
function getIframeSelectionText(): string {
  try {
    const foliateView = document.querySelector('foliate-view');
    if (!foliateView) return '';

    // Search in shadow root first
    const searchRoots: (Element | ShadowRoot)[] = [];
    if (foliateView.shadowRoot) searchRoots.push(foliateView.shadowRoot);
    searchRoots.push(foliateView);

    for (const root of searchRoots) {
      const iframes = findAllIframes(root);
      for (const iframe of iframes) {
        try {
          const sel = iframe.contentWindow?.getSelection();
          if (sel && !sel.isCollapsed) {
            const text = sel.toString().trim();
            if (text) return text;
          }
        } catch {
          // cross-origin iframe
        }
      }
    }
  } catch {
    // ignore
  }
  return '';
}

export const TextSelectionMenu: React.FC<TextSelectionMenuProps> = ({
  onTranslate,
  onDefine,
  onHighlight,
  onCopy,
  onAddNote,
  enabledActions = ['translate', 'highlight', 'copy'],
}) => {
  const [visible, setVisible] = useState(false);
  const [selectedText, setSelectedText] = useState<string>('');
  const attachedDocsRef = useRef<Set<Document>>(new Set());
  const observerRef = useRef<MutationObserver | null>(null);

  const openTranslationPanel = useTranslationStore((state) => state.openTranslationPanel);

  // Check for text selection in both main document and iframes
  const checkSelection = useCallback(() => {
    // Check main document
    const mainSel = window.getSelection();
    let text = mainSel?.toString().trim() || '';

    // If no main selection, check iframes
    if (!text) {
      text = getIframeSelectionText();
    }

    if (text && text.length > 0) {
      setSelectedText(text);
      setVisible(true);
    } else {
      setVisible(false);
      setSelectedText('');
    }
  }, []);

  // Attach selection listeners to an iframe document
  const attachToDoc = useCallback(
    (doc: Document) => {
      if (attachedDocsRef.current.has(doc)) return;
      attachedDocsRef.current.add(doc);
      doc.addEventListener('selectionchange', checkSelection);
      doc.addEventListener('mouseup', checkSelection);
      doc.addEventListener('touchend', checkSelection);
    },
    [checkSelection]
  );

  // Scan for all iframes and attach listeners
  const scanAndAttach = useCallback(() => {
    const foliateView = document.querySelector('foliate-view');
    if (!foliateView) return;

    const searchRoots: (Element | ShadowRoot)[] = [];
    if (foliateView.shadowRoot) searchRoots.push(foliateView.shadowRoot);
    searchRoots.push(foliateView);

    for (const root of searchRoots) {
      const iframes = findAllIframes(root);
      for (const iframe of iframes) {
        try {
          const doc = iframe.contentDocument;
          if (doc) attachToDoc(doc);
        } catch {
          // cross-origin
        }
      }
    }
  }, [attachToDoc]);

  useEffect(() => {
    // Listen on main document
    document.addEventListener('selectionchange', checkSelection);
    document.addEventListener('mouseup', checkSelection);
    document.addEventListener('touchend', checkSelection);

    // Scan for iframes immediately and after delays
    scanAndAttach();
    const t1 = setTimeout(scanAndAttach, 1000);
    const t2 = setTimeout(scanAndAttach, 3000);

    // Watch for DOM changes (page turns create new iframes)
    const setupObserver = () => {
      const foliateView = document.querySelector('foliate-view');
      const observeTarget = foliateView?.shadowRoot || foliateView;
      if (!observeTarget) return;

      observerRef.current?.disconnect();
      observerRef.current = new MutationObserver(() => {
        setTimeout(scanAndAttach, 100);
      });
      observerRef.current.observe(observeTarget, {
        childList: true,
        subtree: true,
      });
    };
    setupObserver();
    const t3 = setTimeout(setupObserver, 2000);

    return () => {
      document.removeEventListener('selectionchange', checkSelection);
      document.removeEventListener('mouseup', checkSelection);
      document.removeEventListener('touchend', checkSelection);

      for (const doc of attachedDocsRef.current) {
        try {
          doc.removeEventListener('selectionchange', checkSelection);
          doc.removeEventListener('mouseup', checkSelection);
          doc.removeEventListener('touchend', checkSelection);
        } catch {
          // detached doc
        }
      }
      attachedDocsRef.current.clear();

      observerRef.current?.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [checkSelection, scanAndAttach]);

  const clearSelection = useCallback(() => {
    window.getSelection()?.removeAllRanges();
    try {
      const foliateView = document.querySelector('foliate-view');
      if (!foliateView) return;
      const searchRoots: (Element | ShadowRoot)[] = [];
      if (foliateView.shadowRoot) searchRoots.push(foliateView.shadowRoot);
      searchRoots.push(foliateView);
      for (const root of searchRoots) {
        const iframes = findAllIframes(root);
        for (const iframe of iframes) {
          try { iframe.contentWindow?.getSelection()?.removeAllRanges(); } catch { /* */ }
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const handleTranslate = useCallback(() => {
    openTranslationPanel(selectedText);
    onTranslate?.(selectedText);
    setVisible(false);
    clearSelection();
  }, [selectedText, onTranslate, openTranslationPanel, clearSelection]);

  const handleDefine = useCallback(() => {
    onDefine?.(selectedText);
    setVisible(false);
    clearSelection();
  }, [selectedText, onDefine, clearSelection]);

  const handleHighlight = useCallback(() => {
    onHighlight?.(selectedText);
    setVisible(false);
    // Don't clear selection yet — the color picker needs it
  }, [selectedText, onHighlight]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(selectedText);
      onCopy?.(selectedText);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
    setVisible(false);
    clearSelection();
  }, [selectedText, onCopy, clearSelection]);

  const handleAddNote = useCallback(() => {
    onAddNote?.(selectedText);
    setVisible(false);
    clearSelection();
  }, [selectedText, onAddNote, clearSelection]);

  if (!visible || !selectedText) {
    return null;
  }

  return createPortal(
    <div className="text-selection-menu">
      <div className="text-selection-menu-preview">
        &ldquo;{selectedText.length > 60 ? selectedText.slice(0, 60) + '...' : selectedText}&rdquo;
      </div>
      <div className="text-selection-menu-actions">
        {enabledActions.includes('highlight') && (
          <IonButton onClick={handleHighlight} color="warning" size="small" fill="solid">
            <IonIcon icon={bookmark} slot="start" />
            Highlight
          </IonButton>
        )}
        {enabledActions.includes('copy') && (
          <IonButton onClick={handleCopy} color="medium" size="small" fill="solid">
            <IonIcon icon={copy} slot="start" />
            Copy
          </IonButton>
        )}
        {enabledActions.includes('translate') && (
          <IonButton onClick={handleTranslate} color="primary" size="small" fill="solid">
            <IonIcon icon={language} slot="start" />
            Translate
          </IonButton>
        )}
        {enabledActions.includes('define') && (
          <IonButton onClick={handleDefine} color="success" size="small" fill="solid">
            <IonIcon icon={glasses} slot="start" />
            Define
          </IonButton>
        )}
        {enabledActions.includes('note') && (
          <IonButton onClick={handleAddNote} color="tertiary" size="small" fill="solid">
            <IonIcon icon={create} slot="start" />
            Note
          </IonButton>
        )}
      </div>
    </div>,
    document.body
  );
};

export default TextSelectionMenu;
