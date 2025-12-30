import { ScrollView, Text, View, StyleSheet, RefreshControl } from 'react-native';
import { useMemo, useState, useCallback } from 'react';
import { ScreenContainer } from '@/components/screen-container';
import { useApp } from '@/context/AppContext';
import { useStockQuotes } from '@/hooks/useStockQuotes';
import { formatCurrency, formatPercent } from '@/lib/calculations';
import {
  calculateTradingPerformance,
  calculateMonthlyPerformance,
  calculateSymbolPerformance,
  type CompletedTrade,
} from '@/lib/trading-performance';
import { useColors } from '@/hooks/use-colors';

export default function AnalyticsScreen() {
  const colors = useColors();
  const { state, refreshData } = useApp();
  const { quotes, refresh: refreshQuotes } = useStockQuotes();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshData(), refreshQuotes()]);
    setRefreshing(false);
  }, [refreshData, refreshQuotes]);

  // Calculate comprehensive trading performance
  const performance = useMemo(() => {
    return calculateTradingPerformance(state.transactions, state.holdings, quotes);
  }, [state.transactions, state.holdings, quotes]);

  // Calculate monthly breakdown
  const monthlyPerf = useMemo(() => {
    return calculateMonthlyPerformance(performance.completedTrades);
  }, [performance.completedTrades]);

  // Calculate symbol breakdown
  const symbolPerf = useMemo(() => {
    return calculateSymbolPerformance(performance.completedTrades);
  }, [performance.completedTrades]);

  // Get sorted months (most recent first)
  const sortedMonths = useMemo(() => {
    return Object.keys(monthlyPerf).sort().reverse();
  }, [monthlyPerf]);

  // Get top performing symbols
  const topSymbols = useMemo(() => {
    return Object.entries(symbolPerf)
      .sort((a, b) => b[1].pnl - a[1].pnl)
      .slice(0, 5);
  }, [symbolPerf]);

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

  const TradeRow = ({ trade }: { trade: CompletedTrade }) => (
    <View className="flex-row justify-between items-center p-3 border-b border-border">
      <View className="flex-1">
        <View className="flex-row items-center">
          <Text className="text-foreground font-semibold">{trade.symbol}</Text>
          <View
            style={[
              styles.badge,
              { backgroundColor: trade.isWin ? colors.success + '20' : colors.error + '20' },
            ]}
          >
            <Text
              style={{ color: trade.isWin ? colors.success : colors.error }}
              className="text-xs font-medium"
            >
              {trade.isWin ? 'WIN' : 'LOSS'}
            </Text>
          </View>
        </View>
        <Text className="text-muted text-xs">
          {trade.shares.toFixed(2)} shares • {trade.holdingDays} days
        </Text>
        <Text className="text-muted text-xs">
          Buy: ${trade.buyPrice.toFixed(2)} → Sell: ${trade.sellPrice.toFixed(2)}
        </Text>
      </View>
      <View className="items-end">
        <Text
          style={{ color: trade.realizedPnL >= 0 ? colors.success : colors.error }}
          className="font-semibold"
        >
          {formatCurrency(trade.realizedPnL, 'USD')}
        </Text>
        <Text
          style={{ color: trade.realizedPnL >= 0 ? colors.success : colors.error }}
          className="text-xs"
        >
          {formatPercent(trade.realizedPnLPercent)}
        </Text>
      </View>
    </View>
  );

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
      >
        {/* Header */}
        <View className="px-5 pt-4 pb-2">
          <Text className="text-foreground text-2xl font-bold">Analytics</Text>
          <Text className="text-muted text-sm">Trading Performance Insights</Text>
        </View>

        {/* Net P&L Summary */}
        <View className="px-5 py-3">
          <View className="bg-surface rounded-xl p-5 border border-border">
            <Text className="text-muted text-sm mb-2">Total P&L</Text>
            <Text
              style={{
                color: performance.totalPnL >= 0 ? colors.success : colors.error,
              }}
              className="text-3xl font-bold"
            >
              {formatCurrency(performance.totalPnL, 'USD')}
            </Text>
            <View className="flex-row mt-4 pt-4 border-t border-border">
              <View className="flex-1">
                <Text className="text-muted text-xs">Realized P&L</Text>
                <Text
                  style={{ color: performance.netRealizedPnL >= 0 ? colors.success : colors.error }}
                  className="text-lg font-semibold"
                >
                  {formatCurrency(performance.netRealizedPnL, 'USD')}
                </Text>
              </View>
              <View className="flex-1 items-end">
                <Text className="text-muted text-xs">Unrealized P&L</Text>
                <Text
                  style={{ color: performance.netUnrealizedPnL >= 0 ? colors.success : colors.error }}
                  className="text-lg font-semibold"
                >
                  {formatCurrency(performance.netUnrealizedPnL, 'USD')}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Trading Performance Stats */}
        <View className="px-4 py-3">
          <Text className="text-foreground text-lg font-semibold mb-3 px-1">
            Trading Performance
          </Text>

          <View className="flex-row flex-wrap">
            <View className="w-1/2">
              <StatCard
                title="Win Rate"
                value={`${performance.winRate.toFixed(1)}%`}
                subtitle={`${performance.winningTrades}W / ${performance.losingTrades}L`}
                color={performance.winRate >= 50 ? colors.success : colors.error}
              />
            </View>
            <View className="w-1/2">
              <StatCard
                title="Profit Factor"
                value={
                  performance.profitFactor === Infinity
                    ? '∞'
                    : performance.profitFactor.toFixed(2)
                }
                subtitle="Gross profit / Gross loss"
                color={performance.profitFactor >= 1 ? colors.success : colors.error}
              />
            </View>
            <View className="w-1/2">
              <StatCard
                title="Average Gain"
                value={formatCurrency(performance.avgGain, 'USD')}
                subtitle="Per winning trade"
                color={colors.success}
              />
            </View>
            <View className="w-1/2">
              <StatCard
                title="Average Loss"
                value={formatCurrency(performance.avgLoss, 'USD')}
                subtitle="Per losing trade"
                color={colors.error}
              />
            </View>
            <View className="w-1/2">
              <StatCard
                title="Largest Win"
                value={formatCurrency(performance.largestWin, 'USD')}
                color={colors.success}
              />
            </View>
            <View className="w-1/2">
              <StatCard
                title="Largest Loss"
                value={formatCurrency(performance.largestLoss, 'USD')}
                color={colors.error}
              />
            </View>
          </View>
        </View>

        {/* Advanced Metrics */}
        <View className="px-5 py-3">
          <Text className="text-foreground text-lg font-semibold mb-3">Advanced Metrics</Text>
          <View className="bg-surface rounded-xl border border-border overflow-hidden">
            <View className="flex-row justify-between p-4 border-b border-border">
              <Text className="text-muted">Total Trades</Text>
              <Text className="text-foreground font-semibold">{performance.totalTrades}</Text>
            </View>
            <View className="flex-row justify-between p-4 border-b border-border">
              <Text className="text-muted">Risk/Reward Ratio</Text>
              <Text className="text-foreground font-semibold">
                {performance.riskRewardRatio === Infinity
                  ? '∞'
                  : `1:${performance.riskRewardRatio.toFixed(2)}`}
              </Text>
            </View>
            <View className="flex-row justify-between p-4 border-b border-border">
              <Text className="text-muted">Expectancy</Text>
              <Text
                style={{ color: performance.expectancy >= 0 ? colors.success : colors.error }}
                className="font-semibold"
              >
                {formatCurrency(performance.expectancy, 'USD')}
              </Text>
            </View>
            <View className="flex-row justify-between p-4 border-b border-border">
              <Text className="text-muted">Avg Holding Period</Text>
              <Text className="text-foreground font-semibold">
                {performance.avgHoldingDays.toFixed(0)} days
              </Text>
            </View>
            <View className="flex-row justify-between p-4 border-b border-border">
              <Text className="text-muted">Max Consecutive Wins</Text>
              <Text className="text-success font-semibold">{performance.maxConsecutiveWins}</Text>
            </View>
            <View className="flex-row justify-between p-4">
              <Text className="text-muted">Max Consecutive Losses</Text>
              <Text className="text-error font-semibold">{performance.maxConsecutiveLosses}</Text>
            </View>
          </View>
        </View>

        {/* Monthly Performance */}
        {sortedMonths.length > 0 && (
          <View className="px-5 py-3">
            <Text className="text-foreground text-lg font-semibold mb-3">Monthly Performance</Text>
            <View className="bg-surface rounded-xl border border-border overflow-hidden">
              {sortedMonths.slice(0, 6).map((month, index) => {
                const data = monthlyPerf[month];
                return (
                  <View
                    key={month}
                    className={`flex-row justify-between items-center p-4 ${index > 0 ? 'border-t border-border' : ''}`}
                  >
                    <View>
                      <Text className="text-foreground font-medium">
                        {new Date(month + '-01').toLocaleDateString('en-US', {
                          month: 'short',
                          year: 'numeric',
                        })}
                      </Text>
                      <Text className="text-muted text-xs">
                        {data.trades} trades • {data.winRate.toFixed(0)}% win rate
                      </Text>
                    </View>
                    <Text
                      style={{ color: data.pnl >= 0 ? colors.success : colors.error }}
                      className="font-semibold"
                    >
                      {formatCurrency(data.pnl, 'USD')}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Top Performing Symbols */}
        {topSymbols.length > 0 && (
          <View className="px-5 py-3">
            <Text className="text-foreground text-lg font-semibold mb-3">Performance by Symbol</Text>
            <View className="bg-surface rounded-xl border border-border overflow-hidden">
              {topSymbols.map(([symbol, data], index) => (
                <View
                  key={symbol}
                  className={`flex-row justify-between items-center p-4 ${index > 0 ? 'border-t border-border' : ''}`}
                >
                  <View className="flex-row items-center">
                    <View
                      style={[
                        styles.rankBadge,
                        { backgroundColor: data.pnl >= 0 ? colors.success + '20' : colors.error + '20' },
                      ]}
                    >
                      <Text
                        style={{ color: data.pnl >= 0 ? colors.success : colors.error }}
                        className="text-xs font-bold"
                      >
                        #{index + 1}
                      </Text>
                    </View>
                    <View className="ml-3">
                      <Text className="text-foreground font-semibold">{symbol}</Text>
                      <Text className="text-muted text-xs">
                        {data.trades} trades • {data.winRate.toFixed(0)}% win rate
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={{ color: data.pnl >= 0 ? colors.success : colors.error }}
                    className="font-semibold"
                  >
                    {formatCurrency(data.pnl, 'USD')}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Open Positions */}
        {performance.openPositions.length > 0 && (
          <View className="px-5 py-3">
            <Text className="text-foreground text-lg font-semibold mb-3">Open Positions</Text>
            <View className="bg-surface rounded-xl border border-border overflow-hidden">
              {performance.openPositions.map((position, index) => (
                <View
                  key={position.symbol}
                  className={`p-4 ${index > 0 ? 'border-t border-border' : ''}`}
                >
                  <View className="flex-row justify-between items-start">
                    <View>
                      <Text className="text-foreground font-semibold">{position.symbol}</Text>
                      <Text className="text-muted text-xs">
                        {position.shares.toFixed(2)} shares @ ${position.avgCost.toFixed(2)}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text
                        style={{ color: position.unrealizedPnL >= 0 ? colors.success : colors.error }}
                        className="font-semibold"
                      >
                        {formatCurrency(position.unrealizedPnL, 'USD')}
                      </Text>
                      <Text
                        style={{ color: position.unrealizedPnL >= 0 ? colors.success : colors.error }}
                        className="text-xs"
                      >
                        {formatPercent(position.unrealizedPnLPercent)}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row justify-between mt-2 pt-2 border-t border-border">
                    <Text className="text-muted text-xs">
                      Cost: {formatCurrency(position.totalCost, 'USD')}
                    </Text>
                    <Text className="text-muted text-xs">
                      Value: {formatCurrency(position.currentValue, 'USD')}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Recent Completed Trades */}
        {performance.completedTrades.length > 0 && (
          <View className="px-5 py-3">
            <Text className="text-foreground text-lg font-semibold mb-3">Recent Trades</Text>
            <View className="bg-surface rounded-xl border border-border overflow-hidden">
              {performance.completedTrades.slice(0, 10).map((trade) => (
                <TradeRow key={trade.id} trade={trade} />
              ))}
            </View>
          </View>
        )}

        {/* Portfolio Breakdown */}
        <View className="px-5 py-3">
          <Text className="text-foreground text-lg font-semibold mb-3">Portfolio Summary</Text>
          <View className="bg-surface rounded-xl p-4 border border-border">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-muted text-sm">Total Holdings</Text>
              <Text className="text-foreground font-semibold">{state.holdings.length} stocks</Text>
            </View>
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-muted text-sm">Total Portfolios</Text>
              <Text className="text-foreground font-semibold">{state.portfolios.length}</Text>
            </View>
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-muted text-sm">Total Transactions</Text>
              <Text className="text-foreground font-semibold">{state.transactions.length}</Text>
            </View>
            <View className="flex-row justify-between items-center">
              <Text className="text-muted text-sm">Completed Trades</Text>
              <Text className="text-foreground font-semibold">{performance.totalTrades}</Text>
            </View>
          </View>
        </View>

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
  badge: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
});
