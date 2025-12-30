import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useColors } from '@/hooks/use-colors';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  strokeWidth?: number;
  color?: string;
  showGradient?: boolean;
  animated?: boolean;
}

export function Sparkline({
  data,
  width = 80,
  height = 30,
  strokeWidth = 2,
  color,
  showGradient = true,
  animated = true,
}: SparklineProps) {
  const colors = useColors();
  const progress = useSharedValue(0);

  // Determine color based on trend
  const isPositive = data.length >= 2 ? data[data.length - 1] >= data[0] : true;
  const lineColor = color || (isPositive ? colors.success : colors.error);

  useEffect(() => {
    if (animated) {
      progress.value = withDelay(100, withTiming(1, { duration: 800 }));
    } else {
      progress.value = 1;
    }
  }, [animated]);

  if (data.length < 2) {
    return <View style={{ width, height }} />;
  }

  // Normalize data to fit within the height
  const minValue = Math.min(...data);
  const maxValue = Math.max(...data);
  const range = maxValue - minValue || 1;
  const padding = 2;

  const normalizedData = data.map((value) => {
    return ((value - minValue) / range) * (height - padding * 2) + padding;
  });

  // Create SVG path
  const stepX = (width - padding * 2) / (data.length - 1);
  
  let pathD = `M ${padding} ${height - normalizedData[0]}`;
  for (let i = 1; i < normalizedData.length; i++) {
    const x = padding + i * stepX;
    const y = height - normalizedData[i];
    pathD += ` L ${x} ${y}`;
  }

  // Create gradient fill path
  const fillPathD = `${pathD} L ${width - padding} ${height} L ${padding} ${height} Z`;

  const animatedProps = useAnimatedProps(() => {
    return {
      strokeDashoffset: (1 - progress.value) * 200,
    };
  });

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height}>
        {showGradient && (
          <Defs>
            <LinearGradient id="sparklineGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={lineColor} stopOpacity={0.3} />
              <Stop offset="100%" stopColor={lineColor} stopOpacity={0} />
            </LinearGradient>
          </Defs>
        )}
        
        {showGradient && (
          <Path
            d={fillPathD}
            fill="url(#sparklineGradient)"
          />
        )}
        
        <AnimatedPath
          d={pathD}
          stroke={lineColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={200}
          animatedProps={animatedProps}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
