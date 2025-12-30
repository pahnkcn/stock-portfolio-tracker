import {
  ScrollView,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/use-colors';
import type { TransactionType } from '@/types';

export default function AddTransactionScreen() {
  const colors = useColors();
  const router = useRouter();
  const { state, addTransaction, addHolding, updateHolding } = useApp();

  const [transactionType, setTransactionType] = useState<TransactionType>('BUY');
  const [symbol, setSymbol] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [shares, setShares] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [commission, setCommission] = useState('0');
  const [notes, setNotes] = useState('');
  const [selectedPortfolioId, setSelectedPortfolioId] = useState(
    state.portfolios[0]?.id || ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    // Validation
    if (!symbol.trim()) {
      Alert.alert('Error', 'Please enter a stock symbol');
      return;
    }
    if (!shares || parseFloat(shares) <= 0) {
      Alert.alert('Error', 'Please enter a valid number of shares');
      return;
    }
    if (!price || parseFloat(price) <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }
    if (!selectedPortfolioId) {
      Alert.alert('Error', 'Please select a portfolio');
      return;
    }

    setIsSubmitting(true);

    try {
      const sharesNum = parseFloat(shares);
      const priceNum = parseFloat(price);
      const commissionNum = parseFloat(commission) || 0;
      const grossAmount = sharesNum * priceNum;
      const netAmount = transactionType === 'BUY' 
        ? grossAmount + commissionNum 
        : grossAmount - commissionNum;
      const currentRate = state.currencyRate.usdThb;

      // Add transaction
      await addTransaction({
        portfolioId: selectedPortfolioId,
        symbol: symbol.toUpperCase().trim(),
        companyName: companyName.trim() || symbol.toUpperCase().trim(),
        type: transactionType,
        shares: sharesNum,
        price: priceNum,
        date: date,
        grossAmount,
        commission: commissionNum,
        vat: 0,
        netAmount,
        exchangeRate: currentRate,
        notes: notes.trim() || undefined,
      });

      // Update or create holding
      const existingHolding = state.holdings.find(
        (h) => h.symbol === symbol.toUpperCase().trim() && h.portfolioId === selectedPortfolioId
      );

      if (existingHolding) {
        if (transactionType === 'BUY') {
          const newTotalShares = existingHolding.shares + sharesNum;
          const newTotalCost = existingHolding.shares * existingHolding.avgCost + sharesNum * priceNum;
          const newAvgCost = newTotalCost / newTotalShares;
          
          // Calculate weighted average exchange rate
          const existingCostThb = existingHolding.shares * existingHolding.avgCost * existingHolding.avgExchangeRate;
          const newCostThb = sharesNum * priceNum * currentRate;
          const newAvgExchangeRate = (existingCostThb + newCostThb) / (newTotalCost);
          
          await updateHolding(existingHolding.id, {
            shares: newTotalShares,
            avgCost: newAvgCost,
            avgExchangeRate: newAvgExchangeRate,
            lots: [
              ...existingHolding.lots,
              {
                id: Date.now().toString(),
                shares: sharesNum,
                price: priceNum,
                date: date,
                commission: commissionNum,
                exchangeRate: currentRate,
              },
            ],
          });
        } else {
          // SELL - reduce shares
          const newShares = existingHolding.shares - sharesNum;
          if (newShares <= 0) {
            // Remove holding if all shares sold
            // For simplicity, we'll just set shares to 0
            await updateHolding(existingHolding.id, { shares: 0 });
          } else {
            await updateHolding(existingHolding.id, { shares: newShares });
          }
        }
      } else if (transactionType === 'BUY') {
        // Create new holding
        await addHolding({
          portfolioId: selectedPortfolioId,
          symbol: symbol.toUpperCase().trim(),
          companyName: companyName.trim() || symbol.toUpperCase().trim(),
          shares: sharesNum,
          avgCost: priceNum,
          avgExchangeRate: currentRate,
          lots: [
            {
              id: Date.now().toString(),
              shares: sharesNum,
              price: priceNum,
              date: date,
              commission: commissionNum,
              exchangeRate: currentRate,
            },
          ],
        });
      }

      Alert.alert('Success', 'Transaction added successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Error adding transaction:', error);
      Alert.alert('Error', 'Failed to add transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1 p-4">
          {/* Header */}
          <View className="flex-row items-center mb-6">
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ padding: 8 }}
            >
              <Text style={{ color: colors.primary, fontSize: 16 }}>Cancel</Text>
            </TouchableOpacity>
            <Text className="flex-1 text-center text-xl font-bold text-foreground">
              Add Transaction
            </Text>
            <View style={{ width: 60 }} />
          </View>

          {/* Transaction Type Toggle */}
          <View className="flex-row mb-4 bg-surface rounded-xl p-1">
            <TouchableOpacity
              onPress={() => setTransactionType('BUY')}
              className="flex-1 py-3 rounded-lg"
              style={{
                backgroundColor: transactionType === 'BUY' ? colors.success : 'transparent',
              }}
            >
              <Text
                className="text-center font-semibold"
                style={{
                  color: transactionType === 'BUY' ? '#fff' : colors.muted,
                }}
              >
                BUY
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setTransactionType('SELL')}
              className="flex-1 py-3 rounded-lg"
              style={{
                backgroundColor: transactionType === 'SELL' ? colors.error : 'transparent',
              }}
            >
              <Text
                className="text-center font-semibold"
                style={{
                  color: transactionType === 'SELL' ? '#fff' : colors.muted,
                }}
              >
                SELL
              </Text>
            </TouchableOpacity>
          </View>

          {/* Portfolio Selector */}
          <View className="mb-4">
            <Text className="text-sm text-muted mb-2">Portfolio</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {state.portfolios.map((portfolio) => (
                  <TouchableOpacity
                    key={portfolio.id}
                    onPress={() => setSelectedPortfolioId(portfolio.id)}
                    className="px-4 py-2 rounded-lg"
                    style={{
                      backgroundColor:
                        selectedPortfolioId === portfolio.id
                          ? colors.primary
                          : colors.surface,
                    }}
                  >
                    <Text
                      style={{
                        color:
                          selectedPortfolioId === portfolio.id
                            ? '#fff'
                            : colors.foreground,
                      }}
                    >
                      {portfolio.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Form Fields */}
          <View className="gap-4">
            {/* Symbol */}
            <View>
              <Text className="text-sm text-muted mb-2">Symbol *</Text>
              <TextInput
                value={symbol}
                onChangeText={setSymbol}
                placeholder="e.g. AAPL"
                placeholderTextColor={colors.muted}
                autoCapitalize="characters"
                className="bg-surface p-4 rounded-xl text-foreground"
                style={{ color: colors.foreground }}
              />
            </View>

            {/* Company Name */}
            <View>
              <Text className="text-sm text-muted mb-2">Company Name</Text>
              <TextInput
                value={companyName}
                onChangeText={setCompanyName}
                placeholder="e.g. Apple Inc."
                placeholderTextColor={colors.muted}
                className="bg-surface p-4 rounded-xl text-foreground"
                style={{ color: colors.foreground }}
              />
            </View>

            {/* Shares */}
            <View>
              <Text className="text-sm text-muted mb-2">Shares *</Text>
              <TextInput
                value={shares}
                onChangeText={setShares}
                placeholder="0"
                placeholderTextColor={colors.muted}
                keyboardType="decimal-pad"
                className="bg-surface p-4 rounded-xl text-foreground"
                style={{ color: colors.foreground }}
              />
            </View>

            {/* Price */}
            <View>
              <Text className="text-sm text-muted mb-2">Price per Share (USD) *</Text>
              <TextInput
                value={price}
                onChangeText={setPrice}
                placeholder="0.00"
                placeholderTextColor={colors.muted}
                keyboardType="decimal-pad"
                className="bg-surface p-4 rounded-xl text-foreground"
                style={{ color: colors.foreground }}
              />
            </View>

            {/* Date */}
            <View>
              <Text className="text-sm text-muted mb-2">Date</Text>
              <TextInput
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.muted}
                className="bg-surface p-4 rounded-xl text-foreground"
                style={{ color: colors.foreground }}
              />
            </View>

            {/* Commission */}
            <View>
              <Text className="text-sm text-muted mb-2">Commission (USD)</Text>
              <TextInput
                value={commission}
                onChangeText={setCommission}
                placeholder="0.00"
                placeholderTextColor={colors.muted}
                keyboardType="decimal-pad"
                className="bg-surface p-4 rounded-xl text-foreground"
                style={{ color: colors.foreground }}
              />
            </View>

            {/* Notes */}
            <View>
              <Text className="text-sm text-muted mb-2">Notes</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Optional notes..."
                placeholderTextColor={colors.muted}
                multiline
                numberOfLines={3}
                className="bg-surface p-4 rounded-xl text-foreground"
                style={{ color: colors.foreground, minHeight: 80 }}
              />
            </View>

            {/* Current Exchange Rate Info */}
            <View className="bg-surface p-4 rounded-xl">
              <Text className="text-sm text-muted">Current Exchange Rate</Text>
              <Text className="text-lg font-semibold text-foreground">
                1 USD = ฿{state.currencyRate.usdThb.toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting}
            className="mt-6 mb-8 py-4 rounded-xl"
            style={{
              backgroundColor: transactionType === 'BUY' ? colors.success : colors.error,
              opacity: isSubmitting ? 0.6 : 1,
            }}
          >
            <Text className="text-center text-white font-bold text-lg">
              {isSubmitting ? 'Adding...' : `Add ${transactionType} Transaction`}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
