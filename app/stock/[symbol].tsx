import { ScrollView, Text, View, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState, useCallback, useEffect } from 'react';
import { ScreenContainer } from '@/components/screen-container';
import { useApp } from '@/context/AppContext';
import { useStockQuote, useStockChart } from '@/hooks/useStockQuotes';
import { formatCurrency, formatPercent, calculatePnL, formatCompactNumber } from '@/lib/calculations';
import { useColors } from '@/hooks/use-colors';

export default function StockDetailScreen() {
  const colors = useColors();
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const { state } = useApp();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch real-time quote
  const { quote, isLoading: quoteLoading, refresh: refreshQuote, hasApiKey } = useStockQuote(symbol || '');

  // Fetch chart data
  const { chart, isLoading: chartLoading, refresh: refreshChart } = useStockChart(symbol || '', '1d', '1mo');

  // Auto-fetch data when screen opens (if API key is configured)
  useEffect(() => {
    if (symbol && hasApiKey) {
      refreshQuote();
      refreshChart();
    }
  }, [symbol, hasApiKey]);

  // Find holding for this symbol
  const holding = useMemo(() => {
    return state.holdings.find((h) => h.symbol === symbol);
  }, [state.holdings, symbol]);

  // Get transactions for this symbol
  const transactions = useMemo(() => {
    return state.transactions
      .filter((tx) => tx.symbol === symbol)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [state.transactions, symbol]);

  // Calculate P&L if we have a holding
  const pnlData = useMemo(() => {
    if (!holding) return null;
    const currentPrice = quote?.currentPrice || holding.avgCost;
    return calculatePnL(holding.shares, holding.avgCost, currentPrice);
  }, [holding, quote]);

  // Calculate technical indicators from chart data
  const technicalIndicators = useMemo(() => {
    const currentPrice = quote?.currentPrice || 0;

    if (!chart || !chart.prices.close.length) {
      return {
        rsi: 50,
        macd: { value: 0, signal: 0, histogram: 0 },
        ema20: currentPrice,
        ema50: currentPrice,
        ema200: currentPrice,
        atr: 0,
        dataQuality: {
          hasEnoughDataForRSI: false,
          hasEnoughDataForMACD: false,
          hasEnoughDataForEMA200: false,
        },
      };
    }

    const closes = chart.prices.close;
    const highs = chart.prices.high;
    const lows = chart.prices.low;
    const dataLength = closes.length;

    // Data quality indicators
    const hasEnoughDataForRSI = dataLength >= 15; // RSI 14 needs at least 15 data points
    const hasEnoughDataForMACD = dataLength >= 35; // MACD (26+9) needs at least 35 data points
    const hasEnoughDataForEMA200 = dataLength >= 200;

    // Calculate RSI (14 period) using Wilder's Smoothing
    const rsi = calculateRSI(closes, 14);

    // Calculate EMA with proper period handling
    const ema20 = dataLength >= 20 ? calculateEMA(closes, 20) : currentPrice || closes[closes.length - 1];
    const ema50 = dataLength >= 50 ? calculateEMA(closes, 50) : currentPrice || closes[closes.length - 1];

    // EMA 200: Only calculate if we have enough data, otherwise show current price with warning
    const ema200 = hasEnoughDataForEMA200
      ? calculateEMA(closes, 200)
      : currentPrice || closes[closes.length - 1];

    // Calculate ATR using Wilder's Smoothing
    const atr = calculateATR(highs, lows, closes, 14);

    // Calculate MACD properly (EMA 12, EMA 26, Signal EMA 9)
    const macd = calculateMACD(closes, 12, 26, 9);

    return {
      rsi,
      macd,
      ema20,
      ema50,
      ema200,
      atr,
      dataQuality: {
        hasEnoughDataForRSI,
        hasEnoughDataForMACD,
        hasEnoughDataForEMA200,
      },
    };
  }, [chart, quote]);

  // Calculate support/resistance from chart data using Pivot Points
  const supportResistance = useMemo(() => {
    const currentPrice = quote?.currentPrice || holding?.avgCost || 100;

    if (chart && chart.prices.high.length > 0) {
      const highs = chart.prices.high;
      const lows = chart.prices.low;
      const closes = chart.prices.close;

      // Get the most recent period data for Pivot Point calculation
      const periodHigh = Math.max(...highs.slice(-20)); // Last 20 periods
      const periodLow = Math.min(...lows.slice(-20));
      const lastClose = closes[closes.length - 1];

      // Calculate Pivot Points
      const pivots = calculatePivotPoints(periodHigh, periodLow, lastClose);

      // Find significant historical levels
      const historicalLevels = findSignificantLevels(highs, lows, closes, currentPrice);

      // Determine strength based on distance from current price and multiple confirmations
      const getStrength = (level: number, isResistance: boolean): 'weak' | 'moderate' | 'strong' => {
        const distance = Math.abs(level - currentPrice) / currentPrice;
        const hasHistoricalConfirmation = isResistance
          ? historicalLevels.resistance.some(h => Math.abs(h - level) / level < 0.02)
          : historicalLevels.support.some(h => Math.abs(h - level) / level < 0.02);

        if (hasHistoricalConfirmation) return 'strong';
        if (distance < 0.03) return 'moderate';
        return 'weak';
      };

      // Build resistance levels (above current price)
      const resistanceLevels: { price: number; strength: 'weak' | 'moderate' | 'strong'; source: string }[] = [];

      if (pivots.r1 > currentPrice) {
        resistanceLevels.push({ price: pivots.r1, strength: getStrength(pivots.r1, true), source: 'Pivot R1' });
      }
      if (pivots.r2 > currentPrice) {
        resistanceLevels.push({ price: pivots.r2, strength: getStrength(pivots.r2, true), source: 'Pivot R2' });
      }

      // Add historical resistance levels
      historicalLevels.resistance.forEach((level, index) => {
        if (!resistanceLevels.some(r => Math.abs(r.price - level) / level < 0.01)) {
          resistanceLevels.push({ price: level, strength: 'strong', source: `Historical R${index + 1}` });
        }
      });

      // Build support levels (below current price)
      const supportLevels: { price: number; strength: 'weak' | 'moderate' | 'strong'; source: string }[] = [];

      if (pivots.s1 < currentPrice) {
        supportLevels.push({ price: pivots.s1, strength: getStrength(pivots.s1, false), source: 'Pivot S1' });
      }
      if (pivots.s2 < currentPrice) {
        supportLevels.push({ price: pivots.s2, strength: getStrength(pivots.s2, false), source: 'Pivot S2' });
      }

      // Add historical support levels
      historicalLevels.support.forEach((level, index) => {
        if (!supportLevels.some(s => Math.abs(s.price - level) / level < 0.01)) {
          supportLevels.push({ price: level, strength: 'strong', source: `Historical S${index + 1}` });
        }
      });

      // Sort and limit
      resistanceLevels.sort((a, b) => a.price - b.price);
      supportLevels.sort((a, b) => b.price - a.price);

      return {
        resistance: resistanceLevels.slice(0, 3).map(r => ({ price: r.price, strength: r.strength })),
        support: supportLevels.slice(0, 3).map(s => ({ price: s.price, strength: s.strength })),
        pivot: pivots.pivot,
      };
    }

    // Fallback: Use simple percentage-based levels
    return {
      resistance: [
        { price: currentPrice * 1.03, strength: 'weak' as const },
        { price: currentPrice * 1.05, strength: 'moderate' as const },
      ],
      support: [
        { price: currentPrice * 0.97, strength: 'weak' as const },
        { price: currentPrice * 0.95, strength: 'moderate' as const },
      ],
      pivot: currentPrice,
    };
  }, [quote, holding, chart]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshQuote(), refreshChart()]);
    setRefreshing(false);
  }, [refreshQuote, refreshChart]);

  const getRSIColor = (rsi: number) => {
    if (rsi >= 70) return colors.error;
    if (rsi <= 30) return colors.success;
    return colors.foreground;
  };

  const getRSISignal = (rsi: number) => {
    if (rsi >= 70) return 'Overbought';
    if (rsi <= 30) return 'Oversold';
    return 'Neutral';
  };

  if (!symbol) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text className="text-muted">No symbol provided</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={['left', 'right']}>
      <ScrollView 
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
      >
        {/* Stock Header */}
        <View className="px-5 py-4 bg-surface border-b border-border">
          <View className="flex-row justify-between items-start">
            <View className="flex-1">
              <Text className="text-foreground text-2xl font-bold">{symbol}</Text>
              <Text className="text-muted text-sm mb-3" numberOfLines={1}>
                {quote?.companyName || holding?.companyName || 'Loading...'}
              </Text>
            </View>
            {quoteLoading && (
              <ActivityIndicator size="small" color={colors.tint} />
            )}
          </View>

          {quote ? (
            <View className="flex-row items-baseline">
              <Text className="text-foreground text-3xl font-bold">
                ${quote.currentPrice.toFixed(2)}
              </Text>
              <View className="ml-3 flex-row items-center">
                <Text
                  style={{ color: quote.change >= 0 ? colors.success : colors.error }}
                  className="text-lg font-semibold"
                >
                  {quote.change >= 0 ? '+' : ''}${quote.change.toFixed(2)}
                </Text>
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor:
                        quote.change >= 0 ? colors.success + '20' : colors.error + '20',
                    },
                  ]}
                >
                  <Text
                    style={{ color: quote.change >= 0 ? colors.success : colors.error }}
                    className="text-sm font-medium"
                  >
                    {formatPercent(quote.changePercent)}
                  </Text>
                </View>
              </View>
            </View>
          ) : quoteLoading ? (
            <View className="flex-row items-center">
              <ActivityIndicator size="small" color={colors.muted} />
              <Text className="text-muted ml-2">Loading price...</Text>
            </View>
          ) : (
            <Text className="text-muted">Price data unavailable</Text>
          )}
          
          {/* Last updated indicator */}
          {quote && (
            <View className="flex-row items-center mt-2">
              <View className="w-2 h-2 rounded-full bg-success mr-1" />
              <Text className="text-muted text-xs">
                Live • Updated {new Date(quote.lastUpdated).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          )}
        </View>

        {/* Position Summary (if holding exists) */}
        {holding && pnlData && (
          <View className="px-5 py-4">
            <Text className="text-foreground text-lg font-semibold mb-3">Your Position</Text>
            <View className="bg-surface rounded-xl p-4 border border-border">
              <View className="flex-row justify-between mb-3">
                <View>
                  <Text className="text-muted text-xs">Shares</Text>
                  <Text className="text-foreground text-lg font-semibold">
                    {holding.shares.toLocaleString('en-US', { maximumFractionDigits: 5 })}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-muted text-xs">Market Value</Text>
                  <Text className="text-foreground text-lg font-semibold">
                    {formatCurrency(
                      holding.shares * (quote?.currentPrice || holding.avgCost),
                      'USD'
                    )}
                  </Text>
                </View>
              </View>
              <View className="flex-row justify-between pt-3 border-t border-border">
                <View>
                  <Text className="text-muted text-xs">Avg Cost</Text>
                  <Text className="text-foreground font-medium">
                    ${holding.avgCost.toFixed(2)}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-muted text-xs">Total P&L</Text>
                  <Text
                    style={{ color: pnlData.pnl >= 0 ? colors.success : colors.error }}
                    className="font-semibold"
                  >
                    {formatCurrency(pnlData.pnl, 'USD')} ({formatPercent(pnlData.pnlPercent)})
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Key Stats */}
        <View className="px-5 py-4">
          <Text className="text-foreground text-lg font-semibold mb-3">Key Statistics</Text>
          <View className="bg-surface rounded-xl border border-border overflow-hidden">
            {quote ? (
              <>
                <View className="flex-row justify-between p-4 border-b border-border">
                  <Text className="text-muted">Open</Text>
                  <Text className="text-foreground font-medium">${quote.open.toFixed(2)}</Text>
                </View>
                <View className="flex-row justify-between p-4 border-b border-border">
                  <Text className="text-muted">High</Text>
                  <Text className="text-foreground font-medium">${quote.high.toFixed(2)}</Text>
                </View>
                <View className="flex-row justify-between p-4 border-b border-border">
                  <Text className="text-muted">Low</Text>
                  <Text className="text-foreground font-medium">${quote.low.toFixed(2)}</Text>
                </View>
                <View className="flex-row justify-between p-4 border-b border-border">
                  <Text className="text-muted">Previous Close</Text>
                  <Text className="text-foreground font-medium">
                    ${quote.previousClose.toFixed(2)}
                  </Text>
                </View>
                <View className="flex-row justify-between p-4">
                  <Text className="text-muted">Volume</Text>
                  <Text className="text-foreground font-medium">
                    {formatCompactNumber(quote.volume)}
                  </Text>
                </View>
              </>
            ) : (
              <View className="p-4">
                {quoteLoading ? (
                  <ActivityIndicator size="small" color={colors.muted} />
                ) : (
                  <Text className="text-muted text-center">No market data available</Text>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Technical Indicators */}
        <View className="px-5 py-4">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-foreground text-lg font-semibold">Technical Indicators</Text>
            {chartLoading && <ActivityIndicator size="small" color={colors.muted} />}
          </View>
          <View className="bg-surface rounded-xl border border-border overflow-hidden">
            {/* RSI */}
            <View className="flex-row justify-between p-4 border-b border-border">
              <View>
                <Text className="text-muted text-xs">RSI (14)</Text>
                <Text
                  style={{ color: getRSIColor(technicalIndicators.rsi) }}
                  className="text-lg font-semibold"
                >
                  {technicalIndicators.rsi.toFixed(1)}
                </Text>
              </View>
              <View
                style={[
                  styles.signalBadge,
                  {
                    backgroundColor:
                      technicalIndicators.rsi >= 70
                        ? colors.error + '20'
                        : technicalIndicators.rsi <= 30
                          ? colors.success + '20'
                          : colors.muted + '20',
                  },
                ]}
              >
                <Text
                  style={{
                    color:
                      technicalIndicators.rsi >= 70
                        ? colors.error
                        : technicalIndicators.rsi <= 30
                          ? colors.success
                          : colors.muted,
                  }}
                  className="text-xs font-medium"
                >
                  {getRSISignal(technicalIndicators.rsi)}
                </Text>
              </View>
            </View>

            {/* MACD with Signal and Histogram */}
            <View className="p-4 border-b border-border">
              <View className="flex-row justify-between items-start mb-2">
                <View>
                  <Text className="text-muted text-xs">MACD (12, 26, 9)</Text>
                  <Text className="text-foreground text-lg font-semibold">
                    {technicalIndicators.macd.value.toFixed(2)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.signalBadge,
                    {
                      backgroundColor:
                        technicalIndicators.macd.histogram > 0
                          ? colors.success + '20'
                          : colors.error + '20',
                    },
                  ]}
                >
                  <Text
                    style={{
                      color:
                        technicalIndicators.macd.histogram > 0 ? colors.success : colors.error,
                    }}
                    className="text-xs font-medium"
                  >
                    {technicalIndicators.macd.histogram > 0 ? 'Bullish' : 'Bearish'}
                  </Text>
                </View>
              </View>
              <View className="flex-row justify-between">
                <View>
                  <Text className="text-muted text-xs">Signal</Text>
                  <Text className="text-foreground font-medium">
                    {technicalIndicators.macd.signal.toFixed(2)}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-muted text-xs">Histogram</Text>
                  <Text
                    style={{
                      color:
                        technicalIndicators.macd.histogram > 0 ? colors.success : colors.error,
                    }}
                    className="font-medium"
                  >
                    {technicalIndicators.macd.histogram > 0 ? '+' : ''}
                    {technicalIndicators.macd.histogram.toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Moving Averages */}
            <View className="p-4 border-b border-border">
              <Text className="text-muted text-xs mb-2">Moving Averages</Text>
              <View className="flex-row justify-between">
                <View className="items-center">
                  <Text className="text-muted text-xs">EMA 20</Text>
                  <Text className="text-foreground font-medium">
                    ${technicalIndicators.ema20.toFixed(2)}
                  </Text>
                </View>
                <View className="items-center">
                  <Text className="text-muted text-xs">EMA 50</Text>
                  <Text className="text-foreground font-medium">
                    ${technicalIndicators.ema50.toFixed(2)}
                  </Text>
                </View>
                <View className="items-center">
                  <Text className="text-muted text-xs">
                    EMA 200{!technicalIndicators.dataQuality?.hasEnoughDataForEMA200 ? '*' : ''}
                  </Text>
                  <Text className="text-foreground font-medium">
                    ${technicalIndicators.ema200.toFixed(2)}
                  </Text>
                </View>
              </View>
              {!technicalIndicators.dataQuality?.hasEnoughDataForEMA200 && (
                <Text className="text-muted text-xs mt-2 italic">
                  * Insufficient data for accurate EMA 200 (needs 200+ data points)
                </Text>
              )}
            </View>

            {/* ATR */}
            <View className="flex-row justify-between p-4">
              <View>
                <Text className="text-muted text-xs">ATR (14)</Text>
                <Text className="text-foreground text-lg font-semibold">
                  ${technicalIndicators.atr.toFixed(2)}
                </Text>
              </View>
              <Text className="text-muted text-xs self-end">Volatility indicator</Text>
            </View>
          </View>
        </View>

        {/* Support & Resistance */}
        <View className="px-5 py-4">
          <Text className="text-foreground text-lg font-semibold mb-3">Support & Resistance</Text>
          <View className="bg-surface rounded-xl border border-border overflow-hidden">
            {/* Pivot Point */}
            {supportResistance.pivot && (
              <View className="p-4 border-b border-border bg-surface">
                <View className="flex-row justify-between items-center">
                  <View>
                    <Text className="text-muted text-xs">Pivot Point</Text>
                    <Text className="text-foreground text-lg font-semibold">
                      ${supportResistance.pivot.toFixed(2)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.signalBadge,
                      { backgroundColor: colors.tint + '20' },
                    ]}
                  >
                    <Text style={{ color: colors.tint }} className="text-xs font-medium">
                      {quote?.currentPrice && supportResistance.pivot
                        ? quote.currentPrice > supportResistance.pivot
                          ? 'Above Pivot'
                          : 'Below Pivot'
                        : 'Key Level'}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Resistance Levels */}
            <View className="p-4 border-b border-border">
              <Text className="text-error text-xs font-medium mb-2">Resistance Levels</Text>
              {supportResistance.resistance.length > 0 ? (
                supportResistance.resistance.map((level, index) => (
                  <View key={index} className="flex-row justify-between items-center mb-1">
                    <Text className="text-foreground">${level.price.toFixed(2)}</Text>
                    <View
                      style={[
                        styles.strengthBadge,
                        {
                          backgroundColor:
                            level.strength === 'strong'
                              ? colors.error + '30'
                              : level.strength === 'moderate'
                                ? colors.error + '20'
                                : colors.error + '10',
                        },
                      ]}
                    >
                      <Text className="text-error text-xs capitalize">{level.strength}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text className="text-muted text-xs">No resistance levels found</Text>
              )}
            </View>

            {/* Support Levels */}
            <View className="p-4">
              <Text className="text-success text-xs font-medium mb-2">Support Levels</Text>
              {supportResistance.support.length > 0 ? (
                supportResistance.support.map((level, index) => (
                  <View key={index} className="flex-row justify-between items-center mb-1">
                    <Text className="text-foreground">${level.price.toFixed(2)}</Text>
                    <View
                      style={[
                        styles.strengthBadge,
                        {
                          backgroundColor:
                            level.strength === 'strong'
                              ? colors.success + '30'
                              : level.strength === 'moderate'
                                ? colors.success + '20'
                                : colors.success + '10',
                        },
                      ]}
                    >
                      <Text className="text-success text-xs capitalize">{level.strength}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text className="text-muted text-xs">No support levels found</Text>
              )}
            </View>
          </View>
        </View>

        {/* Transaction History */}
        {transactions.length > 0 && (
          <View className="px-5 py-4">
            <Text className="text-foreground text-lg font-semibold mb-3">Transaction History</Text>
            <View className="bg-surface rounded-xl border border-border overflow-hidden">
              {transactions.slice(0, 5).map((tx, index) => (
                <View
                  key={tx.id}
                  className={`flex-row justify-between p-4 ${index > 0 ? 'border-t border-border' : ''}`}
                >
                  <View className="flex-row items-center">
                    <View
                      style={[
                        styles.typeBadge,
                        {
                          backgroundColor:
                            tx.type === 'BUY' ? colors.success + '20' : colors.error + '20',
                        },
                      ]}
                    >
                      <Text
                        style={{ color: tx.type === 'BUY' ? colors.success : colors.error }}
                        className="text-xs font-bold"
                      >
                        {tx.type}
                      </Text>
                    </View>
                    <View className="ml-3">
                      <Text className="text-foreground font-medium">
                        {tx.shares} @ ${tx.price.toFixed(2)}
                      </Text>
                      <Text className="text-muted text-xs">{tx.date}</Text>
                    </View>
                  </View>
                  <Text className="text-foreground font-medium">
                    {formatCurrency(tx.netAmount, 'USD')}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

// Helper functions for technical analysis

/**
 * Calculate RSI using Wilder's Smoothing Method (standard)
 * Uses Exponential Moving Average for smoothing gains/losses
 */
function calculateRSI(prices: number[], period: number): number {
  if (prices.length < period + 1) return 50;

  // Calculate price changes
  const changes: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }

  // First average (SMA for initial value)
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i];
    else avgLoss += Math.abs(changes[i]);
  }

  avgGain /= period;
  avgLoss /= period;

  // Apply Wilder's Smoothing for remaining periods
  const smoothingFactor = (period - 1) / period;

  for (let i = period; i < changes.length; i++) {
    const change = changes[i];
    if (change > 0) {
      avgGain = avgGain * smoothingFactor + change / period;
      avgLoss = avgLoss * smoothingFactor;
    } else {
      avgGain = avgGain * smoothingFactor;
      avgLoss = avgLoss * smoothingFactor + Math.abs(change) / period;
    }
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

/**
 * Calculate EMA (Exponential Moving Average)
 * Returns the final EMA value
 */
function calculateEMA(prices: number[], period: number): number {
  if (prices.length === 0) return 0;
  if (prices.length < period) return prices[prices.length - 1];

  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }

  return ema;
}

/**
 * Calculate EMA series (returns array of EMA values)
 * Used for MACD Signal line calculation
 */
function calculateEMASeries(prices: number[], period: number): number[] {
  if (prices.length === 0) return [];
  if (prices.length < period) return prices.map(() => prices[prices.length - 1]);

  const multiplier = 2 / (period + 1);
  const emaSeries: number[] = [];

  // First EMA is SMA of first 'period' values
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;

  // Fill initial values with SMA
  for (let i = 0; i < period; i++) {
    emaSeries.push(ema);
  }

  // Calculate EMA for remaining values
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
    emaSeries.push(ema);
  }

  return emaSeries;
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 * Returns MACD line, Signal line, and Histogram
 */
function calculateMACD(prices: number[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9): {
  value: number;
  signal: number;
  histogram: number;
} {
  if (prices.length < slowPeriod + signalPeriod) {
    return { value: 0, signal: 0, histogram: 0 };
  }

  // Calculate EMA series for fast and slow periods
  const emaFastSeries = calculateEMASeries(prices, fastPeriod);
  const emaSlowSeries = calculateEMASeries(prices, slowPeriod);

  // Calculate MACD line series (Fast EMA - Slow EMA)
  const macdLineSeries: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    macdLineSeries.push(emaFastSeries[i] - emaSlowSeries[i]);
  }

  // Calculate Signal line (EMA of MACD line)
  const signalSeries = calculateEMASeries(macdLineSeries, signalPeriod);

  // Get latest values
  const macdValue = macdLineSeries[macdLineSeries.length - 1];
  const signalValue = signalSeries[signalSeries.length - 1];
  const histogram = macdValue - signalValue;

  return {
    value: macdValue,
    signal: signalValue,
    histogram: histogram,
  };
}

/**
 * Calculate ATR using Wilder's Smoothing Method
 */
function calculateATR(highs: number[], lows: number[], closes: number[], period: number): number {
  if (highs.length < period + 1) return 0;

  // Calculate True Range series
  const trueRanges: number[] = [];
  for (let i = 1; i < highs.length; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    trueRanges.push(tr);
  }

  if (trueRanges.length < period) {
    return trueRanges.reduce((a, b) => a + b, 0) / trueRanges.length;
  }

  // First ATR is SMA of first 'period' True Ranges
  let atr = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;

  // Apply Wilder's Smoothing for remaining periods
  for (let i = period; i < trueRanges.length; i++) {
    atr = (atr * (period - 1) + trueRanges[i]) / period;
  }

  return atr;
}

/**
 * Calculate Pivot Points for Support & Resistance
 * Uses Standard Pivot Point formula
 */
function calculatePivotPoints(high: number, low: number, close: number): {
  pivot: number;
  r1: number;
  r2: number;
  r3: number;
  s1: number;
  s2: number;
  s3: number;
} {
  const pivot = (high + low + close) / 3;

  return {
    pivot,
    r1: 2 * pivot - low,
    r2: pivot + (high - low),
    r3: high + 2 * (pivot - low),
    s1: 2 * pivot - high,
    s2: pivot - (high - low),
    s3: low - 2 * (high - pivot),
  };
}

/**
 * Find significant price levels from historical data
 * Identifies areas where price has reversed multiple times
 */
function findSignificantLevels(
  highs: number[],
  lows: number[],
  closes: number[],
  currentPrice: number,
  tolerance = 0.02
): { support: number[]; resistance: number[] } {
  const allPrices = [...highs, ...lows];
  const support: number[] = [];
  const resistance: number[] = [];

  // Group similar price levels
  const priceClusters: Map<number, number> = new Map();

  allPrices.forEach(price => {
    // Round to tolerance level
    const rounded = Math.round(price / (currentPrice * tolerance)) * (currentPrice * tolerance);
    priceClusters.set(rounded, (priceClusters.get(rounded) || 0) + 1);
  });

  // Find clusters with multiple touches (at least 2)
  priceClusters.forEach((count, price) => {
    if (count >= 2) {
      if (price < currentPrice) {
        support.push(price);
      } else {
        resistance.push(price);
      }
    }
  });

  // Sort levels
  support.sort((a, b) => b - a); // Descending (closest to current price first)
  resistance.sort((a, b) => a - b); // Ascending (closest to current price first)

  return { support: support.slice(0, 3), resistance: resistance.slice(0, 3) };
}

const styles = StyleSheet.create({
  badge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  signalBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'center',
  },
  strengthBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
});
