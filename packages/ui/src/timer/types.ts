/** Visual state of the timer ring */
export type RingState = 'idle' | 'fasting' | 'complete' | 'overtime';

export interface TimerRingProps {
  /** Progress from 0 to 1 (capped at 1 for display) */
  progress: number;
  /** Current ring visual state */
  state: RingState;
  /** Diameter of the ring in pixels */
  size?: number;
  /** Stroke width of the ring */
  strokeWidth?: number;
}

/** Default ring dimensions */
export const RING_DEFAULTS = {
  size: 280,
  strokeWidth: 12,
} as const;
