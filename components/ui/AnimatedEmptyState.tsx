import { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/use-colors';

interface AnimatedEmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function AnimatedEmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: AnimatedEmptyStateProps) {
  const colors = useColors();

  // Animation values
  const iconProgress = useSharedValue(0);
  const titleProgress = useSharedValue(0);
  const descProgress = useSharedValue(0);
  const buttonProgress = useSharedValue(0);
  const floatProgress = useSharedValue(0);
  const buttonScale = useSharedValue(1);

  useEffect(() => {
    // Staggered entry animations
    iconProgress.value = withDelay(0, withSpring(1, { damping: 12, stiffness: 100 }));
    titleProgress.value = withDelay(150, withTiming(1, { duration: 400 }));
    descProgress.value = withDelay(300, withTiming(1, { duration: 400 }));
    buttonProgress.value = withDelay(450, withSpring(1, { damping: 15, stiffness: 120 }));

    // Floating animation for icon
    floatProgress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000 }),
        withTiming(0, { duration: 2000 })
      ),
      -1,
      true
    );
  }, []);

  const iconStyle = useAnimatedStyle(() => {
    const scale = interpolate(iconProgress.value, [0, 1], [0.5, 1], Extrapolation.CLAMP);
    const opacity = interpolate(iconProgress.value, [0, 1], [0, 1], Extrapolation.CLAMP);
    const translateY = interpolate(floatProgress.value, [0, 1], [0, -8], Extrapolation.CLAMP);

    return {
      transform: [{ scale }, { translateY }],
      opacity,
    };
  });

  const titleStyle = useAnimatedStyle(() => {
    const opacity = interpolate(titleProgress.value, [0, 1], [0, 1], Extrapolation.CLAMP);
    const translateY = interpolate(titleProgress.value, [0, 1], [20, 0], Extrapolation.CLAMP);

    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  const descStyle = useAnimatedStyle(() => {
    const opacity = interpolate(descProgress.value, [0, 1], [0, 1], Extrapolation.CLAMP);
    const translateY = interpolate(descProgress.value, [0, 1], [20, 0], Extrapolation.CLAMP);

    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  const buttonStyle = useAnimatedStyle(() => {
    const scale = interpolate(buttonProgress.value, [0, 1], [0.8, 1], Extrapolation.CLAMP);
    const opacity = interpolate(buttonProgress.value, [0, 1], [0, 1], Extrapolation.CLAMP);

    return {
      transform: [{ scale: scale * buttonScale.value }],
      opacity,
    };
  });

  const handlePressIn = () => {
    buttonScale.value = withTiming(0.95, { duration: 100 });
  };

  const handlePressOut = () => {
    buttonScale.value = withSpring(1, { damping: 15, stiffness: 200 });
  };

  const handlePress = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onAction?.();
  };

  return (
    <View style={styles.container}>
      <Animated.Text style={[styles.icon, iconStyle]}>{icon}</Animated.Text>

      <Animated.Text style={[styles.title, { color: colors.foreground }, titleStyle]}>
        {title}
      </Animated.Text>

      {description && (
        <Animated.Text style={[styles.description, { color: colors.muted }, descStyle]}>
          {description}
        </Animated.Text>
      )}

      {actionLabel && onAction && (
        <Animated.View style={buttonStyle}>
          <Pressable
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={handlePress}
            style={[styles.button, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.buttonText}>{actionLabel}</Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  icon: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
