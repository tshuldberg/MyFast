'use client';

import { RING_DEFAULTS } from '@myfast/ui';
import type { TimerRingProps, RingState } from '@myfast/ui';
import { colors } from '@myfast/ui';

function getStrokeColor(state: RingState): string {
  switch (state) {
    case 'fasting':
      return colors.ring.fasting;
    case 'complete':
      return colors.ring.complete;
    case 'overtime':
      return colors.ring.overtime;
    case 'idle':
    default:
      return colors.idle;
  }
}

export function TimerRing({
  progress,
  state,
  size = RING_DEFAULTS.size,
  strokeWidth = RING_DEFAULTS.strokeWidth,
}: TimerRingProps) {
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(progress, 1);
  const offset = circumference * (1 - clampedProgress);
  const strokeColor = getStrokeColor(state);

  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke={colors.ring.track}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
          style={{
            transition: 'stroke-dashoffset 0.6s cubic-bezier(0.33, 1, 0.68, 1), stroke 0.3s ease',
            animation: state === 'complete' ? 'pulse 2s ease-in-out infinite' : 'none',
          }}
        />
      </svg>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
