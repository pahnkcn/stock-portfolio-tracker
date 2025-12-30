import { ScrollView, Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ScreenContainer } from '@/components/screen-container';
import { useApp } from '@/context/AppContext';
import { formatCurrency, formatPercent, calculatePnL, formatCompactNumber } from '@/lib/calculations';
import { useColors } from '@/hooks/use-colors';

export default function StockDetailScreen() {
  const colors = useColors();
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const { state } = useApp();

  // Find holding for this symbol
  const holding = useMemo(() => {
    return state.holdings.find((h) => h.symbol === symbol);
  }, [state.holdings, symbol]);

  // Get quote data
  const quote = state.stockQuotes[symbol || ''];

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

  // Mock technical indicators (in real app, would calculate from price history)
  const technicalIndicators = useMemo(() => {
    return {
      rsi: 55 + Math.random() * 30 - 15,
      macd: {
        value: (Math.random() - 0.5) * 2,
        signal: (Math.random() - 0.5) * 2,
        histogram: (Math.random() - 0.5) * 1,
      },
      ema20: quote?.currentPrice ? quote.currentPrice * (1 + (Math.random() - 0.5) * 0.02) : 0,
      ema50: quote?.currentPrice ? quote.currentPrice * (1 + (Math.random() - 0.5) * 0.05) : 0,
      ema200: quote?.currentPrice ? quote.currentPrice * (1 + (Math.random() - 0.5) * 0.1) : 0,
      atr: quote?.currentPrice ? quote.currentPrice * 0.02 : 0,
    };
  }, [quote]);

  // Mock support/resistance levels
  const supportResistance = useMemo(() => {
    const price = quote?.currentPrice || holding?.avgCost || 100;
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
  }, [quote, holding]);

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
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Stock Header */}
        <View className="px-5 py-4 bg-surface border-b border-border">
          <Text className="text-foreground text-2xl font-bold">{symbol}</Text>
          <Text className="text-muted text-sm mb-3">
            {holding?.companyName || 'Company Name'}
          </Text>

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
          ) : (
            <Text className="text-muted">Price data unavailable</Text>
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
            {quote && (
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
            )}
            {!quote && (
              <View className="p-4">
                <Text className="text-muted text-center">No market data available</Text>
              </View>
            )}
          </View>
        </View>

        {/* Technical Indicators */}
        <View className="px-5 py-4">
          <Text className="text-foreground text-lg font-semibold mb-3">Technical Indicators</Text>
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
