import { useEffect } from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
  runOnJS,
} from 'react-native-reanimated';
import { SPRING_CONFIG, TIMING_CONFIG, getStaggerDelay, PRESS_SCALE } from '@/lib/animations';

interface AnimatedListItemProps {
  children: React.ReactNode;
  index?: number;
  onPress?: () => void;
  delay?: number;
  style?: ViewStyle;
  disabled?: boolean;
}

export function AnimatedListItem({
  children,
  index = 0,
  onPress,
  delay,
  style,
  disabled = false,
}: AnimatedListItemProps) {
  const progress = useSharedValue(0);
  const scale = useSharedValue(1);
  const pressed = useSharedValue(false);

  const animationDelay = delay ?? getStaggerDelay(index, 60);

  useEffect(() => {
    progress.value = withDelay(animationDelay, withTiming(1, TIMING_CONFIG));
  }, [animationDelay]);

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP);
    const translateX = interpolate(progress.value, [0, 1], [30, 0], Extrapolation.CLAMP);

    return {
      opacity,
      transform: [
        { translateX },
        { scale: scale.value },
      ],
    };
  });

  const handlePressIn = () => {
    if (!disabled && onPress) {
      pressed.value = true;
      scale.value = withTiming(PRESS_SCALE, { duration: 100 });
    }
  };

  const handlePressOut = () => {
    if (!disabled && onPress) {
      pressed.value = false;
      scale.value = withSpring(1, SPRING_CONFIG);
    }
  };

  const handlePress = () => {
    if (!disabled && onPress) {
      onPress();
    }
  };

  if (onPress) {
    return (
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        disabled={disabled}
      >
        <Animated.View style={[style, animatedStyle]}>
          {children}
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <Animated.View style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
}

// Fade in from bottom animation
interface FadeInViewProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  style?: ViewStyle;
}

export function FadeInView({
  children,
  delay = 0,
  duration = 400,
  style,
}: FadeInViewProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(delay, withTiming(1, { duration }));
  }, [delay, duration]);

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP);
    const translateY = interpolate(progress.value, [0, 1], [20, 0], Extrapolation.CLAMP);

    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  return (
    <Animated.View style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
}

// Scale in animation
interface ScaleInViewProps {
  children: React.ReactNode;
  delay?: number;
  style?: ViewStyle;
}

export function ScaleInView({
  children,
  delay = 0,
  style,
}: ScaleInViewProps) {
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, TIMING_CONFIG));
    scale.value = withDelay(delay, withSpring(1, SPRING_CONFIG));
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <Animated.View style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
}

// Slide in from right animation
interface SlideInViewProps {
  children: React.ReactNode;
  delay?: number;
  style?: ViewStyle;
}

export function SlideInView({
  children,
  delay = 0,
  style,
}: SlideInViewProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(delay, withSpring(1, SPRING_CONFIG));
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(progress.value, [0, 1], [50, 0], Extrapolation.CLAMP);
    const opacity = interpolate(progress.value, [0, 0.5, 1], [0, 0.5, 1], Extrapolation.CLAMP);

    return {
      opacity,
      transform: [{ translateX }],
    };
  });

  return (
    <Animated.View style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
}
