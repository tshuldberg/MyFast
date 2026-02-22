import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { useTheme, RING_DEFAULTS } from '@myfast/ui';
import type { TimerRingProps, RingState } from '@myfast/ui';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function getStrokeColor(state: RingState, colors: ReturnType<typeof useTheme>['colors']): string {
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
  const { colors } = useTheme();

  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const animatedProgress = useSharedValue(0);
  const pulseOpacity = useSharedValue(1);

  const strokeColor = getStrokeColor(state, colors);

  // Animate progress changes smoothly
  useEffect(() => {
    animatedProgress.value = withTiming(Math.min(progress, 1), {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, animatedProgress]);

  // Pulse animation when target is reached
  useEffect(() => {
    if (state === 'complete') {
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(pulseOpacity);
      pulseOpacity.value = 1;
    }
  }, [state, pulseOpacity]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animatedProgress.value),
    opacity: pulseOpacity.value,
  }));

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background track */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={colors.ring.track}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Animated progress arc */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeLinecap="round"
          rotation={-90}
          origin={`${center}, ${center}`}
          animatedProps={animatedProps}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
