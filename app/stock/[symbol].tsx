import { ScrollView, Text, View, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState, useCallback } from 'react';
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
  const { quote, isLoading: quoteLoading, refresh: refreshQuote } = useStockQuote(symbol || '');
  
  // Fetch chart data
  const { chart, isLoading: chartLoading, refresh: refreshChart } = useStockChart(symbol || '', '1d', '1mo');

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
    if (!chart || !chart.prices.close.length) {
      return {
        rsi: 50,
        macd: { value: 0, signal: 0, histogram: 0 },
        ema20: quote?.currentPrice || 0,
        ema50: quote?.currentPrice || 0,
        ema200: quote?.currentPrice || 0,
        atr: 0,
      };
    }

    const closes = chart.prices.close;
    const highs = chart.prices.high;
    const lows = chart.prices.low;
    
    // Calculate RSI (14 period)
    const rsi = calculateRSI(closes, 14);
    
    // Calculate EMA
    const ema20 = calculateEMA(closes, 20);
    const ema50 = calculateEMA(closes, 50);
    const ema200 = calculateEMA(closes, Math.min(200, closes.length));
    
    // Calculate ATR
    const atr = calculateATR(highs, lows, closes, 14);
    
    // Simplified MACD
    const ema12 = calculateEMA(closes, 12);
    const ema26 = calculateEMA(closes, 26);
    const macdValue = ema12 - ema26;
    const macdSignal = macdValue * 0.9; // Simplified
    
    return {
      rsi,
      macd: { value: macdValue, signal: macdSignal, histogram: macdValue - macdSignal },
      ema20,
      ema50,
      ema200,
      atr,
    };
  }, [chart, quote]);

  // Calculate support/resistance from chart data
  const supportResistance = useMemo(() => {
    const price = quote?.currentPrice || holding?.avgCost || 100;
    
    if (chart && chart.prices.high.length > 0) {
      const highs = chart.prices.high;
      const lows = chart.prices.low;
      const maxHigh = Math.max(...highs);
      const minLow = Math.min(...lows);
      
      return {
        resistance: [
          { price: price * 1.03, strength: 'moderate' as const },
          { price: maxHigh, strength: 'strong' as const },
        ],
        support: [
          { price: price * 0.97, strength: 'moderate' as const },
          { price: minLow, strength: 'strong' as const },
        ],
      };
    }
    
    return {
      resistance: [
        { price: price * 1.05, strength: 'moderate' as const },
        { price: price * 1.1, strength: 'strong' as const },
      ],
      support: [
        { price: price * 0.95, strength: 'moderate' as const },
        { price: price * 0.9, strength: 'strong' as const },
      ],
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

            <View className="flex-row justify-between p-4 border-b border-border">
              <View>
                <Text className="text-muted text-xs">MACD</Text>
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
                  <Text className="text-muted text-xs">EMA 200</Text>
                  <Text className="text-foreground font-medium">
                    ${technicalIndicators.ema200.toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>

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
            <View className="p-4 border-b border-border">
              <Text className="text-error text-xs font-medium mb-2">Resistance Levels</Text>
              {supportResistance.resistance.map((level, index) => (
                <View key={index} className="flex-row justify-between items-center mb-1">
                  <Text className="text-foreground">${level.price.toFixed(2)}</Text>
                  <View
                    style={[
                      styles.strengthBadge,
                      {
                        backgroundColor:
                          level.strength === 'strong' ? colors.error + '30' : colors.error + '15',
                      },
                    ]}
                  >
                    <Text className="text-error text-xs capitalize">{level.strength}</Text>
                  </View>
                </View>
              ))}
            </View>
            <View className="p-4">
              <Text className="text-success text-xs font-medium mb-2">Support Levels</Text>
              {supportResistance.support.map((level, index) => (
                <View key={index} className="flex-row justify-between items-center mb-1">
                  <Text className="text-foreground">${level.price.toFixed(2)}</Text>
                  <View
                    style={[
                      styles.strengthBadge,
                      {
                        backgroundColor:
                          level.strength === 'strong'
                            ? colors.success + '30'
                            : colors.success + '15',
                      },
                    ]}
                  >
                    <Text className="text-success text-xs capitalize">{level.strength}</Text>
                  </View>
                </View>
              ))}
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
function calculateRSI(prices: number[], period: number): number {
  if (prices.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

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

function calculateATR(highs: number[], lows: number[], closes: number[], period: number): number {
  if (highs.length < period + 1) return 0;
  
  const trueRanges: number[] = [];
  
  for (let i = 1; i < highs.length; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    trueRanges.push(tr);
  }
  
  const recentTRs = trueRanges.slice(-period);
  return recentTRs.reduce((a, b) => a + b, 0) / recentTRs.length;
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
