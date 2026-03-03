/**
 * ReadingRuler Component
 * A horizontal highlight line that follows the reading position.
 *
 * Features:
 * - Adjustable height (1-4 lines)
 * - Adjustable opacity and color
 * - Position updates with scroll/tap
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useThemeStore } from '../../stores/useThemeStore';
import type { RulerColor } from '../../services/themeService';
import './ReadingRuler.css';

export interface ReadingRulerProps {
  /** Container element to track */
  containerRef?: React.RefObject<HTMLElement | null>;
  /** IonContent ref for scroll tracking */
  ionContentRef?: React.RefObject<HTMLIonContentElement | null>;
  /** Override enabled state from store */
  enabled?: boolean;
}

// Color values for different ruler colors
const RULER_COLORS: Record<RulerColor, string> = {
  accent: 'var(--reader-accent)',
  yellow: 'rgba(255, 220, 0, 0.6)',
  green: 'rgba(76, 175, 80, 0.6)',
  blue: 'rgba(33, 150, 243, 0.6)',
  pink: 'rgba(233, 30, 99, 0.6)',
  red: 'rgba(244, 67, 54, 0.6)',
};

/**
 * ReadingRuler Component
 */
export const ReadingRuler: React.FC<ReadingRulerProps> = ({
  containerRef,
  ionContentRef,
  enabled: propsEnabled,
}) => {
  const { readingRuler: storeEnabled, readingRulerSettings } = useThemeStore();

  const enabled = propsEnabled ?? (storeEnabled || readingRulerSettings.enabled);

  const [position, setPosition] = useState(0);
  const [visible, setVisible] = useState(false);

  const rulerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const internalContainerRef = useRef<HTMLElement | null>(null);

  // Clear any existing timeout
  const clearHideTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Hide the ruler after a delay
  const scheduleHide = useCallback(() => {
    clearHideTimeout();
    timeoutRef.current = setTimeout(() => {
      setVisible(false);
    }, 2000);
  }, [clearHideTimeout]);

  // Update container rect
  const updateContainerRect = useCallback(() => {
    const container =
      containerRef?.current || ionContentRef?.current || internalContainerRef.current;
    if (container) {
      internalContainerRef.current = container;
    }
  }, [containerRef, ionContentRef]);

  // Handle mouse/touch move to update ruler position
  const handleMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!enabled) return;

      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      // Get the container's top position relative to viewport
      const container =
        containerRef?.current || ionContentRef?.current || internalContainerRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const relativeY = clientY - containerRect.top;

      setPosition(relativeY);
      setVisible(true);
      scheduleHide();
    },
    [enabled, containerRef, ionContentRef, scheduleHide]
  );

  // Handle click/tap to position ruler
  const handleClick = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!enabled) return;

      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const container =
        containerRef?.current || ionContentRef?.current || internalContainerRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const relativeY = clientY - containerRect.top;

      setPosition(relativeY);
      setVisible(true);
      scheduleHide();
    },
    [enabled, containerRef, ionContentRef, scheduleHide]
  );

  // Update position on scroll
  const handleScroll = useCallback(() => {
    // Keep ruler at current relative position
    clearHideTimeout();
    if (enabled) {
      setVisible(true);
      scheduleHide();
    }
  }, [enabled, clearHideTimeout, scheduleHide]);

  // Set up event listeners
  useEffect(() => {
    if (!enabled) return;

    updateContainerRect();

    const container =
      containerRef?.current || ionContentRef?.current || internalContainerRef.current;
    if (!container) return;

    // Add event listeners
    container.addEventListener('mousemove', handleMove);
    container.addEventListener('touchmove', handleMove);
    container.addEventListener('click', handleClick);

    // Add scroll listener
    const scrollElement = container.closest('[data-scroll-y="true"]') || container;
    scrollElement?.addEventListener('scroll', handleScroll);

    // Handle window resize
    window.addEventListener('resize', updateContainerRect);

    return () => {
      container.removeEventListener('mousemove', handleMove);
      container.removeEventListener('touchmove', handleMove);
      container.removeEventListener('click', handleClick);
      scrollElement?.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateContainerRect);
      clearHideTimeout();
    };
  }, [
    enabled,
    containerRef,
    ionContentRef,
    handleMove,
    handleClick,
    handleScroll,
    updateContainerRect,
    clearHideTimeout,
  ]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      clearHideTimeout();
    };
  }, [clearHideTimeout]);

  if (!enabled) return null;

  const height = readingRulerSettings.height;
  const opacity = readingRulerSettings.opacity / 100;
  const color = RULER_COLORS[readingRulerSettings.color] || RULER_COLORS.accent;

  // Calculate the ruler height based on font size and line height
  const rulerHeight = `${height * 1.6}em`; // Assuming 1.6 line height
  const rulerTop = `calc(${position}px - ${rulerHeight} / 2)`;

  return (
    <div
      ref={rulerRef}
      className="reading-ruler-line"
      style={{
        top: rulerTop,
        height: rulerHeight,
        opacity: visible ? opacity : 0,
        backgroundColor: color,
        boxShadow: `0 0 8px ${color}, 0 0 16px ${color}`,
      }}
    />
  );
};

export default ReadingRuler;
