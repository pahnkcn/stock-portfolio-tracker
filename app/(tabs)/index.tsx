import { ScrollView, Text, View, RefreshControl, ActivityIndicator, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { useState, useMemo, useCallback, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withSpring,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { ScreenContainer } from '@/components/screen-container';
import { PortfolioCard } from '@/components/PortfolioCard';
import { HoldingCard } from '@/components/HoldingCard';
import { QuickActions } from '@/components/QuickActions';
import { SkeletonPortfolioCard, SkeletonList } from '@/components/ui/Skeleton';
import { FadeInView } from '@/components/ui/AnimatedListItem';
import { useApp } from '@/context/AppContext';
import { useStockQuotes } from '@/hooks/useStockQuotes';
import { calculatePortfolioValue, calculateDailyChange, getTopMovers } from '@/lib/calculations';
import { calculatePortfolioCurrencyPnL } from '@/lib/currency-pnl';
import { useColors } from '@/hooks/use-colors';

export default function DashboardScreen() {
  const colors = useColors();
  const { state, refreshData } = useApp();
  const [refreshing, setRefreshing] = useState(false);

  // Animation values
  const headerProgress = useSharedValue(0);

  useEffect(() => {
    headerProgress.value = withTiming(1, { duration: 500 });
  }, []);

  const headerAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(headerProgress.value, [0, 1], [0, 1], Extrapolation.CLAMP);
    const translateY = interpolate(headerProgress.value, [0, 1], [-20, 0], Extrapolation.CLAMP);
    return { opacity, transform: [{ translateY }] };
  });

  // Use stock quotes with manual refresh only
  const { quotes, isLoading: quotesLoading, isFetching, refresh: refreshQuotes, lastUpdated, hasApiKey, hasSymbols } = useStockQuotes();

  // Auto-fetch quotes when app opens (if API key is configured and has symbols)
  useEffect(() => {
    if (hasApiKey && hasSymbols && !lastUpdated) {
      refreshQuotes();
    }
  }, [hasApiKey, hasSymbols, lastUpdated]);

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
      <ScreenContainer>
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
          <View style={styles.headerContainer}>
            <View>
              <View style={[styles.skeletonTitle, { backgroundColor: colors.border }]} />
              <View style={[styles.skeletonSubtitle, { backgroundColor: colors.border }]} />
            </View>
          </View>
          <View style={styles.cardContainer}>
            <SkeletonPortfolioCard />
          </View>
          <View style={styles.sectionContainer}>
            <SkeletonList count={3} />
          </View>
        </ScrollView>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Animation */}
        <Animated.View style={[styles.headerContainer, headerAnimatedStyle]}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>Dashboard</Text>
            <Text style={[styles.headerSubtitle, { color: colors.foreground, opacity: 0.6 }]}>TradeMind</Text>
          </View>
          {/* Real-time indicator */}
          <View style={styles.statusContainer}>
            {hasApiKey && isFetching && (
              <View style={styles.statusRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.statusText, { color: colors.foreground, opacity: 0.6 }]}>Updating...</Text>
              </View>
            )}
            {hasApiKey && lastUpdatedText && !isFetching && (
              <View style={[styles.liveIndicator, { backgroundColor: colors.success + '15' }]}>
                <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
                <Text style={[styles.liveText, { color: colors.success }]}>Live</Text>
                <Text style={[styles.timeText, { color: colors.foreground, opacity: 0.6 }]}>{lastUpdatedText}</Text>
              </View>
            )}
            {!hasApiKey && (
              <View style={[styles.offlineIndicator, { backgroundColor: colors.warning + '15' }]}>
                <Text style={[styles.offlineText, { color: colors.warning }]}>Offline</Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Portfolio Summary Card */}
        <View style={styles.cardContainer}>
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
        <FadeInView delay={200}>
          <View style={styles.sectionContainer}>
            <QuickActions />
          </View>
        </FadeInView>

        {/* Holdings Section */}
        <FadeInView delay={300}>
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Holdings</Text>
              <View style={styles.sectionHeaderRight}>
                {/* Refresh Prices Button */}
                {hasApiKey && hasSymbols && (
                  <TouchableOpacity
                    onPress={async () => {
                      if (Platform.OS !== 'web') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                      await refreshQuotes();
                    }}
                    disabled={isFetching}
                    style={[
                      styles.refreshButton,
                      { backgroundColor: colors.primary + '15', opacity: isFetching ? 0.5 : 1 },
                    ]}
                  >
                    {isFetching ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Text style={[styles.refreshButtonText, { color: colors.primary }]}>↻ Refresh</Text>
                    )}
                  </TouchableOpacity>
                )}
                <View style={[styles.countBadge, { backgroundColor: colors.primary + '15' }]}>
                  <Text style={[styles.countText, { color: colors.primary }]}>
                    {state.holdings.filter(h => h.shares > 0).length}
                  </Text>
                </View>
              </View>
            </View>

            {state.holdings.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.emptyIcon]}>📊</Text>
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No holdings yet</Text>
                <Text style={[styles.emptySubtitle, { color: colors.foreground, opacity: 0.6 }]}>
                  Add stocks manually or import from CSV
                </Text>
              </View>
            ) : (
              state.holdings.filter(h => h.shares > 0).slice(0, 5).map((holding, index) => (
                <HoldingCard
                  key={holding.id}
                  holding={holding}
                  quote={quotes[holding.symbol]}
                  showInTHB={state.settings.showInTHB}
                  usdThbRate={state.currencyRate.usdThb}
                  index={index}
                />
              ))
            )}

            {state.holdings.filter(h => h.shares > 0).length > 5 && (
              <View style={[styles.viewAllButton, { borderColor: colors.border }]}>
                <Text style={[styles.viewAllText, { color: colors.primary }]}>
                  View all {state.holdings.filter(h => h.shares > 0).length} holdings →
                </Text>
              </View>
            )}
          </View>
        </FadeInView>

        {/* Top Movers Section */}
        {(topMovers.gainers.length > 0 || topMovers.losers.length > 0) && (
          <FadeInView delay={400}>
            <View style={styles.sectionContainer}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Today's Movers</Text>

              {topMovers.gainers.length > 0 && (
                <View style={styles.moversSection}>
                  <View style={styles.moversHeader}>
                    <View style={[styles.moversIcon, { backgroundColor: colors.success + '15' }]}>
                      <Text>📈</Text>
                    </View>
                    <Text style={[styles.moversTitle, { color: colors.success }]}>Top Gainers</Text>
                  </View>
                  {topMovers.gainers.map((holding, index) => (
                    <HoldingCard
                      key={holding.id}
                      holding={holding}
                      quote={quotes[holding.symbol]}
                      showInTHB={state.settings.showInTHB}
                      usdThbRate={state.currencyRate.usdThb}
                      index={index}
                    />
                  ))}
                </View>
              )}

              {topMovers.losers.length > 0 && (
                <View style={styles.moversSection}>
                  <View style={styles.moversHeader}>
                    <View style={[styles.moversIcon, { backgroundColor: colors.error + '15' }]}>
                      <Text>📉</Text>
                    </View>
                    <Text style={[styles.moversTitle, { color: colors.error }]}>Top Losers</Text>
                  </View>
                  {topMovers.losers.map((holding, index) => (
                    <HoldingCard
                      key={holding.id}
                      holding={holding}
                      quote={quotes[holding.symbol]}
                      showInTHB={state.settings.showInTHB}
                      usdThbRate={state.currencyRate.usdThb}
                      index={index}
                    />
                  ))}
                </View>
              )}
            </View>
          </FadeInView>
        )}

        {/* Recent Transactions */}
        {state.transactions.length > 0 && (
          <FadeInView delay={500}>
            <View style={styles.sectionContainer}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Activity</Text>
              {state.transactions.slice(0, 3).map((tx, index) => (
                <View 
                  key={tx.id} 
                  style={[
                    styles.transactionCard, 
                    { 
                      backgroundColor: colors.surface, 
                      borderColor: colors.border,
                      ...Platform.select({
                        ios: {
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.04,
                          shadowRadius: 4,
                        },
                        android: { elevation: 1 },
                        web: { boxShadow: '0 1px 4px rgba(0,0,0,0.03)' },
                      }),
                    }
                  ]}
                >
                  <View style={styles.transactionRow}>
                    <View style={styles.transactionLeft}>
                      <View
                        style={[
                          styles.typeBadge,
                          { backgroundColor: tx.type === 'BUY' ? colors.success + '15' : colors.error + '15' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.typeText,
                            { color: tx.type === 'BUY' ? colors.success : colors.error },
                          ]}
                        >
                          {tx.type}
                        </Text>
                      </View>
                      <Text style={[styles.txSymbol, { color: colors.foreground }]}>{tx.symbol}</Text>
                    </View>
                    <View style={styles.transactionRight}>
                      <Text style={[styles.txAmount, { color: colors.foreground }]}>
                        {tx.shares} @ ${tx.price.toFixed(2)}
                      </Text>
                      <Text style={[styles.txRate, { color: colors.foreground, opacity: 0.6 }]}>
                        Rate: ฿{tx.exchangeRate?.toFixed(2) || '-'}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </FadeInView>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    marginLeft: 4,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  liveText: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 6,
  },
  timeText: {
    fontSize: 11,
  },
  offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  offlineText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardContainer: {
    paddingVertical: 12,
  },
  sectionContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  sectionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  refreshButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  countText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  viewAllButton: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  moversSection: {
    marginBottom: 20,
  },
  moversHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  moversIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  moversTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  transactionCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 10,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  txSymbol: {
    fontSize: 15,
    fontWeight: '600',
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '500',
  },
  txRate: {
    fontSize: 12,
    marginTop: 2,
  },
  skeletonTitle: {
    width: 120,
    height: 28,
    borderRadius: 6,
    marginBottom: 6,
  },
  skeletonSubtitle: {
    width: 160,
    height: 16,
    borderRadius: 4,
  },
});
