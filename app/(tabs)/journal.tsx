import { ScrollView, Text, View, TouchableOpacity, TextInput, FlatList } from 'react-native';
import { useState, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { TransactionCard } from '@/components/TransactionCard';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/use-colors';
import type { Transaction, TransactionType } from '@/types';

type FilterType = 'ALL' | 'BUY' | 'SELL';

export default function JournalScreen() {
  const colors = useColors();
  const router = useRouter();
  const { state } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('ALL');

  // Sort transactions by date (newest first) and filter
  const filteredTransactions = useMemo(() => {
    let filtered = [...state.transactions];

    // Filter by type
    if (filterType !== 'ALL') {
      filtered = filtered.filter((tx) => tx.type === filterType);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (tx) =>
          tx.symbol.toLowerCase().includes(query) ||
          tx.companyName.toLowerCase().includes(query)
      );
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return filtered;
  }, [state.transactions, filterType, searchQuery]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const buys = state.transactions.filter((tx) => tx.type === 'BUY');
    const sells = state.transactions.filter((tx) => tx.type === 'SELL');
    const totalBuyAmount = buys.reduce((sum, tx) => sum + tx.netAmount, 0);
    const totalSellAmount = sells.reduce((sum, tx) => sum + tx.netAmount, 0);
    return {
      totalTransactions: state.transactions.length,
      buyCount: buys.length,
      sellCount: sells.length,
      totalBuyAmount,
      totalSellAmount,
    };
  }, [state.transactions]);

  const filterOptions: { label: string; value: FilterType }[] = [
    { label: 'All', value: 'ALL' },
    { label: 'Buy', value: 'BUY' },
    { label: 'Sell', value: 'SELL' },
  ];

  return (
    <ScreenContainer>
      <View className="flex-1">
        {/* Header */}
        <View className="px-5 pt-4 pb-2">
          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-foreground text-2xl font-bold">Trade Journal</Text>
              <Text className="text-muted text-sm">
                {summaryStats.totalTransactions} transactions
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/add-transaction' as any)}
              activeOpacity={0.7}
              style={{ backgroundColor: colors.tint }}
              className="px-4 py-2 rounded-full flex-row items-center"
            >
              <IconSymbol name="plus.circle.fill" size={18} color={colors.background} />
              <Text className="text-background font-medium ml-1">Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Summary Stats */}
        <View className="px-5 py-3">
          <View className="flex-row">
            <View className="flex-1 bg-success/10 rounded-xl p-3 mr-2">
              <Text className="text-success text-xs font-medium">Buy Orders</Text>
              <Text className="text-success text-lg font-bold">{summaryStats.buyCount}</Text>
              <Text className="text-success/70 text-xs">
                ${summaryStats.totalBuyAmount.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </Text>
            </View>
            <View className="flex-1 bg-error/10 rounded-xl p-3 ml-2">
              <Text className="text-error text-xs font-medium">Sell Orders</Text>
              <Text className="text-error text-lg font-bold">{summaryStats.sellCount}</Text>
              <Text className="text-error/70 text-xs">
                ${summaryStats.totalSellAmount.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </Text>
            </View>
          </View>
        </View>

        {/* Search and Filter */}
        <View className="px-5 py-2">
          <View className="flex-row items-center bg-surface rounded-xl px-4 py-2 border border-border mb-3">
            <IconSymbol name="magnifyingglass" size={20} color={colors.muted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by symbol or company"
              placeholderTextColor={colors.muted}
              className="flex-1 ml-2 text-foreground"
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <IconSymbol name="xmark.circle.fill" size={20} color={colors.muted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Chips */}
          <View className="flex-row">
            {filterOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => setFilterType(option.value)}
                style={[
                  {
                    backgroundColor: filterType === option.value ? colors.tint : colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                className="px-4 py-2 rounded-full mr-2 border"
              >
                <Text
                  style={{
                    color: filterType === option.value ? colors.background : colors.foreground,
                  }}
                  className="font-medium text-sm"
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Transactions List */}
        <FlatList
          data={filteredTransactions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
          renderItem={({ item }) => <TransactionCard transaction={item} />}
          ListEmptyComponent={
            <View className="bg-surface rounded-xl p-6 items-center border border-border mt-4">
              <Text className="text-muted text-center mb-2">No transactions found</Text>
              <Text className="text-muted text-center text-sm">
                {searchQuery || filterType !== 'ALL'
                  ? 'Try adjusting your filters'
                  : 'Add transactions or import from CSV'}
              </Text>
            </View>
          }
        />
      </View>
    </ScreenContainer>
  );
}
