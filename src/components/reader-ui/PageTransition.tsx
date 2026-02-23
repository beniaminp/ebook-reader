/**
 * PageTransition Component
 *
 * Wraps reader content and triggers a CSS transition animation whenever the
 * `pageKey` prop changes (e.g., page number or CFI string).
 *
 * Supported animation types:
 *  - 'none'  – no animation
 *  - 'fade'  – cross-fade between pages
 *  - 'slide' – slide left/right depending on direction
 */

import React, { useEffect, useRef, useState } from 'react';
import './PageTransition.css';

export type { PageTransitionType } from '../../stores/useThemeStore';
import type { PageTransitionType } from '../../stores/useThemeStore';
export type PageDirection = 'forward' | 'backward';

export interface PageTransitionProps {
  children: React.ReactNode;
  /** Changes whenever the page changes – drives the animation */
  pageKey: string | number;
  /** Animation style */
  animationType?: PageTransitionType;
  /** Direction of the page turn */
  direction?: PageDirection;
  /** Duration in ms (default 250) */
  duration?: number;
  className?: string;
}

export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  pageKey,
  animationType = 'none',
  direction = 'forward',
  duration = 250,
  className = '',
}) => {
  const [animating, setAnimating] = useState(false);
  const [animClass, setAnimClass] = useState('');
  const prevKeyRef = useRef<string | number>(pageKey);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (pageKey === prevKeyRef.current) return;
    prevKeyRef.current = pageKey;

    if (animationType === 'none') return;

    // Clear any in-progress animation
    if (timerRef.current) clearTimeout(timerRef.current);

    const cls = buildAnimClass(animationType, direction);
    setAnimClass(cls);
    setAnimating(true);

    timerRef.current = setTimeout(() => {
      setAnimating(false);
      setAnimClass('');
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [pageKey, animationType, direction, duration]);

  const cssVars = {
    '--page-transition-duration': `${duration}ms`,
  } as React.CSSProperties;

  const classes = [
    'page-transition',
    animating ? animClass : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} style={cssVars}>
      {children}
    </div>
  );
};

function buildAnimClass(type: PageTransitionType, direction: PageDirection): string {
  if (type === 'fade') return 'page-transition--fade';
  if (type === 'slide') {
    return direction === 'forward'
      ? 'page-transition--slide-left'
      : 'page-transition--slide-right';
  }
  return '';
}

export default PageTransition;
