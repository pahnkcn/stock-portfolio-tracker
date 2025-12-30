import { ScrollView, Text, View, TouchableOpacity, FlatList, Alert, TextInput } from 'react-native';
import { useState, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { HoldingCard } from '@/components/HoldingCard';
import { PortfolioCard } from '@/components/PortfolioCard';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useApp } from '@/context/AppContext';
import { calculatePortfolioValue, calculateDailyChange } from '@/lib/calculations';
import { useColors } from '@/hooks/use-colors';
import type { Portfolio } from '@/types';

export default function PortfolioScreen() {
  const colors = useColors();
  const router = useRouter();
  const { state, addPortfolio, deletePortfolio } = useApp();
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null);
  const [showAddPortfolio, setShowAddPortfolio] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState('');

  // Get holdings for selected portfolio or all holdings
  const filteredHoldings = useMemo(() => {
    if (!selectedPortfolioId) {
      return state.holdings;
    }
    return state.holdings.filter((h) => h.portfolioId === selectedPortfolioId);
  }, [state.holdings, selectedPortfolioId]);

  const portfolioStats = useMemo(() => {
    return calculatePortfolioValue(filteredHoldings, state.stockQuotes);
  }, [filteredHoldings, state.stockQuotes]);

  const dailyStats = useMemo(() => {
    return calculateDailyChange(filteredHoldings, state.stockQuotes);
  }, [filteredHoldings, state.stockQuotes]);

  const handleAddPortfolio = async () => {
    if (!newPortfolioName.trim()) {
      Alert.alert('Error', 'Please enter a portfolio name');
      return;
    }
    await addPortfolio(newPortfolioName.trim());
    setNewPortfolioName('');
    setShowAddPortfolio(false);
  };

  const handleDeletePortfolio = (portfolio: Portfolio) => {
    Alert.alert(
      'Delete Portfolio',
      `Are you sure you want to delete "${portfolio.name}"? This will also delete all holdings and transactions in this portfolio.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deletePortfolio(portfolio.id);
            if (selectedPortfolioId === portfolio.id) {
              setSelectedPortfolioId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View className="px-5 pt-4 pb-2">
          <Text className="text-foreground text-2xl font-bold">Portfolio</Text>
          <Text className="text-muted text-sm">Manage your investments</Text>
        </View>

        {/* Portfolio Selector */}
        <View className="px-5 py-3">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-foreground text-lg font-semibold">Portfolios</Text>
            <TouchableOpacity
              onPress={() => setShowAddPortfolio(!showAddPortfolio)}
              activeOpacity={0.7}
              className="flex-row items-center"
            >
              <IconSymbol name="plus.circle.fill" size={20} color={colors.tint} />
              <Text className="text-primary text-sm ml-1">Add</Text>
            </TouchableOpacity>
          </View>

          {/* Add Portfolio Form */}
          {showAddPortfolio && (
            <View className="bg-surface rounded-xl p-4 mb-3 border border-border">
              <TextInput
                value={newPortfolioName}
                onChangeText={setNewPortfolioName}
                placeholder="Portfolio name"
                placeholderTextColor={colors.muted}
                className="bg-background rounded-lg px-4 py-3 text-foreground mb-3 border border-border"
                returnKeyType="done"
                onSubmitEditing={handleAddPortfolio}
              />
              <View className="flex-row justify-end">
                <TouchableOpacity
                  onPress={() => setShowAddPortfolio(false)}
                  className="px-4 py-2 mr-2"
                >
                  <Text className="text-muted">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleAddPortfolio}
                  className="bg-primary px-4 py-2 rounded-lg"
                >
                  <Text className="text-background font-medium">Create</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Portfolio Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              onPress={() => setSelectedPortfolioId(null)}
              style={[
                {
                  backgroundColor: !selectedPortfolioId ? colors.tint : colors.surface,
                  borderColor: colors.border,
                },
              ]}
              className="px-4 py-2 rounded-full mr-2 border"
            >
              <Text
                style={{ color: !selectedPortfolioId ? colors.background : colors.foreground }}
                className="font-medium"
              >
                All
              </Text>
            </TouchableOpacity>

            {state.portfolios.map((portfolio) => (
              <TouchableOpacity
                key={portfolio.id}
                onPress={() => setSelectedPortfolioId(portfolio.id)}
                onLongPress={() => handleDeletePortfolio(portfolio)}
                style={[
                  {
                    backgroundColor:
                      selectedPortfolioId === portfolio.id ? colors.tint : colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                className="px-4 py-2 rounded-full mr-2 border"
              >
                <Text
                  style={{
                    color:
                      selectedPortfolioId === portfolio.id ? colors.background : colors.foreground,
                  }}
                  className="font-medium"
                >
                  {portfolio.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Portfolio Summary */}
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
          />
        </View>

        {/* Holdings List */}
        <View className="px-5 py-3">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-foreground text-lg font-semibold">Holdings</Text>
            <TouchableOpacity
              onPress={() => router.push('/add-transaction' as any)}
              activeOpacity={0.7}
              className="flex-row items-center"
            >
              <IconSymbol name="plus.circle.fill" size={20} color={colors.tint} />
              <Text className="text-primary text-sm ml-1">Add Stock</Text>
            </TouchableOpacity>
          </View>

          {filteredHoldings.length === 0 ? (
            <View className="bg-surface rounded-xl p-6 items-center border border-border">
              <Text className="text-muted text-center mb-2">No holdings in this portfolio</Text>
              <Text className="text-muted text-center text-sm">
                Add stocks or import from CSV to get started
              </Text>
            </View>
          ) : (
            filteredHoldings.map((holding) => (
              <HoldingCard
                key={holding.id}
                holding={holding}
                quote={state.stockQuotes[holding.symbol]}
                showInTHB={state.settings.showInTHB}
                usdThbRate={state.currencyRate.usdThb}
              />
            ))
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
