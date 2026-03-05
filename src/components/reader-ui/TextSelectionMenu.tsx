/**
 * TextSelectionMenu - Bottom action bar that appears on text selection
 * Shows as a fixed bottom bar on mobile to avoid being covered by
 * Android's native selection toolbar which renders above the WebView.
 *
 * Supports live selection updates: the menu shows the growing selection
 * as the user drags without lifting their finger.
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
  /**
   * Externally captured selection text. When set, this overrides the internal
   * iframe-polling logic (used on Android to hide Chrome's native selection UI).
   * Pass empty string or undefined to hide the menu.
   */
  capturedText?: string;
  /** Called when the menu is dismissed (e.g. user performs an action). */
  onDismiss?: () => void;
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
  capturedText,
  onDismiss,
}) => {
  const [visible, setVisible] = useState(false);
  const [selectedText, setSelectedText] = useState<string>('');
  const attachedDocsRef = useRef<Set<Document>>(new Set());
  const observerRef = useRef<MutationObserver | null>(null);
  // Track whether the user is actively dragging (finger down)
  const isDraggingRef = useRef(false);
  // Debounce timer for showing the menu (don't show while actively dragging)
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openTranslationPanel = useTranslationStore((state) => state.openTranslationPanel);

  // When capturedText is provided externally, use it directly
  useEffect(() => {
    if (capturedText !== undefined) {
      if (capturedText) {
        setSelectedText(capturedText);
        setVisible(true);
      } else {
        setVisible(false);
        setSelectedText('');
      }
    }
  }, [capturedText]);

  // Check for text selection in both main document and iframes.
  // Updates selectedText live as the user drags, but delays showing the
  // action bar until the finger is lifted to avoid blocking the drag.
  const checkSelection = useCallback(() => {
    // If external capturedText is controlling us, skip polling
    if (capturedText !== undefined) return;

    // Check main document
    const mainSel = window.getSelection();
    let text = mainSel?.toString().trim() || '';

    // If no main selection, check iframes
    if (!text) {
      text = getIframeSelectionText();
    }

    if (text && text.length > 0) {
      setSelectedText(text);

      // If the user is still dragging, update the preview text but
      // don't show the action buttons yet — show after finger lifts
      if (isDraggingRef.current) {
        // Show just the preview so the user sees their selection growing
        setVisible(true);
      } else {
        // Finger is up — show the full menu
        if (showTimerRef.current) clearTimeout(showTimerRef.current);
        showTimerRef.current = setTimeout(() => setVisible(true), 50);
      }
    } else {
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
      setVisible(false);
      setSelectedText('');
    }
  }, [capturedText]);

  // Track touch/mouse state to know when the user is actively dragging
  const handlePointerDown = useCallback(() => {
    isDraggingRef.current = true;
  }, []);

  const handlePointerUp = useCallback(() => {
    isDraggingRef.current = false;
    // Re-check selection after finger lift
    // Small delay to let the browser finalize the selection
    setTimeout(checkSelection, 50);
  }, [checkSelection]);

  // Attach selection listeners to an iframe document
  const attachToDoc = useCallback(
    (doc: Document) => {
      if (attachedDocsRef.current.has(doc)) return;
      attachedDocsRef.current.add(doc);
      doc.addEventListener('selectionchange', checkSelection);
      doc.addEventListener('mousedown', handlePointerDown);
      doc.addEventListener('mouseup', handlePointerUp);
      doc.addEventListener('touchstart', handlePointerDown, { passive: true });
      doc.addEventListener('touchend', handlePointerUp);
    },
    [checkSelection, handlePointerDown, handlePointerUp]
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
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('mouseup', handlePointerUp);
    document.addEventListener('touchstart', handlePointerDown, { passive: true });
    document.addEventListener('touchend', handlePointerUp);

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
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('mouseup', handlePointerUp);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('touchend', handlePointerUp);

      for (const doc of attachedDocsRef.current) {
        try {
          doc.removeEventListener('selectionchange', checkSelection);
          doc.removeEventListener('mousedown', handlePointerDown);
          doc.removeEventListener('mouseup', handlePointerUp);
          doc.removeEventListener('touchstart', handlePointerDown);
          doc.removeEventListener('touchend', handlePointerUp);
        } catch {
          // detached doc
        }
      }
      attachedDocsRef.current.clear();

      observerRef.current?.disconnect();
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [checkSelection, scanAndAttach, handlePointerDown, handlePointerUp]);

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
    onDismiss?.();
  }, [selectedText, onTranslate, openTranslationPanel, clearSelection, onDismiss]);

  const handleDefine = useCallback(() => {
    onDefine?.(selectedText);
    setVisible(false);
    clearSelection();
    onDismiss?.();
  }, [selectedText, onDefine, clearSelection, onDismiss]);

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
    onDismiss?.();
  }, [selectedText, onCopy, clearSelection, onDismiss]);

  const handleAddNote = useCallback(() => {
    onAddNote?.(selectedText);
    setVisible(false);
    clearSelection();
    onDismiss?.();
  }, [selectedText, onAddNote, clearSelection, onDismiss]);

  if (!visible || !selectedText) {
    return null;
  }

  const isDragging = isDraggingRef.current;

  return createPortal(
    <div className={`text-selection-menu ${isDragging ? 'text-selection-menu--dragging' : ''}`}>
      <div className="text-selection-menu-preview">
        &ldquo;{selectedText.length > 80 ? selectedText.slice(0, 80) + '...' : selectedText}&rdquo;
      </div>
      {!isDragging && (
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
      )}
    </div>,
    document.body
  );
};

export default TextSelectionMenu;
