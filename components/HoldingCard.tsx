import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { formatCurrency, formatPercent, calculatePnL } from '@/lib/calculations';
import { useColors } from '@/hooks/use-colors';
import type { Holding, StockQuote } from '@/types';

interface HoldingCardProps {
  holding: Holding;
  quote?: StockQuote;
  showInTHB?: boolean;
  usdThbRate?: number;
}

export function HoldingCard({ holding, quote, showInTHB = false, usdThbRate = 35 }: HoldingCardProps) {
  const colors = useColors();
  const router = useRouter();

  const currentPrice = quote?.currentPrice || holding.avgCost;
  const { pnl, pnlPercent } = calculatePnL(holding.shares, holding.avgCost, currentPrice);
  const isProfit = pnl >= 0;

  const dailyChange = quote?.change || 0;
  const dailyChangePercent = quote?.changePercent || 0;
  const isDailyPositive = dailyChange >= 0;

  const displayValue = holding.shares * currentPrice * (showInTHB ? usdThbRate : 1);
  const displayPnL = pnl * (showInTHB ? usdThbRate : 1);
  const currency = showInTHB ? 'THB' : 'USD';

  const handlePress = () => {
    router.push(`/stock/${holding.symbol}` as any);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      style={styles.container}
      className="bg-surface rounded-xl p-4 border border-border mb-3"
    >
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1">
          <Text className="text-foreground text-lg font-bold">{holding.symbol}</Text>
          <Text className="text-muted text-xs" numberOfLines={1}>
            {holding.companyName}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-foreground text-lg font-semibold">
            {formatCurrency(displayValue, currency)}
          </Text>
          <View className="flex-row items-center">
            <Text
              style={{ color: isProfit ? colors.success : colors.error }}
              className="text-sm font-medium"
            >
              {formatCurrency(displayPnL, currency)}
            </Text>
            <View
              style={[
                styles.badge,
                { backgroundColor: isProfit ? colors.success + '20' : colors.error + '20' },
              ]}
            >
              <Text
                style={{ color: isProfit ? colors.success : colors.error }}
                className="text-xs font-medium"
              >
                {formatPercent(pnlPercent)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View className="flex-row justify-between items-center pt-2 border-t border-border">
        <View className="flex-row items-center">
          <View className="mr-4">
            <Text className="text-muted text-xs">Shares</Text>
            <Text className="text-foreground text-sm font-medium">
              {holding.shares.toLocaleString('en-US', { maximumFractionDigits: 5 })}
            </Text>
          </View>
          <View className="mr-4">
            <Text className="text-muted text-xs">Avg Cost</Text>
            <Text className="text-foreground text-sm font-medium">
              ${holding.avgCost.toFixed(2)}
            </Text>
          </View>
          <View>
            <Text className="text-muted text-xs">Current</Text>
            <Text className="text-foreground text-sm font-medium">${currentPrice.toFixed(2)}</Text>
          </View>
        </View>

        <View className="items-end">
          <Text className="text-muted text-xs">Today</Text>
          <Text
            style={{ color: isDailyPositive ? colors.success : colors.error }}
            className="text-sm font-medium"
          >
            {formatPercent(dailyChangePercent)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  badge: {
    marginLeft: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
});
