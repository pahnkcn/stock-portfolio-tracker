import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';
import { useColors } from '@/hooks/use-colors';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface DonutChartData {
  value: number;
  color: string;
  label: string;
}

interface DonutChartProps {
  data: DonutChartData[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerValue?: string;
  animated?: boolean;
}

export function DonutChart({
  data,
  size = 160,
  strokeWidth = 20,
  centerLabel,
  centerValue,
  animated = true,
}: DonutChartProps) {
  const colors = useColors();
  const progress = useSharedValue(0);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  useEffect(() => {
    if (animated) {
      progress.value = withDelay(
        200,
        withTiming(1, { duration: 1000, easing: Easing.out(Easing.cubic) })
      );
    } else {
      progress.value = 1;
    }
  }, [animated]);

  // Calculate total and percentages
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  // Calculate stroke dash arrays for each segment
  let cumulativePercent = 0;
  const segments = data.map((item) => {
    const percent = total > 0 ? item.value / total : 0;
    const strokeDasharray = `${circumference * percent} ${circumference * (1 - percent)}`;
    const rotation = cumulativePercent * 360 - 90; // Start from top
    cumulativePercent += percent;
    return {
      ...item,
      percent,
      strokeDasharray,
      rotation,
    };
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Background circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={colors.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        
        {/* Data segments */}
        <G rotation={-90} origin={`${center}, ${center}`}>
          {segments.map((segment, index) => (
            <AnimatedSegment
              key={index}
              cx={center}
              cy={center}
              r={radius}
              strokeWidth={strokeWidth}
              color={segment.color}
              strokeDasharray={segment.strokeDasharray}
              rotation={segment.rotation + 90}
              progress={progress}
              circumference={circumference}
              percent={segment.percent}
              delay={index * 100}
            />
          ))}
        </G>
      </Svg>
      
      {/* Center content */}
      {(centerLabel || centerValue) && (
        <View style={styles.centerContent}>
          {centerValue && (
            <Text style={[styles.centerValue, { color: colors.foreground }]}>
              {centerValue}
            </Text>
          )}
          {centerLabel && (
            <Text style={[styles.centerLabel, { color: colors.muted }]}>
              {centerLabel}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

interface AnimatedSegmentProps {
  cx: number;
  cy: number;
  r: number;
  strokeWidth: number;
  color: string;
  strokeDasharray: string;
  rotation: number;
  progress: { value: number };
  circumference: number;
  percent: number;
  delay: number;
}

function AnimatedSegment({
  cx,
  cy,
  r,
  strokeWidth,
  color,
  strokeDasharray,
  rotation,
  progress,
  circumference,
  percent,
  delay,
}: AnimatedSegmentProps) {
  const animatedProps = useAnimatedProps(() => {
    const segmentLength = circumference * percent * progress.value;
    const gapLength = circumference - segmentLength;
    return {
      strokeDasharray: `${segmentLength} ${gapLength}`,
    };
  });

  return (
    <AnimatedCircle
      cx={cx}
      cy={cy}
      r={r}
      stroke={color}
      strokeWidth={strokeWidth}
      fill="none"
      strokeLinecap="round"
      rotation={rotation}
      origin={`${cx}, ${cy}`}
      animatedProps={animatedProps}
    />
  );
}

// Legend component
interface DonutLegendProps {
  data: DonutChartData[];
  total: number;
}

export function DonutLegend({ data, total }: DonutLegendProps) {
  const colors = useColors();

  return (
    <View style={styles.legend}>
      {data.map((item, index) => {
        const percent = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
        return (
          <View key={index} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={[styles.legendLabel, { color: colors.foreground }]}>
              {item.label}
            </Text>
            <Text style={[styles.legendPercent, { color: colors.muted }]}>
              {percent}%
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  centerLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  legend: {
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendLabel: {
    flex: 1,
    fontSize: 14,
  },
  legendPercent: {
    fontSize: 14,
    fontWeight: '500',
  },
});
