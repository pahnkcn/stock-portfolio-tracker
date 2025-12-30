import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/use-colors';

interface ProgressBarProps {
  progress: number; // 0 to 100
  color?: string;
  backgroundColor?: string;
  height?: number;
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
  delay?: number;
}

export function ProgressBar({
  progress,
  color,
  backgroundColor,
  height = 8,
  showLabel = false,
  label,
  animated = true,
  delay = 0,
}: ProgressBarProps) {
  const colors = useColors();
  const animatedProgress = useSharedValue(0);

  const barColor = color || colors.primary;
  const bgColor = backgroundColor || colors.border;

  useEffect(() => {
    const clampedProgress = Math.max(0, Math.min(100, progress));
    if (animated) {
      animatedProgress.value = withDelay(
        delay,
        withTiming(clampedProgress, {
          duration: 800,
          easing: Easing.out(Easing.cubic),
        })
      );
    } else {
      animatedProgress.value = clampedProgress;
    }
  }, [progress, animated, delay]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: `${animatedProgress.value}%`,
    };
  });

  return (
    <View style={styles.container}>
      {showLabel && (
        <View style={styles.labelContainer}>
          <Text style={[styles.label, { color: colors.foreground }]}>
            {label || 'Progress'}
          </Text>
          <Text style={[styles.percentage, { color: colors.muted }]}>
            {Math.round(progress)}%
          </Text>
        </View>
      )}
      <View style={[styles.track, { height, backgroundColor: bgColor }]}>
        <Animated.View
          style={[
            styles.fill,
            { backgroundColor: barColor, height },
            animatedStyle,
          ]}
        />
      </View>
    </View>
  );
}

// Multi-segment progress bar for P&L breakdown
interface SegmentedProgressBarProps {
  segments: Array<{
    value: number;
    color: string;
    label?: string;
  }>;
  height?: number;
  animated?: boolean;
}

export function SegmentedProgressBar({
  segments,
  height = 12,
  animated = true,
}: SegmentedProgressBarProps) {
  const colors = useColors();
  const progress = useSharedValue(0);

  const total = segments.reduce((sum, s) => sum + Math.abs(s.value), 0);

  useEffect(() => {
    if (animated) {
      progress.value = withDelay(
        100,
        withTiming(1, {
          duration: 800,
          easing: Easing.out(Easing.cubic),
        })
      );
    } else {
      progress.value = 1;
    }
  }, [animated]);

  return (
    <View style={[styles.segmentedTrack, { height, backgroundColor: colors.border }]}>
      {segments.map((segment, index) => {
        const percent = total > 0 ? (Math.abs(segment.value) / total) * 100 : 0;
        return (
          <AnimatedSegment
            key={index}
            percent={percent}
            color={segment.color}
            progress={progress}
            height={height}
            isFirst={index === 0}
            isLast={index === segments.length - 1}
          />
        );
      })}
    </View>
  );
}

interface AnimatedSegmentProps {
  percent: number;
  color: string;
  progress: { value: number };
  height: number;
  isFirst: boolean;
  isLast: boolean;
}

function AnimatedSegment({
  percent,
  color,
  progress,
  height,
  isFirst,
  isLast,
}: AnimatedSegmentProps) {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: `${percent * progress.value}%`,
    };
  });

  return (
    <Animated.View
      style={[
        styles.segment,
        {
          backgroundColor: color,
          height,
          borderTopLeftRadius: isFirst ? height / 2 : 0,
          borderBottomLeftRadius: isFirst ? height / 2 : 0,
          borderTopRightRadius: isLast ? height / 2 : 0,
          borderBottomRightRadius: isLast ? height / 2 : 0,
        },
        animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  percentage: {
    fontSize: 14,
  },
  track: {
    width: '100%',
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: 4,
  },
  segmentedTrack: {
    width: '100%',
    borderRadius: 6,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  segment: {
    minWidth: 2,
  },
});
