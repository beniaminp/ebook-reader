/**
 * PageTransition Component
 *
 * Wraps page content and provides transition animations on page turn.
 * Supports: none, fade, slide, curl.
 *
 * Uses React Native Animated API for transitions.
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { Animated, Dimensions, StyleSheet } from 'react-native';

export type PageTransitionType = 'none' | 'fade' | 'slide' | 'curl';
export type PageDirection = 'forward' | 'backward';

interface PageTransitionProps {
  /** Animation type */
  type: PageTransitionType;
  /** Direction of the page turn */
  direction: PageDirection;
  /** Content to wrap */
  children: React.ReactNode;
  /** Called when the transition animation finishes */
  onTransitionComplete?: () => void;
  /** Duration in ms (default 300) */
  duration?: number;
  /** Changes whenever the page changes — drives a new animation cycle */
  pageKey?: string | number;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const PageTransition: React.FC<PageTransitionProps> = ({
  type,
  direction,
  children,
  onTransitionComplete,
  duration = 300,
  pageKey,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const prevPageKeyRef = useRef<string | number | undefined>(pageKey);

  const runAnimation = useCallback(() => {
    if (type === 'none') {
      onTransitionComplete?.();
      return;
    }

    // Reset to start state and animate to end state
    animatedValue.setValue(0);
    Animated.timing(animatedValue, {
      toValue: 1,
      duration,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        onTransitionComplete?.();
      }
    });
  }, [type, duration, animatedValue, onTransitionComplete]);

  useEffect(() => {
    if (pageKey !== undefined && pageKey !== prevPageKeyRef.current) {
      prevPageKeyRef.current = pageKey;
      runAnimation();
    }
  }, [pageKey, runAnimation]);

  // If no pageKey tracking, run on first mount
  useEffect(() => {
    if (pageKey === undefined) {
      runAnimation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getAnimatedStyle = (): Animated.AnimatedProps<any> => {
    switch (type) {
      case 'fade':
        return {
          opacity: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 1],
          }),
        };

      case 'slide': {
        const fromX = direction === 'forward' ? SCREEN_WIDTH : -SCREEN_WIDTH;
        return {
          transform: [
            {
              translateX: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [fromX, 0],
              }),
            },
          ],
        };
      }

      case 'curl':
        // Approximate curl with a perspective + rotateY + scale combo
        return {
          transform: [
            { perspective: 1200 },
            {
              rotateY: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [
                  direction === 'forward' ? '90deg' : '-90deg',
                  '0deg',
                ],
              }),
            },
            {
              scale: animatedValue.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.85, 0.95, 1],
              }),
            },
          ],
          opacity: animatedValue.interpolate({
            inputRange: [0, 0.3, 1],
            outputRange: [0.3, 0.8, 1],
          }),
        };

      case 'none':
      default:
        return {};
    }
  };

  if (type === 'none') {
    return <>{children}</>;
  }

  return (
    <Animated.View style={[styles.container, getAnimatedStyle()]}>
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default PageTransition;
