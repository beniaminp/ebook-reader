/**
 * Auto Scroll Manager
 * Handles auto-scroll functionality for reading
 */

export class AutoScrollManager {
  private element: HTMLElement | null = null;
  private animationId: number | null = null;
  private isScrolling = false;
  private speed = 1; // pixels per frame
  private lastTimestamp = 0;
  private accumulatedDelta = 0;

  /**
   * Start auto-scrolling
   */
  start(element: HTMLElement, speed: number = 1): void {
    this.element = element;
    this.speed = speed * 0.5; // Adjust base speed
    this.isScrolling = true;
    this.lastTimestamp = performance.now();
    this.accumulatedDelta = 0;

    this.animate();
  }

  /**
   * Stop auto-scrolling
   */
  stop(): void {
    this.isScrolling = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Toggle auto-scroll
   */
  toggle(element: HTMLElement, speed: number): void {
    if (this.isScrolling) {
      this.stop();
    } else {
      this.start(element, speed);
    }
  }

  /**
   * Update scroll speed
   */
  updateSpeed(speed: number): void {
    this.speed = speed * 0.5;
  }

  /**
   * Animation loop for smooth scrolling
   */
  private animate = (): void => {
    if (!this.isScrolling || !this.element) {
      return;
    }

    this.animationId = requestAnimationFrame(this.animate);

    const currentTimestamp = performance.now();
    const deltaTime = currentTimestamp - this.lastTimestamp;
    this.lastTimestamp = currentTimestamp;

    // Calculate scroll delta based on speed and delta time
    // Speed is in pixels per frame, adjust for frame rate
    const delta = (this.speed * deltaTime) / 16; // Normalize to ~60fps
    this.accumulatedDelta += delta;

    // Only scroll when we have at least 1 pixel
    if (this.accumulatedDelta >= 1) {
      const pixelsToScroll = Math.floor(this.accumulatedDelta);
      this.accumulatedDelta -= pixelsToScroll;

      // Scroll the element
      this.element.scrollBy(0, pixelsToScroll);

      // Check if we've reached the bottom
      const { scrollTop, scrollHeight, clientHeight } = this.element;
      if (scrollTop + clientHeight >= scrollHeight - 1) {
        // Reached bottom, could pause or loop
        // For now, just stop
        this.stop();
      }
    }
  };

  /**
   * Check if currently scrolling
   */
  isActive(): boolean {
    return this.isScrolling;
  }

  /**
   * Get current scroll position as percentage
   */
  getScrollProgress(): number {
    if (!this.element) {
      return 0;
    }

    const { scrollTop, scrollHeight, clientHeight } = this.element;
    const maxScroll = scrollHeight - clientHeight;
    return maxScroll > 0 ? scrollTop / maxScroll : 0;
  }

  /**
   * Scroll to specific position
   */
  scrollTo(position: number): void {
    if (!this.element) {
      return;
    }

    const { scrollHeight, clientHeight } = this.element;
    const maxScroll = scrollHeight - clientHeight;
    const targetScroll = Math.max(0, Math.min(maxScroll, position * maxScroll));

    this.element.scrollTo({
      top: targetScroll,
      behavior: 'smooth',
    });
  }

  /**
   * Scroll to specific element
   */
  scrollToElement(element: HTMLElement, block: ScrollLogicalPosition = 'start'): void {
    element.scrollIntoView({ behavior: 'smooth', block });
  }

  /**
   * Clean up
   */
  dispose(): void {
    this.stop();
    this.element = null;
  }
}

// Export singleton instance
export const autoScrollManager = new AutoScrollManager();

/**
 * Hook for auto-scroll functionality
 */
export function useAutoScroll() {
  const startScroll = (element: HTMLElement, speed: number) => {
    autoScrollManager.start(element, speed);
  };

  const stopScroll = () => {
    autoScrollManager.stop();
  };

  const toggleScroll = (element: HTMLElement, speed: number) => {
    autoScrollManager.toggle(element, speed);
  };

  const updateSpeed = (speed: number) => {
    autoScrollManager.updateSpeed(speed);
  };

  const isScrolling = () => autoScrollManager.isActive();

  const getProgress = () => autoScrollManager.getScrollProgress();

  const scrollTo = (position: number) => {
    autoScrollManager.scrollTo(position);
  };

  return {
    startScroll,
    stopScroll,
    toggleScroll,
    updateSpeed,
    isScrolling,
    getProgress,
    scrollTo,
  };
}
