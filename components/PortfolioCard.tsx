import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { formatCurrency, formatPercent } from '@/lib/calculations';
import { useColors } from '@/hooks/use-colors';
import type { PortfolioCurrencyAnalysis } from '@/types';

interface PortfolioCardProps {
  totalValue: number;
  totalCost: number;
  totalPnL: number;
  totalPnLPercent: number;
  dailyChange: number;
  dailyChangePercent: number;
  showInTHB?: boolean;
  usdThbRate?: number;
  currencyAnalysis?: PortfolioCurrencyAnalysis | null;
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
  currencyAnalysis,
}: PortfolioCardProps) {
  const colors = useColors();
  const [showBreakdown, setShowBreakdown] = useState(false);
  
  const isProfit = totalPnL >= 0;
  const isDailyPositive = dailyChange >= 0;

  const displayValue = showInTHB ? totalValue * usdThbRate : totalValue;
  const displayPnL = showInTHB ? totalPnL * usdThbRate : totalPnL;
  const displayDailyChange = showInTHB ? dailyChange * usdThbRate : dailyChange;
  const currency = showInTHB ? 'THB' : 'USD';

  // Currency P&L breakdown
  const hasBreakdown = currencyAnalysis && showInTHB;
  const stockPnLThb = currencyAnalysis?.totalStockPnLThb || 0;
  const currencyPnLThb = currencyAnalysis?.totalCurrencyPnLThb || 0;
  const isStockProfit = stockPnLThb >= 0;
  const isCurrencyProfit = currencyPnLThb >= 0;

  return (
    <View className="bg-surface rounded-2xl p-5 border border-border">
      <Text className="text-muted text-sm mb-1">Total Portfolio Value</Text>
      
      {/* Dual Currency Display */}
      <View className="flex-row items-baseline mb-3">
        <Text className="text-foreground text-3xl font-bold">
          {formatCurrency(displayValue, currency)}
        </Text>
        {showInTHB && (
          <Text className="text-muted text-sm ml-2">
            ({formatCurrency(totalValue, 'USD')})
          </Text>
        )}
      </View>

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

      {/* Currency P&L Breakdown Toggle */}
      {hasBreakdown && (
        <TouchableOpacity
          onPress={() => setShowBreakdown(!showBreakdown)}
          className="py-2 border-t border-border"
        >
          <View className="flex-row justify-between items-center">
            <Text className="text-primary text-sm font-medium">
              {showBreakdown ? 'Hide P&L Breakdown' : 'Show P&L Breakdown'}
            </Text>
            <Text className="text-muted text-sm">{showBreakdown ? '▲' : '▼'}</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Currency P&L Breakdown Details */}
      {hasBreakdown && showBreakdown && currencyAnalysis && (
        <View className="pt-3 border-t border-border">
          {/* Stock P&L */}
          <View className="flex-row justify-between items-center mb-2">
            <View className="flex-row items-center">
              <View className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: colors.primary }} />
              <Text className="text-muted text-sm">Stock P&L</Text>
            </View>
            <View className="items-end">
              <Text
                style={{ color: isStockProfit ? colors.success : colors.error }}
                className="text-sm font-semibold"
              >
                ฿{Math.abs(stockPnLThb).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                {stockPnLThb >= 0 ? '' : ' (Loss)'}
              </Text>
              <Text className="text-muted text-xs">
                {formatPercent(currencyAnalysis.totalStockPnLPercent)}
              </Text>
            </View>
          </View>

          {/* Currency P&L */}
          <View className="flex-row justify-between items-center mb-2">
            <View className="flex-row items-center">
              <View className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: colors.warning }} />
              <Text className="text-muted text-sm">Currency P&L</Text>
            </View>
            <View className="items-end">
              <Text
                style={{ color: isCurrencyProfit ? colors.success : colors.error }}
                className="text-sm font-semibold"
              >
                {isCurrencyProfit ? '+' : '-'}฿{Math.abs(currencyPnLThb).toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </Text>
              <Text className="text-muted text-xs">
                {formatPercent(currencyAnalysis.totalCurrencyPnLPercent)}
              </Text>
            </View>
          </View>

          {/* Contribution Bar */}
          <View className="mt-2">
            <View className="flex-row h-2 rounded-full overflow-hidden bg-border">
              {(() => {
                const totalAbs = Math.abs(stockPnLThb) + Math.abs(currencyPnLThb);
                const stockPercent = totalAbs > 0 ? (Math.abs(stockPnLThb) / totalAbs) * 100 : 50;
                return (
                  <>
                    <View 
                      style={{ 
                        width: `${stockPercent}%`, 
                        backgroundColor: colors.primary 
                      }} 
                    />
                    <View 
                      style={{ 
                        width: `${100 - stockPercent}%`, 
                        backgroundColor: colors.warning 
                      }} 
                    />
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
      )}

      <View className="flex-row justify-between pt-3 border-t border-border">
        <View>
          <Text className="text-muted text-xs">Cost Basis</Text>
          <Text className="text-foreground text-sm font-medium">
            {formatCurrency(showInTHB ? totalCost * usdThbRate : totalCost, currency)}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-muted text-xs">USD/THB Rate</Text>
          <Text className="text-foreground text-sm font-medium">฿{usdThbRate.toFixed(2)}</Text>
        </View>
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
