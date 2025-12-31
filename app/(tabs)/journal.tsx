import { Text, View, TouchableOpacity, TextInput, FlatList, Modal, Platform } from 'react-native';
import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { ScreenContainer } from '@/components/screen-container';
import { TransactionCard } from '@/components/TransactionCard';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/use-colors';

type FilterType = 'ALL' | 'BUY' | 'SELL';

export default function JournalScreen() {
  const colors = useColors();
  const router = useRouter();
  const { state, deleteMultipleTransactions } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('ALL');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Selection mode handlers
  const handleLongPress = useCallback((transactionId: string) => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedIds(new Set([transactionId]));
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  }, [isSelectionMode]);

  const handleSelect = useCallback((transactionId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(transactionId)) {
        newSet.delete(transactionId);
      } else {
        newSet.add(transactionId);
      }
      // If no items selected, exit selection mode
      if (newSet.size === 0) {
        setIsSelectionMode(false);
      }
      return newSet;
    });
  }, []);

  const handleCancelSelection = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const handleSelectAll = useCallback(() => {
    const allIds = new Set(filteredTransactions.map(tx => tx.id));
    setSelectedIds(allIds);
  }, [filteredTransactions]);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Check if all filtered transactions are selected
  const isAllSelected = useMemo(() => {
    if (filteredTransactions.length === 0) return false;
    return filteredTransactions.every(tx => selectedIds.has(tx.id));
  }, [filteredTransactions, selectedIds]);

  // Reset selection mode when screen loses focus (navigate away)
  useFocusEffect(
    useCallback(() => {
      return () => {
        // Cleanup when screen loses focus
        setIsSelectionMode(false);
        setSelectedIds(new Set());
      };
    }, [])
  );

  const handleDeleteSelected = async () => {
    setShowDeleteConfirm(false);
    setIsDeleting(true);

    try {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }

      await deleteMultipleTransactions(Array.from(selectedIds));

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // Reset selection mode
      setIsSelectionMode(false);
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Error deleting transactions:', error);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <ScreenContainer>
      <View className="flex-1">
        {/* Header */}
        <View className="px-5 pt-4 pb-2">
          {isSelectionMode ? (
            <View className="flex-row justify-between items-center">
              <View className="flex-row items-center">
                <TouchableOpacity
                  onPress={handleCancelSelection}
                  className="mr-3 p-2"
                >
                  <IconSymbol name="xmark" size={24} color={colors.foreground} />
                </TouchableOpacity>
                <Text className="text-foreground text-xl font-bold">
                  {selectedIds.size} selected
                </Text>
              </View>
              <View className="flex-row items-center">
                <TouchableOpacity
                  onPress={isAllSelected ? handleDeselectAll : handleSelectAll}
                  className="mr-3 px-3 py-2"
                >
                  <Text style={{ color: colors.primary }} className="font-medium">
                    {isAllSelected ? 'Deselect All' : 'Select All'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowDeleteConfirm(true)}
                  activeOpacity={0.7}
                  style={{ backgroundColor: selectedIds.size === 0 ? colors.muted : colors.error }}
                  className="px-4 py-2 rounded-full flex-row items-center"
                  disabled={selectedIds.size === 0 || isDeleting}
                >
                  <IconSymbol name="trash.fill" size={18} color="#fff" />
                  <Text className="text-white font-medium ml-1">
                    {isDeleting ? '...' : selectedIds.size}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
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
          )}
        </View>

        {/* Summary Stats */}
        <View className="px-5 py-3">
          <View className="flex-row">
            <View
              className="flex-1 rounded-xl p-3 mr-2"
              style={{
                backgroundColor: colors.success + '15',
                borderWidth: 1,
                borderColor: colors.success,
              }}
            >
              <Text style={{ color: colors.success }} className="text-xs font-medium">Buy Orders</Text>
              <Text style={{ color: colors.success }} className="text-xl font-bold">{summaryStats.buyCount}</Text>
              <Text style={{ color: colors.success }} className="text-sm font-semibold">
                ${summaryStats.totalBuyAmount.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </Text>
            </View>
            <View
              className="flex-1 rounded-xl p-3 ml-2"
              style={{
                backgroundColor: colors.error + '15',
                borderWidth: 1,
                borderColor: colors.error,
              }}
            >
              <Text style={{ color: colors.error }} className="text-xs font-medium">Sell Orders</Text>
              <Text style={{ color: colors.error }} className="text-xl font-bold">{summaryStats.sellCount}</Text>
              <Text style={{ color: colors.error }} className="text-sm font-semibold">
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
          renderItem={({ item, index }) => (
            <TransactionCard
              transaction={item}
              index={index}
              isSelectionMode={isSelectionMode}
              isSelected={selectedIds.has(item.id)}
              onLongPress={() => handleLongPress(item.id)}
              onSelect={() => handleSelect(item.id)}
            />
          )}
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

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 340,
              backgroundColor: colors.surface,
              borderRadius: 20,
              padding: 24,
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: colors.error + '20',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <IconSymbol name="trash.fill" size={32} color={colors.error} />
            </View>
            <Text
              style={{
                fontSize: 20,
                fontWeight: '700',
                color: colors.foreground,
                textAlign: 'center',
                marginBottom: 8,
              }}
            >
              Delete {selectedIds.size} Transaction{selectedIds.size > 1 ? 's' : ''}?
            </Text>
            <Text
              style={{
                fontSize: 15,
                color: colors.muted,
                textAlign: 'center',
                lineHeight: 22,
                marginBottom: 24,
              }}
            >
              This action cannot be undone. The selected transactions will be permanently deleted.
            </Text>
            <View style={{ width: '100%', gap: 12 }}>
              <TouchableOpacity
                onPress={() => setShowDeleteConfirm(false)}
                style={{
                  width: '100%',
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDeleteSelected}
                style={{
                  width: '100%',
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: 'center',
                  backgroundColor: colors.error,
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}>
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
