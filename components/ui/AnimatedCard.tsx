import { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { cn } from '@/lib/utils';
import { useColors } from '@/hooks/use-colors';
import { SPRING_CONFIG, TIMING_CONFIG, getStaggerDelay } from '@/lib/animations';

interface AnimatedCardProps {
  children: React.ReactNode;
  index?: number;
  className?: string;
  variant?: 'default' | 'elevated' | 'glass';
  delay?: number;
}

export function AnimatedCard({
  children,
  index = 0,
  className,
  variant = 'default',
  delay,
}: AnimatedCardProps) {
  const colors = useColors();
  const progress = useSharedValue(0);
  const scale = useSharedValue(0.95);

  const animationDelay = delay ?? getStaggerDelay(index, 80);

  useEffect(() => {
    progress.value = withDelay(animationDelay, withTiming(1, TIMING_CONFIG));
    scale.value = withDelay(animationDelay, withSpring(1, SPRING_CONFIG));
  }, [animationDelay]);

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP);
    const translateY = interpolate(progress.value, [0, 1], [20, 0], Extrapolation.CLAMP);

    return {
      opacity,
      transform: [{ translateY }, { scale: scale.value }],
    };
  });

  const getVariantStyles = () => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: colors.surface,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 12,
            },
            android: {
              elevation: 8,
            },
            web: {
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            },
          }),
        };
      case 'glass':
        return {
          backgroundColor: colors.surface + 'E6', // 90% opacity
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
            },
            android: {
              elevation: 4,
            },
            web: {
              backdropFilter: 'blur(10px)',
              boxShadow: '0 2px 16px rgba(0, 0, 0, 0.06)',
            },
          }),
        };
      default:
        return {
          backgroundColor: colors.surface,
        };
    }
  };

  return (
    <Animated.View
      style={[
        styles.card,
        getVariantStyles(),
        { borderColor: colors.border },
        animatedStyle,
      ]}
      className={cn('rounded-2xl border', className)}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
});
