import { ReactNode } from 'react';
import { Pressable, StyleSheet, ViewStyle, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const AnimatedPressableView = Animated.createAnimatedComponent(Pressable);

interface AnimatedPressableProps {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  scaleValue?: number;
  hapticFeedback?: boolean;
  hapticStyle?: 'light' | 'medium' | 'heavy';
  animationType?: 'scale' | 'opacity' | 'both';
}

export function AnimatedPressable({
  children,
  onPress,
  onLongPress,
  disabled = false,
  style,
  scaleValue = 0.96,
  hapticFeedback = true,
  hapticStyle = 'light',
  animationType = 'both',
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    const transforms: ViewStyle['transform'] = [];

    if (animationType === 'scale' || animationType === 'both') {
      transforms.push({ scale: scale.value });
    }

    return {
      transform: transforms,
      opacity: animationType === 'opacity' || animationType === 'both'
        ? opacity.value
        : 1,
    };
  });

  const handlePressIn = () => {
    if (disabled) return;

    scale.value = withTiming(scaleValue, { duration: 100 });
    opacity.value = withTiming(0.9, { duration: 100 });

    if (hapticFeedback && Platform.OS === 'ios') {
      const feedbackStyle = {
        light: Haptics.ImpactFeedbackStyle.Light,
        medium: Haptics.ImpactFeedbackStyle.Medium,
        heavy: Haptics.ImpactFeedbackStyle.Heavy,
      }[hapticStyle];
      Haptics.impactAsync(feedbackStyle);
    }
  };

  const handlePressOut = () => {
    if (disabled) return;
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
    opacity.value = withTiming(1, { duration: 150 });
  };

  const handlePress = () => {
    if (disabled || !onPress) return;
    onPress();
  };

  const handleLongPress = () => {
    if (disabled || !onLongPress) return;
    if (hapticFeedback && Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onLongPress();
  };

  return (
    <AnimatedPressableView
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      onLongPress={onLongPress ? handleLongPress : undefined}
      disabled={disabled}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressableView>
  );
}

// Animated Button variant with more pronounced feedback
interface AnimatedButtonProps extends AnimatedPressableProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
}

export function AnimatedButton({
  children,
  variant = 'primary',
  scaleValue = 0.97,
  ...props
}: AnimatedButtonProps) {
  return (
    <AnimatedPressable
      {...props}
      scaleValue={scaleValue}
      hapticFeedback={true}
      animationType="both"
    >
      {children}
    </AnimatedPressable>
  );
}

// Card press wrapper
interface AnimatedCardPressProps extends AnimatedPressableProps {
  elevation?: boolean;
}

export function AnimatedCardPress({
  children,
  elevation = true,
  scaleValue = 0.98,
  ...props
}: AnimatedCardPressProps) {
  return (
    <AnimatedPressable
      {...props}
      scaleValue={scaleValue}
      hapticFeedback={true}
      hapticStyle="light"
      animationType="scale"
    >
      {children}
    </AnimatedPressable>
  );
}
