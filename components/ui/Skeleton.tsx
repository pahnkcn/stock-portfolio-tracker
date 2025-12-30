import { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/use-colors';
import { cn } from '@/lib/utils';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  className?: string;
  style?: ViewStyle;
}

export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius = 8,
  className,
  style,
}: SkeletonProps) {
  const colors = useColors();
  const shimmerProgress = useSharedValue(0);

  useEffect(() => {
    shimmerProgress.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(shimmerProgress.value, [0, 1], [-100, 100]);
    return {
      transform: [{ translateX: `${translateX}%` as unknown as number }],
    };
  });

  return (
    <View
      style={[
        styles.skeleton,
        {
          width: width as number,
          height,
          borderRadius,
          backgroundColor: colors.border,
        },
        style,
      ]}
      className={cn(className)}
    >
      <Animated.View
        style={[
          styles.shimmer,
          {
            backgroundColor: colors.surface,
          },
          animatedStyle,
        ]}
      />
    </View>
  );
}

// Preset skeleton components
export function SkeletonText({ lines = 1, className }: { lines?: number; className?: string }) {
  return (
    <View className={cn('gap-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={16}
          width={i === lines - 1 && lines > 1 ? '70%' : '100%'}
        />
      ))}
    </View>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  const colors = useColors();
  
  return (
    <View
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      className={cn('rounded-2xl border p-4', className)}
    >
      <View className="flex-row items-center mb-4">
        <Skeleton width={48} height={48} borderRadius={24} />
        <View className="ml-3 flex-1">
          <Skeleton width="60%" height={18} />
          <View className="h-2" />
          <Skeleton width="40%" height={14} />
        </View>
      </View>
      <SkeletonText lines={2} />
    </View>
  );
}

export function SkeletonPortfolioCard({ className }: { className?: string }) {
  const colors = useColors();
  
  return (
    <View
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      className={cn('rounded-2xl border p-5', className)}
    >
      <Skeleton width={120} height={14} />
      <View className="h-2" />
      <Skeleton width={180} height={36} />
      <View className="h-4" />
      <View className="flex-row justify-between">
        <View>
          <Skeleton width={80} height={12} />
          <View className="h-1" />
          <Skeleton width={100} height={20} />
        </View>
        <View className="items-end">
          <Skeleton width={80} height={12} />
          <View className="h-1" />
          <Skeleton width={100} height={20} />
        </View>
      </View>
    </View>
  );
}

export function SkeletonHoldingCard({ className }: { className?: string }) {
  const colors = useColors();
  
  return (
    <View
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      className={cn('rounded-xl border p-4', className)}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <Skeleton width={44} height={44} borderRadius={22} />
          <View className="ml-3">
            <Skeleton width={60} height={18} />
            <View className="h-1" />
            <Skeleton width={100} height={14} />
          </View>
        </View>
        <View className="items-end">
          <Skeleton width={80} height={18} />
          <View className="h-1" />
          <Skeleton width={60} height={14} />
        </View>
      </View>
    </View>
  );
}

export function SkeletonList({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <View className={cn('gap-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonHoldingCard key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.5,
  },
  card: {
    overflow: 'hidden',
  },
});
