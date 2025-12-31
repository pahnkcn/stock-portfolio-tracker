import { useEffect, useRef, useState } from 'react';
import { Text, TextStyle, StyleProp, View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
  useDerivedValue,
  useAnimatedReaction,
  runOnJS,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/use-colors';

interface AnimatedNumberProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  style?: StyleProp<TextStyle>;
  className?: string;
  showFlash?: boolean;
}

export function AnimatedNumber({
  value,
  prefix = '',
  suffix = '',
  decimals = 2,
  duration = 500,
  style,
  className,
  showFlash = false,
}: AnimatedNumberProps) {
  const colors = useColors();
  const [displayValue, setDisplayValue] = useState(value);
  const previousValue = useRef(value);

  // Animation values
  const animatedValue = useSharedValue(value);
  const flashOpacity = useSharedValue(0);
  const isPositiveChange = useSharedValue(true);

  const updateDisplayValue = (val: number) => {
    setDisplayValue(val);
  };

  useEffect(() => {
    const wasPositive = previousValue.current >= 0;
    const isPositive = value >= 0;
    const increased = value > previousValue.current;

    isPositiveChange.value = increased;
    previousValue.current = value;

    // Animate to new value
    animatedValue.value = withTiming(value, {
      duration,
      easing: Easing.out(Easing.cubic),
    });

    // Flash effect when value changes
    if (showFlash && value !== displayValue) {
      flashOpacity.value = withSequence(
        withTiming(0.3, { duration: 100 }),
        withTiming(0, { duration: 400 })
      );
    }
  }, [value, duration, showFlash]);

  useAnimatedReaction(
    () => animatedValue.value,
    (currentValue) => {
      runOnJS(updateDisplayValue)(currentValue);
    },
    [animatedValue]
  );

  const flashStyle = useAnimatedStyle(() => ({
    backgroundColor: isPositiveChange.value ? colors.success : colors.error,
    opacity: flashOpacity.value,
  }));

  const formatted = Math.abs(displayValue).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  const sign = displayValue < 0 ? '-' : '';

  return (
    <View style={styles.container}>
      {showFlash && <Animated.View style={[styles.flash, flashStyle]} />}
      <Text style={style} className={className}>
        {`${prefix}${sign}${formatted}${suffix}`}
      </Text>
    </View>
  );
}

// Currency-specific animated number
interface AnimatedCurrencyProps {
  value: number;
  currency?: 'USD' | 'THB';
  showSign?: boolean;
  duration?: number;
  style?: StyleProp<TextStyle>;
  className?: string;
  showFlash?: boolean;
}

export function AnimatedCurrency({
  value,
  currency = 'USD',
  showSign = false,
  duration = 500,
  style,
  className,
  showFlash = false,
}: AnimatedCurrencyProps) {
  const colors = useColors();
  const [displayValue, setDisplayValue] = useState(value);
  const previousValue = useRef(value);

  const animatedValue = useSharedValue(value);
  const flashOpacity = useSharedValue(0);
  const isPositiveChange = useSharedValue(true);

  const updateDisplayValue = (val: number) => {
    setDisplayValue(val);
  };

  useEffect(() => {
    const increased = value > previousValue.current;
    isPositiveChange.value = increased;
    previousValue.current = value;

    animatedValue.value = withTiming(value, {
      duration,
      easing: Easing.out(Easing.cubic),
    });

    if (showFlash && Math.abs(value - displayValue) > 0.01) {
      flashOpacity.value = withSequence(
        withTiming(0.3, { duration: 100 }),
        withTiming(0, { duration: 400 })
      );
    }
  }, [value, duration, showFlash]);

  useAnimatedReaction(
    () => animatedValue.value,
    (currentValue) => {
      runOnJS(updateDisplayValue)(currentValue);
    },
    [animatedValue]
  );

  const flashStyle = useAnimatedStyle(() => ({
    backgroundColor: isPositiveChange.value ? colors.success : colors.error,
    opacity: flashOpacity.value,
  }));

  const prefix = currency === 'USD' ? '$' : '฿';
  const decimals = currency === 'USD' ? 2 : 0;

  const formatted = Math.abs(displayValue).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  const signPrefix = showSign && displayValue > 0 ? '+' : '';
  const sign = displayValue < 0 ? '-' : '';

  return (
    <View style={styles.container}>
      {showFlash && <Animated.View style={[styles.flash, flashStyle]} />}
      <Text style={style} className={className}>
        {`${signPrefix}${sign}${prefix}${formatted}`}
      </Text>
    </View>
  );
}

// Percentage animated number
interface AnimatedPercentProps {
  value: number;
  showSign?: boolean;
  duration?: number;
  style?: StyleProp<TextStyle>;
  className?: string;
  showFlash?: boolean;
}

export function AnimatedPercent({
  value,
  showSign = true,
  duration = 500,
  style,
  className,
  showFlash = false,
}: AnimatedPercentProps) {
  const colors = useColors();
  const [displayValue, setDisplayValue] = useState(value);
  const previousValue = useRef(value);

  const animatedValue = useSharedValue(value);
  const flashOpacity = useSharedValue(0);
  const isPositiveChange = useSharedValue(true);

  const updateDisplayValue = (val: number) => {
    setDisplayValue(val);
  };

  useEffect(() => {
    const increased = value > previousValue.current;
    isPositiveChange.value = increased;
    previousValue.current = value;

    animatedValue.value = withTiming(value, {
      duration,
      easing: Easing.out(Easing.cubic),
    });

    if (showFlash && Math.abs(value - displayValue) > 0.01) {
      flashOpacity.value = withSequence(
        withTiming(0.3, { duration: 100 }),
        withTiming(0, { duration: 400 })
      );
    }
  }, [value, duration, showFlash]);

  useAnimatedReaction(
    () => animatedValue.value,
    (currentValue) => {
      runOnJS(updateDisplayValue)(currentValue);
    },
    [animatedValue]
  );

  const flashStyle = useAnimatedStyle(() => ({
    backgroundColor: isPositiveChange.value ? colors.success : colors.error,
    opacity: flashOpacity.value,
  }));

  const formatted = Math.abs(displayValue).toFixed(2);
  const signPrefix = showSign && displayValue > 0 ? '+' : '';
  const sign = displayValue < 0 ? '-' : '';

  return (
    <View style={styles.container}>
      {showFlash && <Animated.View style={[styles.flash, flashStyle]} />}
      <Text style={style} className={className}>
        {`${signPrefix}${sign}${formatted}%`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  flash: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 4,
  },
});
