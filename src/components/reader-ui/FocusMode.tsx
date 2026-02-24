/**
 * FocusMode Component
 * Dims text above and below the current reading paragraph.
 *
 * Features:
 * - Only current paragraph fully visible
 * - Configurable dimming opacity
 * - Smooth transitions between paragraphs
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { useThemeStore } from '../../stores/useThemeStore';
import './FocusMode.css';

export interface FocusModeProps {
  /** Container element to track */
  containerRef?: React.RefObject<HTMLElement | null>;
  /** IonContent ref for scroll tracking */
  ionContentRef?: React.RefObject<HTMLIonContentElement | null>;
  /** Override enabled state from store */
  enabled?: boolean;
}

/**
 * Get all text blocks (paragraphs, headings, etc.) in order
 */
function getTextBlocks(container: HTMLElement): HTMLElement[] {
  const blocks: HTMLElement[] = [];
  const blockSelectors = [
    'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'li', 'blockquote', 'pre', 'div.content',
  ];

  blockSelectors.forEach((selector) => {
    const elements = container.querySelectorAll(selector);
    elements.forEach((el) => {
      // Only include elements that are actually visible and have content
      if (el.textContent?.trim() && isElementVisible(el)) {
        blocks.push(el as HTMLElement);
      }
    });
  });

  // Sort by position in document
  blocks.sort((a, b) => {
    const aRect = a.getBoundingClientRect();
    const bRect = b.getBoundingClientRect();
    return aRect.top - bRect.top;
  });

  return blocks;
}

/**
 * Check if an element is visible in the viewport
 */
function isElementVisible(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  const style = window.getComputedStyle(el);
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0'
  );
}

/**
 * Find the block element that is currently centered in viewport
 */
function findCenterBlock(container: HTMLElement): HTMLElement | null {
  const containerRect = container.getBoundingClientRect();
  const centerY = containerRect.top + containerRect.height / 2;

  const blocks = getTextBlocks(container);
  let closestBlock: HTMLElement | null = null;
  let closestDistance = Infinity;

  blocks.forEach((block) => {
    const rect = block.getBoundingClientRect();
    const blockCenter = rect.top + rect.height / 2;
    const distance = Math.abs(centerY - blockCenter);

    if (distance < closestDistance && distance < rect.height / 2 + 50) {
      closestDistance = distance;
      closestBlock = block;
    }
  });

  return closestBlock;
}

/**
 * FocusMode Component
 */
export const FocusMode: React.FC<FocusModeProps> = ({
  containerRef,
  ionContentRef,
  enabled: propsEnabled,
}) => {
  const {
    focusMode: storeEnabled,
    focusModeSettings,
  } = useThemeStore();

  const enabled = propsEnabled ?? (storeEnabled && focusModeSettings.enabled);

  const updateScheduledRef = useRef(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Calculate which blocks should be dimmed
  const updateFocus = useCallback(() => {
    if (!enabled || updateScheduledRef.current) return;

    updateScheduledRef.current = true;

    requestAnimationFrame(() => {
      const container = containerRef?.current || ionContentRef?.current;
      if (!container) return;

      const centerBlock = findCenterBlock(container);

      // Apply dimming classes
      const blocks = getTextBlocks(container);
      const dimOpacity = focusModeSettings.opacity / 100;

      blocks.forEach((block) => {
        if (centerBlock && block.contains(centerBlock)) {
          // This block contains the focused element - don't dim
          block.classList.remove('focus-dimmed');
          block.classList.add('focus-active');
        } else if (centerBlock === block) {
          // This is the focused block
          block.classList.remove('focus-dimmed');
          block.classList.add('focus-active');
        } else {
          // Dim other blocks
          block.classList.add('focus-dimmed');
          block.classList.remove('focus-active');
          block.style.setProperty('--focus-dim-opacity', dimOpacity.toString());
        }
      });

      updateScheduledRef.current = false;
    });
  }, [enabled, containerRef, ionContentRef, focusModeSettings.opacity]);

  // Clean up focus classes when disabled
  const cleanupFocus = useCallback(() => {
    const container = containerRef?.current || ionContentRef?.current;
    if (!container) return;

    const blocks = getTextBlocks(container);
    blocks.forEach((block) => {
      block.classList.remove('focus-dimmed', 'focus-active');
      block.style.removeProperty('--focus-dim-opacity');
    });
  }, [containerRef, ionContentRef]);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    if (enabled) {
      updateFocus();
    }
  }, [enabled, updateFocus]);

  // Set up event listeners
  useEffect(() => {
    if (!enabled) {
      cleanupFocus();
      return;
    }

    const container = containerRef?.current || ionContentRef?.current;
    if (!container) return;

    // Initial update
    updateFocus();

    // Add scroll listener
    const scrollElement = container.closest('[data-scroll-y="true"]') || container;
    scrollElement?.addEventListener('scroll', handleScroll, { passive: true });

    // Update on window resize
    window.addEventListener('resize', updateFocus);

    return () => {
      scrollElement?.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateFocus);
      cleanupFocus();
    };
  }, [enabled, containerRef, ionContentRef, updateFocus, handleScroll, cleanupFocus]);

  if (!enabled) return null;

  return (
    <div ref={overlayRef} className="focus-mode-overlay" aria-hidden="true" />
  );
};

export default FocusMode;
