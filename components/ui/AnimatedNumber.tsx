import { useEffect, useState } from 'react';
import { Text, TextStyle, StyleProp } from 'react-native';

interface AnimatedNumberProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  style?: StyleProp<TextStyle>;
  className?: string;
}

export function AnimatedNumber({
  value,
  prefix = '',
  suffix = '',
  decimals = 2,
  duration = 600,
  style,
  className,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const startValue = displayValue;
    const endValue = value;
    const startTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (endValue - startValue) * easeOut;
      
      setDisplayValue(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  const formatted = Math.abs(displayValue).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  const sign = displayValue < 0 ? '-' : '';

  return (
    <Text style={style} className={className}>
      {`${prefix}${sign}${formatted}${suffix}`}
    </Text>
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
}

export function AnimatedCurrency({
  value,
  currency = 'USD',
  showSign = false,
  duration = 600,
  style,
  className,
}: AnimatedCurrencyProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const startValue = displayValue;
    const endValue = value;
    const startTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (endValue - startValue) * easeOut;
      
      setDisplayValue(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  const prefix = currency === 'USD' ? '$' : '฿';
  const decimals = currency === 'USD' ? 2 : 0;
  
  const formatted = Math.abs(displayValue).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  
  const signPrefix = showSign && displayValue > 0 ? '+' : '';
  const sign = displayValue < 0 ? '-' : '';

  return (
    <Text style={style} className={className}>
      {`${signPrefix}${sign}${prefix}${formatted}`}
    </Text>
  );
}

// Percentage animated number
interface AnimatedPercentProps {
  value: number;
  showSign?: boolean;
  duration?: number;
  style?: StyleProp<TextStyle>;
  className?: string;
}

export function AnimatedPercent({
  value,
  showSign = true,
  duration = 600,
  style,
  className,
}: AnimatedPercentProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const startValue = displayValue;
    const endValue = value;
    const startTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (endValue - startValue) * easeOut;
      
      setDisplayValue(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  const formatted = Math.abs(displayValue).toFixed(2);
  const signPrefix = showSign && displayValue > 0 ? '+' : '';
  const sign = displayValue < 0 ? '-' : '';

  return (
    <Text style={style} className={className}>
      {`${signPrefix}${sign}${formatted}%`}
    </Text>
  );
}
