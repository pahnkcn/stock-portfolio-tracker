import { ScrollView, Text, View, RefreshControl, ActivityIndicator } from 'react-native';
import { useState, useMemo, useCallback } from 'react';
import { ScreenContainer } from '@/components/screen-container';
import { PortfolioCard } from '@/components/PortfolioCard';
import { HoldingCard } from '@/components/HoldingCard';
import { QuickActions } from '@/components/QuickActions';
import { useApp } from '@/context/AppContext';
import { useStockQuotes } from '@/hooks/useStockQuotes';
import { calculatePortfolioValue, calculateDailyChange, getTopMovers } from '@/lib/calculations';
import { calculatePortfolioCurrencyPnL } from '@/lib/currency-pnl';
import { useColors } from '@/hooks/use-colors';

export default function DashboardScreen() {
  const colors = useColors();
  const { state, refreshData } = useApp();
  const [refreshing, setRefreshing] = useState(false);

  // Use real-time stock quotes with auto-refresh every 60 seconds
  const { quotes, isLoading: quotesLoading, isFetching, refresh: refreshQuotes, lastUpdated } = useStockQuotes({
    refreshInterval: 60000,
    autoRefresh: true,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshData(), refreshQuotes()]);
    setRefreshing(false);
  }, [refreshData, refreshQuotes]);

  const portfolioStats = useMemo(() => {
    return calculatePortfolioValue(state.holdings, quotes);
  }, [state.holdings, quotes]);

  const dailyStats = useMemo(() => {
    return calculateDailyChange(state.holdings, quotes);
  }, [state.holdings, quotes]);

  const topMovers = useMemo(() => {
    return getTopMovers(state.holdings, quotes, 3);
  }, [state.holdings, quotes]);

  // Calculate currency P&L breakdown
  const currencyAnalysis = useMemo(() => {
    if (state.holdings.length === 0) return null;
    return calculatePortfolioCurrencyPnL(
      state.holdings,
      quotes,
      state.currencyRate.usdThb
    );
  }, [state.holdings, quotes, state.currencyRate.usdThb]);

  // Format last updated time
  const lastUpdatedText = useMemo(() => {
    if (!lastUpdated) return null;
    const date = new Date(lastUpdated);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }, [lastUpdated]);

  if (state.isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" color={colors.tint} />
        <Text className="text-muted mt-4">Loading...</Text>
      </ScreenContainer>
    );
  }

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
          <View className="flex-row justify-between items-start">
            <View>
              <Text className="text-foreground text-2xl font-bold">Dashboard</Text>
              <Text className="text-muted text-sm">Stock Portfolio Tracker</Text>
            </View>
            {/* Real-time indicator */}
            <View className="items-end">
              {isFetching && (
                <View className="flex-row items-center">
                  <ActivityIndicator size="small" color={colors.tint} />
                  <Text className="text-muted text-xs ml-1">Updating...</Text>
                </View>
              )}
              {lastUpdatedText && !isFetching && (
                <View className="flex-row items-center">
                  <View className="w-2 h-2 rounded-full bg-success mr-1" />
                  <Text className="text-muted text-xs">Live • {lastUpdatedText}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Portfolio Summary Card with Currency P&L Breakdown */}
        <View className="px-5 py-3">
          <PortfolioCard
            totalValue={portfolioStats.totalValue}
            totalCost={portfolioStats.totalCost}
            totalPnL={portfolioStats.totalPnL}
            totalPnLPercent={portfolioStats.totalPnLPercent}
            dailyChange={dailyStats.change}
            dailyChangePercent={dailyStats.changePercent}
            showInTHB={state.settings.showInTHB}
            usdThbRate={state.currencyRate.usdThb}
            currencyAnalysis={currencyAnalysis}
          />
        </View>

        {/* Quick Actions */}
        <View className="px-5">
          <QuickActions />
        </View>

        {/* Holdings Section */}
        <View className="px-5 py-3">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-foreground text-lg font-semibold">Holdings</Text>
            <View className="flex-row items-center">
              {quotesLoading && state.holdings.length > 0 && (
                <ActivityIndicator size="small" color={colors.muted} style={{ marginRight: 8 }} />
              )}
              <Text className="text-muted text-sm">{state.holdings.length} stocks</Text>
            </View>
          </View>

          {state.holdings.length === 0 ? (
            <View className="bg-surface rounded-xl p-6 items-center border border-border">
              <Text className="text-muted text-center mb-2">No holdings yet</Text>
              <Text className="text-muted text-center text-sm">
                Add stocks manually or import from CSV
              </Text>
            </View>
          ) : (
            state.holdings.filter(h => h.shares > 0).slice(0, 5).map((holding) => (
              <HoldingCard
                key={holding.id}
                holding={holding}
                quote={quotes[holding.symbol]}
                showInTHB={state.settings.showInTHB}
                usdThbRate={state.currencyRate.usdThb}
              />
            ))
          )}

          {state.holdings.filter(h => h.shares > 0).length > 5 && (
            <Text className="text-primary text-center text-sm mt-2">
              View all {state.holdings.filter(h => h.shares > 0).length} holdings in Portfolio tab
            </Text>
          )}
        </View>

        {/* Top Movers Section */}
        {(topMovers.gainers.length > 0 || topMovers.losers.length > 0) && (
          <View className="px-5 py-3">
            <Text className="text-foreground text-lg font-semibold mb-3">Today's Movers</Text>

            {topMovers.gainers.length > 0 && (
              <View className="mb-4">
                <Text className="text-success text-sm font-medium mb-2">Top Gainers</Text>
                {topMovers.gainers.map((holding) => (
                  <HoldingCard
                    key={holding.id}
                    holding={holding}
                    quote={quotes[holding.symbol]}
                    showInTHB={state.settings.showInTHB}
                    usdThbRate={state.currencyRate.usdThb}
                  />
                ))}
              </View>
            )}

            {topMovers.losers.length > 0 && (
              <View>
                <Text className="text-error text-sm font-medium mb-2">Top Losers</Text>
                {topMovers.losers.map((holding) => (
                  <HoldingCard
                    key={holding.id}
                    holding={holding}
                    quote={quotes[holding.symbol]}
                    showInTHB={state.settings.showInTHB}
                    usdThbRate={state.currencyRate.usdThb}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Recent Transactions */}
        {state.transactions.length > 0 && (
          <View className="px-5 py-3">
            <Text className="text-foreground text-lg font-semibold mb-3">Recent Activity</Text>
            {state.transactions.slice(0, 3).map((tx) => (
              <View key={tx.id} className="bg-surface rounded-lg p-3 mb-2 border border-border">
                <View className="flex-row justify-between items-center">
                  <View className="flex-row items-center">
                    <View
                      className={`px-2 py-1 rounded mr-2 ${tx.type === 'BUY' ? 'bg-success/20' : 'bg-error/20'}`}
                    >
                      <Text
                        className={`text-xs font-bold ${tx.type === 'BUY' ? 'text-success' : 'text-error'}`}
                      >
                        {tx.type}
                      </Text>
                    </View>
                    <Text className="text-foreground font-semibold">{tx.symbol}</Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-foreground font-medium">
                      {tx.shares} @ ${tx.price.toFixed(2)}
                    </Text>
                    <Text className="text-muted text-xs">
                      Rate: ฿{tx.exchangeRate?.toFixed(2) || '-'}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
