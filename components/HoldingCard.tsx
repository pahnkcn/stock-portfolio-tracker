import { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { formatCurrency, formatPercent, calculatePnL } from '@/lib/calculations';
import { useColors } from '@/hooks/use-colors';
import { Sparkline } from './ui/Sparkline';
import { AnimatedCurrency, AnimatedPercent } from './ui/AnimatedNumber';
import type { Holding, StockQuote } from '@/types';

interface HoldingCardProps {
  holding: Holding;
  quote?: StockQuote;
  showInTHB?: boolean;
  usdThbRate?: number;
  index?: number;
}

export function HoldingCard({ 
  holding, 
  quote, 
  showInTHB = false, 
  usdThbRate = 35,
  index = 0,
}: HoldingCardProps) {
  const colors = useColors();
  const router = useRouter();

  // Animation values
  const progress = useSharedValue(0);
  const scale = useSharedValue(1);

  const animationDelay = index * 60;

  useEffect(() => {
    progress.value = withDelay(animationDelay, withTiming(1, { duration: 350 }));
  }, [animationDelay]);

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP);
    const translateX = interpolate(progress.value, [0, 1], [30, 0], Extrapolation.CLAMP);
    return {
      opacity,
      transform: [{ translateX }, { scale: scale.value }],
    };
  });

  const currentPrice = quote?.currentPrice || holding.avgCost;
  const { pnl, pnlPercent } = calculatePnL(holding.shares, holding.avgCost, currentPrice);
  const isProfit = pnl >= 0;

  const dailyChange = quote?.change || 0;
  const dailyChangePercent = quote?.changePercent || 0;
  const isDailyPositive = dailyChange >= 0;

  const displayValue = holding.shares * currentPrice * (showInTHB ? usdThbRate : 1);
  const displayPnL = pnl * (showInTHB ? usdThbRate : 1);
  const currency = showInTHB ? 'THB' : 'USD';

  // Generate mock sparkline data based on current price and change
  const generateSparklineData = () => {
    const basePrice = currentPrice - dailyChange;
    const points = 12;
    const data: number[] = [];
    for (let i = 0; i < points; i++) {
      const progress = i / (points - 1);
      const noise = (Math.random() - 0.5) * Math.abs(dailyChange) * 0.5;
      const value = basePrice + (dailyChange * progress) + noise;
      data.push(value);
    }
    data[data.length - 1] = currentPrice; // Ensure last point is current price
    return data;
  };

  const sparklineData = generateSparklineData();

  const handlePress = () => {
    router.push(`/stock/${holding.symbol}` as any);
  };

  const handlePressIn = () => {
    scale.value = withTiming(0.98, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
              },
              android: {
                elevation: 3,
              },
              web: {
                boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)',
              },
            }),
          },
          animatedStyle,
        ]}
      >
        {/* Top Row: Symbol, Name, Value */}
        <View style={styles.topRow}>
          <View style={styles.symbolSection}>
            <View style={[styles.symbolBadge, { backgroundColor: colors.primary + '15' }]}>
              <Text style={[styles.symbolText, { color: colors.primary }]}>
                {holding.symbol.substring(0, 2)}
              </Text>
            </View>
            <View style={styles.nameSection}>
              <Text style={[styles.symbol, { color: colors.foreground }]}>{holding.symbol}</Text>
              <Text style={[styles.companyName, { color: colors.foreground, opacity: 0.6 }]} numberOfLines={1}>
                {holding.companyName}
              </Text>
            </View>
          </View>

          <View style={styles.valueSection}>
            <AnimatedCurrency
              value={displayValue}
              currency={currency === 'THB' ? 'THB' : 'USD'}
              style={[styles.value, { color: colors.foreground }]}
            />
            <View style={styles.pnlRow}>
              <Text style={[styles.pnlText, { color: isProfit ? colors.success : colors.error }]}>
                {isProfit ? '+' : ''}{formatCurrency(displayPnL, currency)}
              </Text>
              <View style={[styles.badge, { backgroundColor: isProfit ? colors.success + '15' : colors.error + '15' }]}>
                <Text style={[styles.badgeText, { color: isProfit ? colors.success : colors.error }]}>
                  {formatPercent(pnlPercent)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Middle Row: Sparkline and Today's Change */}
        <View style={styles.middleRow}>
          <View style={styles.sparklineContainer}>
            <Sparkline
              data={sparklineData}
              width={100}
              height={32}
              strokeWidth={1.5}
              color={isDailyPositive ? colors.success : colors.error}
            />
          </View>
          <View style={styles.todaySection}>
            <Text style={[styles.todayLabel, { color: colors.foreground, opacity: 0.6 }]}>Today</Text>
            <Text style={[styles.todayValue, { color: isDailyPositive ? colors.success : colors.error }]}>
              {isDailyPositive ? '+' : ''}{dailyChangePercent.toFixed(2)}%
            </Text>
          </View>
        </View>

        {/* Bottom Row: Stats */}
        <View style={[styles.bottomRow, { borderTopColor: colors.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.foreground, opacity: 0.6 }]}>Shares</Text>
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {holding.shares.toLocaleString('en-US', { maximumFractionDigits: 4 })}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.foreground, opacity: 0.6 }]}>Avg Cost</Text>
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              ${holding.avgCost.toFixed(2)}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.foreground, opacity: 0.6 }]}>Current</Text>
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              ${currentPrice.toFixed(2)}
            </Text>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  symbolSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  symbolBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  symbolText: {
    fontSize: 16,
    fontWeight: '700',
  },
  nameSection: {
    flex: 1,
  },
  symbol: {
    fontSize: 17,
    fontWeight: '700',
  },
  companyName: {
    fontSize: 13,
    marginTop: 2,
  },
  valueSection: {
    alignItems: 'flex-end',
  },
  value: {
    fontSize: 18,
    fontWeight: '600',
  },
  pnlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  pnlText: {
    fontSize: 13,
    fontWeight: '500',
  },
  badge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  middleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sparklineContainer: {
    flex: 1,
  },
  todaySection: {
    alignItems: 'flex-end',
    marginLeft: 16,
  },
  todayLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  todayValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '500',
  },
});
