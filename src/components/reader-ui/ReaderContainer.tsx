/**
 * Reader Container
 * Applies theme settings to reader content and provides reading tools
 */

import React, { useEffect, useRef, useState } from 'react';
import { useThemeStore } from '../../stores/useThemeStore';
import { themeService } from '../../services/themeService';
import { useTapZones } from '../../hooks/useTapZones';
import type { TapZoneConfig } from '../../hooks/useTapZones';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';
import './ReaderContainer.css';

export interface ReaderContainerProps {
  children: React.ReactNode;
  className?: string;
  onContentRef?: (ref: HTMLDivElement | null) => void;
  /** Called when the user taps/swipes to the previous page */
  onPrevPage?: () => void;
  /** Called when the user taps/swipes to the next page */
  onNextPage?: () => void;
  /** Called when the user taps the center zone */
  onToggleToolbar?: () => void;
  /** Override tap zone boundaries/actions */
  tapZoneConfig?: TapZoneConfig;
  /** Disable tap zones entirely */
  tapZonesEnabled?: boolean;
  /** Disable swipe gestures entirely */
  swipeEnabled?: boolean;
}

/**
 * Reading Ruler Component
 * Shows a highlighted line following reading position
 */
const ReadingRuler: React.FC<{ visible: boolean }> = ({ visible }) => {
  const [position, setPosition] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible || !containerRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const y = e.clientY - rect.top;
      setPosition(y);
    };

    const container = containerRef.current;
    container.addEventListener('mousemove', handleMouseMove);
    return () => container.removeEventListener('mousemove', handleMouseMove);
  }, [visible]);

  if (!visible) return null;

  return (
    <div ref={containerRef} className="reading-ruler-container">
      <div className="reading-ruler-line" style={{ top: `${position}px` }} />
    </div>
  );
};

/**
 * Blue Light Filter Component
 */
const BlueLightFilter: React.FC<{ visible: boolean; intensity: number }> = ({ visible, intensity }) => {
  if (!visible) return null;

  return (
    <div
      className="blue-light-filter-overlay"
      style={{
        backgroundColor: `rgba(255, 120, 0, ${intensity / 100})`,
      }}
    />
  );
};

/**
 * Main Reader Container Component
 */
export const ReaderContainer: React.FC<ReaderContainerProps> = ({
  children,
  className = '',
  onContentRef,
  onPrevPage,
  onNextPage,
  onToggleToolbar,
  tapZoneConfig,
  tapZonesEnabled = true,
  swipeEnabled = true,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const {
    theme,
    fontFamily,
    fontSize,
    lineHeight,
    textAlign,
    marginSize,
    blueLightFilter,
    blueLightIntensity,
    readingRuler,
    bionicReading,
  } = useThemeStore();

  // Swipe gesture handlers
  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: onNextPage,
    onSwipeRight: onPrevPage,
    enabled: swipeEnabled && (!!onNextPage || !!onPrevPage),
  });

  // Tap zone handlers
  const tapHandlers = useTapZones({
    onPrev: onPrevPage,
    onNext: onNextPage,
    onToggleToolbar,
    config: tapZoneConfig,
    enabled: tapZonesEnabled && (!!onPrevPage || !!onNextPage || !!onToggleToolbar),
  });

  // Merge touch handlers: swipe gesture takes precedence for move/end detection,
  // tap zones fire only for short stationary taps.
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    swipeHandlers.onTouchStart(e);
    tapHandlers.onTouchStart(e);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    swipeHandlers.onTouchMove(e);
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    swipeHandlers.onTouchEnd(e);
    tapHandlers.onTouchEnd(e);
  };

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;

    // Apply theme data attribute
    root.setAttribute('data-theme', theme);

    // Apply font family
    root.setAttribute('data-font', fontFamily);

    // Apply text alignment
    root.setAttribute('data-align', textAlign);

    // Apply margin size
    root.setAttribute('data-margin', marginSize);

    // Apply CSS custom properties for dynamic values
    root.style.setProperty('--reader-font-size', `${fontSize}px`);
    root.style.setProperty('--reader-line-height', lineHeight.toString());
  }, [theme, fontFamily, fontSize, lineHeight, textAlign, marginSize]);

  // Apply bionic reading to text content
  useEffect(() => {
    if (!contentRef.current || !bionicReading) return;

    const applyBionicReading = () => {
      const container = contentRef.current;
      if (!container) return;

      // Find all text nodes and wrap them
      const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            // Skip empty nodes and nodes inside script/style
            if (!node.textContent?.trim()) return NodeFilter.FILTER_REJECT;
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            const tagName = parent.tagName.toLowerCase();
            if (['script', 'style', 'code', 'pre'].includes(tagName)) {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
          },
        }
      );

      const textNodes: Text[] = [];
      let node: Node | null;
      while ((node = walker.nextNode())) {
        textNodes.push(node as Text);
      }

      // Process each text node
      textNodes.forEach((textNode) => {
        const text = textNode.textContent || '';
        const words = text.split(/(\s+)/);

        if (words.length > 1) {
          const fragment = document.createDocumentFragment();

          words.forEach((word) => {
            if (word.trim().length === 0) {
              fragment.appendChild(document.createTextNode(word));
              return;
            }

            const boldLength = Math.ceil(word.length / 2);
            const span = document.createElement('span');
            span.className = 'word';

            const boldPart = document.createElement('span');
            boldPart.className = 'word-bold';
            boldPart.textContent = word.substring(0, boldLength);

            const regularPart = document.createElement('span');
            regularPart.className = 'word-regular';
            regularPart.textContent = word.substring(boldLength);

            span.appendChild(boldPart);
            span.appendChild(regularPart);
            fragment.appendChild(span);
          });

          textNode.parentNode?.replaceChild(fragment, textNode);
        }
      });
    };

    // Small delay to ensure content is rendered
    const timeoutId = setTimeout(applyBionicReading, 100);
    return () => clearTimeout(timeoutId);
  }, [bionicReading, children]);

  // Notify parent of content ref
  useEffect(() => {
    if (onContentRef) {
      onContentRef(contentRef.current);
    }
  }, [onContentRef]);

  const containerClasses = [
    'reader-container',
    `theme-${theme}`,
    `font-${fontFamily}`,
    `align-${textAlign}`,
    `margin-${marginSize}`,
    bionicReading ? 'bionic-reading' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className="reader-wrapper"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <BlueLightFilter visible={blueLightFilter} intensity={blueLightIntensity} />
      <ReadingRuler visible={readingRuler} />
      <div
        ref={contentRef}
        className={containerClasses}
        style={{
          fontSize: `${fontSize}px`,
          lineHeight: lineHeight.toString(),
          textAlign,
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default ReaderContainer;
