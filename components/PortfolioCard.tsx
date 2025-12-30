import { View, Text, StyleSheet } from 'react-native';
import { formatCurrency, formatPercent } from '@/lib/calculations';
import { useColors } from '@/hooks/use-colors';

interface PortfolioCardProps {
  totalValue: number;
  totalCost: number;
  totalPnL: number;
  totalPnLPercent: number;
  dailyChange: number;
  dailyChangePercent: number;
  showInTHB?: boolean;
  usdThbRate?: number;
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
}: PortfolioCardProps) {
  const colors = useColors();
  const isProfit = totalPnL >= 0;
  const isDailyPositive = dailyChange >= 0;

  const displayValue = showInTHB ? totalValue * usdThbRate : totalValue;
  const displayPnL = showInTHB ? totalPnL * usdThbRate : totalPnL;
  const displayDailyChange = showInTHB ? dailyChange * usdThbRate : dailyChange;
  const currency = showInTHB ? 'THB' : 'USD';

  return (
    <View className="bg-surface rounded-2xl p-5 border border-border">
      <Text className="text-muted text-sm mb-1">Total Portfolio Value</Text>
      <Text className="text-foreground text-3xl font-bold mb-3">
        {formatCurrency(displayValue, currency)}
      </Text>

      <View className="flex-row justify-between mb-4">
        <View className="flex-1">
          <Text className="text-muted text-xs mb-1">Total P&L</Text>
          <View className="flex-row items-center">
            <Text
              style={{ color: isProfit ? colors.success : colors.error }}
              className="text-lg font-semibold"
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
                {formatPercent(totalPnLPercent)}
              </Text>
            </View>
          </View>
        </View>

        <View className="flex-1 items-end">
          <Text className="text-muted text-xs mb-1">Today</Text>
          <View className="flex-row items-center">
            <Text
              style={{ color: isDailyPositive ? colors.success : colors.error }}
              className="text-lg font-semibold"
            >
              {formatCurrency(displayDailyChange, currency)}
            </Text>
            <View
              style={[
                styles.badge,
                { backgroundColor: isDailyPositive ? colors.success + '20' : colors.error + '20' },
              ]}
            >
              <Text
                style={{ color: isDailyPositive ? colors.success : colors.error }}
                className="text-xs font-medium"
              >
                {formatPercent(dailyChangePercent)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View className="flex-row justify-between pt-3 border-t border-border">
        <View>
          <Text className="text-muted text-xs">Cost Basis</Text>
          <Text className="text-foreground text-sm font-medium">
            {formatCurrency(showInTHB ? totalCost * usdThbRate : totalCost, currency)}
          </Text>
        </View>
        {showInTHB && (
          <View className="items-end">
            <Text className="text-muted text-xs">USD/THB Rate</Text>
            <Text className="text-foreground text-sm font-medium">฿{usdThbRate.toFixed(2)}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
});
