/**
 * Auto Scroll Manager
 *
 * Handles auto-scroll functionality for reading.
 * React Native version: uses setInterval + ScrollView ref instead of
 * requestAnimationFrame and raw DOM scrollBy.
 */

import type { ScrollView } from 'react-native';

export class AutoScrollManager {
  private scrollViewRef: ScrollView | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isScrolling = false;
  private speed = 1; // pixels per tick
  private currentOffset = 0;
  private contentHeight = 0;
  private viewHeight = 0;

  /** Tick interval in ms (~60fps equivalent). */
  private static readonly TICK_MS = 16;

  /**
   * Start auto-scrolling a ScrollView.
   */
  start(scrollView: ScrollView, speed: number = 1): void {
    this.stop();
    this.scrollViewRef = scrollView;
    this.speed = speed * 0.5; // Adjust base speed
    this.isScrolling = true;

    this.intervalId = setInterval(() => {
      this.tick();
    }, AutoScrollManager.TICK_MS);
  }

  /**
   * Stop auto-scrolling.
   */
  stop(): void {
    this.isScrolling = false;
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Toggle auto-scroll.
   */
  toggle(scrollView: ScrollView, speed: number): void {
    if (this.isScrolling) {
      this.stop();
    } else {
      this.start(scrollView, speed);
    }
  }

  /**
   * Update scroll speed while running.
   */
  updateSpeed(speed: number): void {
    this.speed = speed * 0.5;
  }

  /**
   * Internal: called on each interval tick to advance the scroll position.
   */
  private tick(): void {
    if (!this.isScrolling || !this.scrollViewRef) {
      return;
    }

    this.currentOffset += this.speed;

    // Clamp to content bounds
    const maxOffset = Math.max(0, this.contentHeight - this.viewHeight);
    if (this.currentOffset >= maxOffset) {
      this.currentOffset = maxOffset;
      this.stop();
    }

    this.scrollViewRef.scrollTo({
      y: this.currentOffset,
      animated: false,
    });
  }

  /**
   * Call this from the ScrollView's onScroll handler to keep
   * the manager in sync with the user's manual scroll position.
   */
  onScroll(offsetY: number, contentHeight: number, viewHeight: number): void {
    this.currentOffset = offsetY;
    this.contentHeight = contentHeight;
    this.viewHeight = viewHeight;
  }

  /**
   * Check if currently scrolling.
   */
  isActive(): boolean {
    return this.isScrolling;
  }

  /**
   * Get current scroll position as 0-1 fraction.
   */
  getScrollProgress(): number {
    const maxOffset = this.contentHeight - this.viewHeight;
    return maxOffset > 0 ? this.currentOffset / maxOffset : 0;
  }

  /**
   * Scroll to a fractional position (0-1).
   */
  scrollTo(position: number): void {
    if (!this.scrollViewRef) return;
    const maxOffset = Math.max(0, this.contentHeight - this.viewHeight);
    const target = Math.max(0, Math.min(maxOffset, position * maxOffset));
    this.currentOffset = target;
    this.scrollViewRef.scrollTo({ y: target, animated: true });
  }

  /**
   * Clean up.
   */
  dispose(): void {
    this.stop();
    this.scrollViewRef = null;
    this.currentOffset = 0;
    this.contentHeight = 0;
    this.viewHeight = 0;
  }
}

/** Singleton instance for app-wide auto-scroll */
export const autoScrollManager = new AutoScrollManager();

/**
 * Hook helpers for auto-scroll functionality.
 */
export function useAutoScroll() {
  const startScroll = (scrollView: ScrollView, speed: number) => {
    autoScrollManager.start(scrollView, speed);
  };

  const stopScroll = () => {
    autoScrollManager.stop();
  };

  const toggleScroll = (scrollView: ScrollView, speed: number) => {
    autoScrollManager.toggle(scrollView, speed);
  };

  const updateSpeed = (speed: number) => {
    autoScrollManager.updateSpeed(speed);
  };

  const isScrollingActive = () => autoScrollManager.isActive();

  const getProgress = () => autoScrollManager.getScrollProgress();

  const scrollTo = (position: number) => {
    autoScrollManager.scrollTo(position);
  };

  return {
    startScroll,
    stopScroll,
    toggleScroll,
    updateSpeed,
    isScrolling: isScrollingActive,
    getProgress,
    scrollTo,
  };
}
