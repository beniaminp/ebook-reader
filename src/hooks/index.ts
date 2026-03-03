/**
 * Hooks Index
 * Exports all custom hooks
 */

export { useReaderSettings } from './useReaderSettings';
export type { UseReaderSettingsOptions, UseReaderSettingsReturn } from './useReaderSettings';

export { useTapZones } from './useTapZones';
export type {
  UseTapZonesOptions,
  UseTapZonesReturn,
  TapZoneConfig,
  TapZoneAction,
} from './useTapZones';

export { useSwipeGesture } from './useSwipeGesture';
export type { UseSwipeGestureOptions, UseSwipeGestureReturn } from './useSwipeGesture';

export { useTTS } from './useTTS';
export type { UseTTSReturn, UseTTSOptions, TTSState, TTSVoice, TTSWordBoundary } from './useTTS';

export { useBrightnessGesture } from './useBrightnessGesture';
export type {
  UseBrightnessGestureOptions,
  UseBrightnessGestureReturn,
} from './useBrightnessGesture';

export { useTTSHighlighter } from './useTTSHighlighter';
export type { UseTTSHighlighterOptions, UseTTSHighlighterReturn } from './useTTSHighlighter';

export { useSleepTimer } from './useSleepTimer';
export type { UseSleepTimerOptions, UseSleepTimerReturn } from './useSleepTimer';

export { useReadingSpeed } from './useReadingSpeed';
export type {
  UseReadingSpeedOptions,
  UseReadingSpeedReturn,
  TimeLeftEstimate,
} from './useReadingSpeed';
