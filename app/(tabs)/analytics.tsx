import { ScrollView, Text, View, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { ScreenContainer } from '@/components/screen-container';
import { useApp } from '@/context/AppContext';
import { calculatePerformanceStats, formatCurrency, formatPercent } from '@/lib/calculations';
import { useColors } from '@/hooks/use-colors';

export default function AnalyticsScreen() {
  const colors = useColors();
  const { state } = useApp();

  const performanceStats = useMemo(() => {
    return calculatePerformanceStats(state.transactions);
  }, [state.transactions]);

  // Calculate sector allocation
  const sectorAllocation = useMemo(() => {
    const sectors: Record<string, number> = {};
    for (const holding of state.holdings) {
      const quote = state.stockQuotes[holding.symbol];
      const value = holding.shares * (quote?.currentPrice || holding.avgCost);
      const sector = 'Technology'; // Default sector, would need API for real data
      sectors[sector] = (sectors[sector] || 0) + value;
    }
    return sectors;
  }, [state.holdings, state.stockQuotes]);

  // Calculate monthly returns
  const monthlyReturns = useMemo(() => {
    const returns: Record<string, number> = {};
    const sortedTx = [...state.transactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    for (const tx of sortedTx) {
      const month = tx.date.substring(0, 7); // YYYY-MM
      if (tx.type === 'SELL') {
        // Simplified: just track sell amounts as returns
        returns[month] = (returns[month] || 0) + tx.netAmount;
      }
    }
    return returns;
  }, [state.transactions]);

  const StatCard = ({
    title,
    value,
    subtitle,
    color,
  }: {
    title: string;
    value: string;
    subtitle?: string;
    color?: string;
  }) => (
    <View className="bg-surface rounded-xl p-4 border border-border flex-1 mx-1 mb-2">
      <Text className="text-muted text-xs mb-1">{title}</Text>
      <Text style={{ color: color || colors.foreground }} className="text-xl font-bold">
        {value}
      </Text>
      {subtitle && <Text className="text-muted text-xs mt-1">{subtitle}</Text>}
    </View>
  );

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View className="px-5 pt-4 pb-2">
          <Text className="text-foreground text-2xl font-bold">Analytics</Text>
          <Text className="text-muted text-sm">Performance insights</Text>
        </View>

        {/* Performance Summary */}
        <View className="px-4 py-3">
          <Text className="text-foreground text-lg font-semibold mb-3 px-1">
            Trading Performance
          </Text>

          <View className="flex-row flex-wrap">
            <View className="w-1/2">
              <StatCard
                title="Win Rate"
                value={`${performanceStats.winRate.toFixed(1)}%`}
                subtitle={`${performanceStats.winningTrades}W / ${performanceStats.losingTrades}L`}
                color={performanceStats.winRate >= 50 ? colors.success : colors.error}
              />
            </View>
            <View className="w-1/2">
              <StatCard
                title="Profit Factor"
                value={
                  performanceStats.profitFactor === Infinity
                    ? '∞'
                    : performanceStats.profitFactor.toFixed(2)
                }
                subtitle="Gross profit / Gross loss"
                color={performanceStats.profitFactor >= 1 ? colors.success : colors.error}
              />
            </View>
            <View className="w-1/2">
              <StatCard
                title="Average Gain"
                value={formatCurrency(performanceStats.avgGain, 'USD')}
                subtitle="Per winning trade"
                color={colors.success}
              />
            </View>
            <View className="w-1/2">
              <StatCard
                title="Average Loss"
                value={formatCurrency(performanceStats.avgLoss, 'USD')}
                subtitle="Per losing trade"
                color={colors.error}
              />
            </View>
            <View className="w-1/2">
              <StatCard
                title="Largest Win"
                value={formatCurrency(performanceStats.largestWin, 'USD')}
                color={colors.success}
              />
            </View>
            <View className="w-1/2">
              <StatCard
                title="Largest Loss"
                value={formatCurrency(performanceStats.largestLoss, 'USD')}
                color={colors.error}
              />
            </View>
          </View>
        </View>

        {/* Net P&L Summary */}
        <View className="px-5 py-3">
          <View className="bg-surface rounded-xl p-5 border border-border">
            <Text className="text-muted text-sm mb-2">Net Realized P&L</Text>
            <Text
              style={{
                color: performanceStats.netPnL >= 0 ? colors.success : colors.error,
              }}
              className="text-3xl font-bold"
            >
              {formatCurrency(performanceStats.netPnL, 'USD')}
            </Text>
            <View className="flex-row mt-4 pt-4 border-t border-border">
              <View className="flex-1">
                <Text className="text-muted text-xs">Total Profit</Text>
                <Text className="text-success text-lg font-semibold">
                  {formatCurrency(performanceStats.totalProfit, 'USD')}
                </Text>
              </View>
              <View className="flex-1 items-end">
                <Text className="text-muted text-xs">Total Loss</Text>
                <Text className="text-error text-lg font-semibold">
                  {formatCurrency(performanceStats.totalLoss, 'USD')}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Portfolio Breakdown */}
        <View className="px-5 py-3">
          <Text className="text-foreground text-lg font-semibold mb-3">Portfolio Breakdown</Text>

          <View className="bg-surface rounded-xl p-4 border border-border">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-muted text-sm">Total Holdings</Text>
              <Text className="text-foreground font-semibold">{state.holdings.length} stocks</Text>
            </View>
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-muted text-sm">Total Portfolios</Text>
              <Text className="text-foreground font-semibold">{state.portfolios.length}</Text>
            </View>
            <View className="flex-row justify-between items-center">
              <Text className="text-muted text-sm">Total Transactions</Text>
              <Text className="text-foreground font-semibold">{state.transactions.length}</Text>
            </View>
          </View>
        </View>

        {/* Top Holdings */}
        {state.holdings.length > 0 && (
          <View className="px-5 py-3">
            <Text className="text-foreground text-lg font-semibold mb-3">Top Holdings by Value</Text>

            <View className="bg-surface rounded-xl border border-border overflow-hidden">
              {state.holdings
                .map((h) => ({
                  ...h,
                  value: h.shares * (state.stockQuotes[h.symbol]?.currentPrice || h.avgCost),
                }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 5)
                .map((holding, index) => (
                  <View
                    key={holding.id}
                    className={`flex-row justify-between items-center p-4 ${index > 0 ? 'border-t border-border' : ''}`}
                  >
                    <View className="flex-row items-center flex-1">
                      <View
                        style={[styles.rankBadge, { backgroundColor: colors.tint + '20' }]}
                        className="mr-3"
                      >
                        <Text style={{ color: colors.tint }} className="text-xs font-bold">
                          #{index + 1}
                        </Text>
                      </View>
                      <View>
                        <Text className="text-foreground font-semibold">{holding.symbol}</Text>
                        <Text className="text-muted text-xs">{holding.shares.toFixed(2)} shares</Text>
                      </View>
                    </View>
                    <Text className="text-foreground font-semibold">
                      {formatCurrency(holding.value, 'USD')}
                    </Text>
                  </View>
                ))}
            </View>
          </View>
        )}

        {/* Empty State */}
        {state.transactions.length === 0 && (
          <View className="px-5 py-3">
            <View className="bg-surface rounded-xl p-6 items-center border border-border">
              <Text className="text-muted text-center mb-2">No trading data yet</Text>
              <Text className="text-muted text-center text-sm">
                Add transactions to see your performance analytics
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
