import { ScrollView, Text, View, RefreshControl, StyleSheet } from 'react-native';
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
import {
  calculatePortfolioCurrencyPnL,
  calculateRealizedCurrencyPnL,
  calculateRealizedCurrencyPnLSummary,
} from '@/lib/currency-pnl';
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

  // Calculate currency P&L analysis
  const currencyAnalysis = useMemo(() => {
    if (state.holdings.length === 0) return null;
    return calculatePortfolioCurrencyPnL(
      state.holdings,
      quotes,
      state.currencyRate.usdThb
    );
  }, [state.holdings, quotes, state.currencyRate.usdThb]);

  // Calculate realized currency P&L
  const realizedCurrencyPnL = useMemo(() => {
    return calculateRealizedCurrencyPnL(state.transactions);
  }, [state.transactions]);

  const realizedCurrencySummary = useMemo(() => {
    return calculateRealizedCurrencyPnLSummary(realizedCurrencyPnL);
  }, [realizedCurrencyPnL]);

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

        {/* Currency P&L Analysis Section */}
        {currencyAnalysis && state.settings.showInTHB && (
          <View className="px-5 py-3">
            <Text className="text-foreground text-lg font-semibold mb-3">
              Currency P&L Analysis (THB)
            </Text>
            <View className="bg-surface rounded-xl p-5 border border-border">
              {/* Total P&L in THB */}
              <View className="mb-4">
                <Text className="text-muted text-sm mb-1">Total P&L (THB)</Text>
                <Text
                  style={{ color: currencyAnalysis.totalPnLThb >= 0 ? colors.success : colors.error }}
                  className="text-2xl font-bold"
                >
                  ฿{Math.abs(currencyAnalysis.totalPnLThb).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  {currencyAnalysis.totalPnLThb < 0 ? ' (Loss)' : ''}
                </Text>
              </View>

              {/* Breakdown */}
              <View className="pt-4 border-t border-border">
                <Text className="text-muted text-xs mb-3">P&L Breakdown</Text>
                
                {/* Stock P&L */}
                <View className="flex-row justify-between items-center mb-3">
                  <View className="flex-row items-center">
                    <View className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: colors.primary }} />
                    <Text className="text-foreground">Stock P&L</Text>
                  </View>
                  <View className="items-end">
                    <Text
                      style={{ color: currencyAnalysis.totalStockPnLThb >= 0 ? colors.success : colors.error }}
                      className="font-semibold"
                    >
                      ฿{Math.abs(currencyAnalysis.totalStockPnLThb).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      {currencyAnalysis.totalStockPnLThb < 0 ? ' (Loss)' : ''}
                    </Text>
                    <Text className="text-muted text-xs">
                      {formatPercent(currencyAnalysis.totalStockPnLPercent)}
                    </Text>
                  </View>
                </View>

                {/* Currency P&L */}
                <View className="flex-row justify-between items-center mb-3">
                  <View className="flex-row items-center">
                    <View className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: colors.warning }} />
                    <Text className="text-foreground">Currency P&L</Text>
                  </View>
                  <View className="items-end">
                    <Text
                      style={{ color: currencyAnalysis.totalCurrencyPnLThb >= 0 ? colors.success : colors.error }}
                      className="font-semibold"
                    >
                      {currencyAnalysis.totalCurrencyPnLThb >= 0 ? '+' : '-'}฿{Math.abs(currencyAnalysis.totalCurrencyPnLThb).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </Text>
                    <Text className="text-muted text-xs">
                      {formatPercent(currencyAnalysis.totalCurrencyPnLPercent)}
                    </Text>
                  </View>
                </View>

                {/* Contribution Bar */}
                <View className="mt-2">
                  <View className="flex-row h-3 rounded-full overflow-hidden bg-border">
                    {(() => {
                      const totalAbs = Math.abs(currencyAnalysis.totalStockPnLThb) + Math.abs(currencyAnalysis.totalCurrencyPnLThb);
                      const stockPercent = totalAbs > 0 ? (Math.abs(currencyAnalysis.totalStockPnLThb) / totalAbs) * 100 : 50;
                      return (
                        <>
                          <View style={{ width: `${stockPercent}%`, backgroundColor: colors.primary }} />
                          <View style={{ width: `${100 - stockPercent}%`, backgroundColor: colors.warning }} />
                        </>
                      );
                    })()}
                  </View>
                  <View className="flex-row justify-between mt-1">
                    <Text className="text-muted text-xs">Stock</Text>
                    <Text className="text-muted text-xs">Currency</Text>
                  </View>
                </View>
              </View>

              {/* Exchange Rate Info */}
              <View className="mt-4 pt-4 border-t border-border">
                <View className="flex-row justify-between">
                  <Text className="text-muted text-sm">Current Rate</Text>
                  <Text className="text-foreground font-semibold">
                    1 USD = ฿{currencyAnalysis.currentRate.toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Realized Currency P&L Summary */}
        {realizedCurrencySummary.tradeCount > 0 && state.settings.showInTHB && (
          <View className="px-5 py-3">
            <Text className="text-foreground text-lg font-semibold mb-3">
              Realized Currency P&L
            </Text>
            <View className="bg-surface rounded-xl border border-border overflow-hidden">
              <View className="flex-row justify-between p-4 border-b border-border">
                <Text className="text-muted">Total Stock P&L (THB)</Text>
                <Text
                  style={{ color: realizedCurrencySummary.totalStockPnLThb >= 0 ? colors.success : colors.error }}
                  className="font-semibold"
                >
                  ฿{Math.abs(realizedCurrencySummary.totalStockPnLThb).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </Text>
              </View>
              <View className="flex-row justify-between p-4 border-b border-border">
                <Text className="text-muted">Total Currency P&L (THB)</Text>
                <Text
                  style={{ color: realizedCurrencySummary.totalCurrencyPnLThb >= 0 ? colors.success : colors.error }}
                  className="font-semibold"
                >
                  {realizedCurrencySummary.totalCurrencyPnLThb >= 0 ? '+' : '-'}฿{Math.abs(realizedCurrencySummary.totalCurrencyPnLThb).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </Text>
              </View>
              <View className="flex-row justify-between p-4 border-b border-border">
                <Text className="text-muted">Combined P&L (THB)</Text>
                <Text
                  style={{ color: realizedCurrencySummary.totalPnLThb >= 0 ? colors.success : colors.error }}
                  className="font-semibold"
                >
                  ฿{Math.abs(realizedCurrencySummary.totalPnLThb).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </Text>
              </View>
              <View className="flex-row justify-between p-4">
                <Text className="text-muted">Completed Trades</Text>
                <Text className="text-foreground font-semibold">{realizedCurrencySummary.tradeCount}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Per-Holding Currency Analysis */}
        {currencyAnalysis && currencyAnalysis.holdings.length > 0 && state.settings.showInTHB && (
          <View className="px-5 py-3">
            <Text className="text-foreground text-lg font-semibold mb-3">
              Holdings Currency Breakdown
            </Text>
            <View className="bg-surface rounded-xl border border-border overflow-hidden">
              {currencyAnalysis.holdings.slice(0, 5).map((holding, index) => (
                <View
                  key={holding.symbol}
                  className={`p-4 ${index > 0 ? 'border-t border-border' : ''}`}
                >
                  <View className="flex-row justify-between items-start mb-2">
                    <View>
                      <Text className="text-foreground font-semibold">{holding.symbol}</Text>
                      <Text className="text-muted text-xs">
                        {holding.shares.toFixed(2)} shares
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text
                        style={{ color: holding.totalPnLThb >= 0 ? colors.success : colors.error }}
                        className="font-semibold"
                      >
                        ฿{Math.abs(holding.totalPnLThb).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </Text>
                      <Text className="text-muted text-xs">
                        {formatPercent(holding.totalPnLPercent)}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row justify-between">
                    <View>
                      <Text className="text-muted text-xs">Stock P&L</Text>
                      <Text
                        style={{ color: holding.stockPnLThb >= 0 ? colors.success : colors.error }}
                        className="text-sm"
                      >
                        ฿{Math.abs(holding.stockPnLThb).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </Text>
                    </View>
                    <View className="items-center">
                      <Text className="text-muted text-xs">Currency P&L</Text>
                      <Text
                        style={{ color: holding.currencyPnLThb >= 0 ? colors.success : colors.error }}
                        className="text-sm"
                      >
                        {holding.currencyPnLThb >= 0 ? '+' : '-'}฿{Math.abs(holding.currencyPnLThb).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-muted text-xs">Avg Rate</Text>
                      <Text className="text-foreground text-sm">
                        ฿{holding.avgPurchaseRate.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

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
              <Text className="text-foreground font-semibold">{state.holdings.filter(h => h.shares > 0).length} stocks</Text>
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
