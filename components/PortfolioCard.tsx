import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { formatCurrency, formatPercent } from '@/lib/calculations';
import { useColors } from '@/hooks/use-colors';
import { AnimatedCurrency, AnimatedPercent } from './ui/AnimatedNumber';
import { SegmentedProgressBar } from './ui/ProgressBar';
import type { PortfolioCurrencyAnalysis } from '@/types';

interface PortfolioCardProps {
  totalValue: number;
  totalCost: number;
  totalPnL: number;
  totalPnLPercent: number;
  dailyChange: number;
  dailyChangePercent: number;
  showInTHB?: boolean;
  usdThbRate?: number;
  currencyAnalysis?: PortfolioCurrencyAnalysis | null;
}

export function PortfolioCard({
  totalValue,
  totalCost,
  totalPnL,
  totalPnLPercent,
  dailyChange,
  dailyChangePercent,
  showInTHB = false,
  usdThbRate = 35,
  currencyAnalysis,
}: PortfolioCardProps) {
  const colors = useColors();
  const [showBreakdown, setShowBreakdown] = useState(false);
  
  // Animation values
  const cardProgress = useSharedValue(0);
  const cardScale = useSharedValue(0.95);

  useEffect(() => {
    cardProgress.value = withDelay(100, withTiming(1, { duration: 400 }));
    cardScale.value = withDelay(100, withSpring(1, { damping: 15, stiffness: 150 }));
  }, []);

  const cardAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(cardProgress.value, [0, 1], [0, 1], Extrapolation.CLAMP);
    const translateY = interpolate(cardProgress.value, [0, 1], [20, 0], Extrapolation.CLAMP);
    return {
      opacity,
      transform: [{ translateY }, { scale: cardScale.value }],
    };
  });
  
  const isProfit = totalPnL >= 0;
  const isDailyPositive = dailyChange >= 0;

  const displayValue = showInTHB ? totalValue * usdThbRate : totalValue;
  const displayPnL = showInTHB ? totalPnL * usdThbRate : totalPnL;
  const displayDailyChange = showInTHB ? dailyChange * usdThbRate : dailyChange;
  const currency = showInTHB ? 'THB' : 'USD';

  // Currency P&L breakdown
  const hasBreakdown = currencyAnalysis && showInTHB;
  const stockPnLThb = currencyAnalysis?.totalStockPnLThb || 0;
  const currencyPnLThb = currencyAnalysis?.totalCurrencyPnLThb || 0;
  const isStockProfit = stockPnLThb >= 0;
  const isCurrencyProfit = currencyPnLThb >= 0;

  return (
    <Animated.View 
      style={[
        styles.card,
        { 
          backgroundColor: colors.surface,
          borderColor: colors.border,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.08,
              shadowRadius: 16,
            },
            android: {
              elevation: 8,
            },
            web: {
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
            },
          }),
        },
        cardAnimatedStyle,
      ]}
    >
      {/* Header Label */}
      <Text style={[styles.label, { color: colors.foreground, opacity: 0.7 }]}>Total Portfolio Value</Text>
      
      {/* Main Value with Animation */}
      <View style={styles.valueContainer}>
        <AnimatedCurrency
          value={displayValue}
          currency={currency === 'THB' ? 'THB' : 'USD'}
          style={[styles.mainValue, { color: colors.foreground }]}
          duration={800}
        />
        {showInTHB && (
          <Text style={[styles.subValue, { color: colors.muted }]}>
            ({formatCurrency(totalValue, 'USD')})
          </Text>
        )}
      </View>

      {/* P&L Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.foreground, opacity: 0.7 }]}>Total P&L</Text>
          <View style={styles.statValueRow}>
            <AnimatedCurrency
              value={displayPnL}
              currency={currency === 'THB' ? 'THB' : 'USD'}
              showSign
              style={[styles.statValue, { color: isProfit ? colors.success : colors.error }]}
            />
            <View
              style={[
                styles.badge,
                { backgroundColor: isProfit ? colors.success + '20' : colors.error + '20' },
              ]}
            >
              <AnimatedPercent
                value={totalPnLPercent}
                style={[styles.badgeText, { color: isProfit ? colors.success : colors.error }]}
              />
            </View>
          </View>
        </View>

        <View style={[styles.statItem, styles.statItemRight]}>
          <Text style={[styles.statLabel, { color: colors.foreground, opacity: 0.7 }]}>Today</Text>
          <View style={styles.statValueRow}>
            <AnimatedCurrency
              value={displayDailyChange}
              currency={currency === 'THB' ? 'THB' : 'USD'}
              showSign
              style={[styles.statValue, { color: isDailyPositive ? colors.success : colors.error }]}
            />
            <View
              style={[
                styles.badge,
                { backgroundColor: isDailyPositive ? colors.success + '20' : colors.error + '20' },
              ]}
            >
              <AnimatedPercent
                value={dailyChangePercent}
                style={[styles.badgeText, { color: isDailyPositive ? colors.success : colors.error }]}
              />
            </View>
          </View>
        </View>
      </View>

      {/* Currency P&L Breakdown Toggle */}
      {hasBreakdown && (
        <TouchableOpacity
          onPress={() => setShowBreakdown(!showBreakdown)}
          style={[styles.breakdownToggle, { borderTopColor: colors.border }]}
        >
          <Text style={[styles.toggleText, { color: colors.primary }]}>
            {showBreakdown ? 'Hide P&L Breakdown' : 'Show P&L Breakdown'}
          </Text>
          <Text style={[styles.toggleIcon, { color: colors.muted }]}>
            {showBreakdown ? '▲' : '▼'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Currency P&L Breakdown Details */}
      {hasBreakdown && showBreakdown && currencyAnalysis && (
        <View style={[styles.breakdownSection, { borderTopColor: colors.border }]}>
          {/* Stock P&L */}
          <View style={styles.breakdownRow}>
            <View style={styles.breakdownLabel}>
              <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.breakdownLabelText, { color: colors.muted }]}>Stock P&L</Text>
            </View>
            <View style={styles.breakdownValue}>
              <Text
                style={[
                  styles.breakdownValueText,
                  { color: isStockProfit ? colors.success : colors.error },
                ]}
              >
                ฿{Math.abs(stockPnLThb).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                {stockPnLThb >= 0 ? '' : ' (Loss)'}
              </Text>
              <Text style={[styles.breakdownPercent, { color: colors.muted }]}>
                {formatPercent(currencyAnalysis.totalStockPnLPercent)}
              </Text>
            </View>
          </View>

          {/* Currency P&L */}
          <View style={styles.breakdownRow}>
            <View style={styles.breakdownLabel}>
              <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
              <Text style={[styles.breakdownLabelText, { color: colors.muted }]}>Currency P&L</Text>
            </View>
            <View style={styles.breakdownValue}>
              <Text
                style={[
                  styles.breakdownValueText,
                  { color: isCurrencyProfit ? colors.success : colors.error },
                ]}
              >
                {isCurrencyProfit ? '+' : '-'}฿{Math.abs(currencyPnLThb).toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </Text>
              <Text style={[styles.breakdownPercent, { color: colors.muted }]}>
                {formatPercent(currencyAnalysis.totalCurrencyPnLPercent)}
              </Text>
            </View>
          </View>

          {/* Animated Progress Bar */}
          <View style={styles.progressBarContainer}>
            <SegmentedProgressBar
              segments={[
                { value: Math.abs(stockPnLThb), color: colors.primary },
                { value: Math.abs(currencyPnLThb), color: colors.warning },
              ]}
              height={10}
            />
            <View style={styles.progressLabels}>
              <Text style={[styles.progressLabel, { color: colors.muted }]}>Stock</Text>
              <Text style={[styles.progressLabel, { color: colors.muted }]}>Currency</Text>
            </View>
          </View>
        </View>
      )}

      {/* Footer */}
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <View style={styles.footerItem}>
          <Text style={[styles.footerLabel, { color: colors.foreground, opacity: 0.7 }]}>Cost Basis</Text>
          <Text style={[styles.footerValue, { color: colors.foreground }]}>
            {formatCurrency(showInTHB ? totalCost * usdThbRate : totalCost, currency)}
          </Text>
        </View>
        <View style={[styles.footerItem, styles.footerItemRight]}>
          <Text style={[styles.footerLabel, { color: colors.foreground, opacity: 0.7 }]}>USD/THB Rate</Text>
          <Text style={[styles.footerValue, { color: colors.foreground }]}>฿{usdThbRate.toFixed(2)}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    marginHorizontal: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  mainValue: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -1,
  },
  subValue: {
    fontSize: 14,
    marginLeft: 8,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
  },
  statItemRight: {
    alignItems: 'flex-end',
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 17,
    fontWeight: '600',
  },
  badge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  breakdownToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
  },
  toggleIcon: {
    fontSize: 12,
  },
  breakdownSection: {
    paddingTop: 12,
    borderTopWidth: 1,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  breakdownLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  breakdownLabelText: {
    fontSize: 14,
  },
  breakdownValue: {
    alignItems: 'flex-end',
  },
  breakdownValueText: {
    fontSize: 14,
    fontWeight: '600',
  },
  breakdownPercent: {
    fontSize: 12,
    marginTop: 2,
  },
  progressBarContainer: {
    marginTop: 8,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  progressLabel: {
    fontSize: 11,
  },
  footer: {
    flexDirection: 'row',
    paddingTop: 16,
    borderTopWidth: 1,
    marginTop: 4,
  },
  footerItem: {
    flex: 1,
  },
  footerItemRight: {
    alignItems: 'flex-end',
  },
  footerLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  footerValue: {
    fontSize: 15,
    fontWeight: '600',
  },
});
