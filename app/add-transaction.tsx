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
          
          await updateHolding(existingHolding.id, {
            shares: newTotalShares,
            avgCost: newAvgCost,
            lots: [
              ...existingHolding.lots,
              {
                id: Date.now().toString(),
                shares: sharesNum,
                price: priceNum,
                date: date,
                commission: commissionNum,
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
          lots: [
            {
              id: Date.now().toString(),
              shares: sharesNum,
              price: priceNum,
              date: date,
              commission: commissionNum,
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
    <ScreenContainer edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} className="px-5">
          {/* Transaction Type */}
          <View className="py-4">
            <Text className="text-foreground font-medium mb-2">Transaction Type</Text>
            <View className="flex-row">
              <TouchableOpacity
                onPress={() => setTransactionType('BUY')}
                style={[
                  {
                    backgroundColor: transactionType === 'BUY' ? colors.success : colors.surface,
                    borderColor: transactionType === 'BUY' ? colors.success : colors.border,
                  },
                ]}
                className="flex-1 py-3 rounded-l-xl border items-center"
              >
                <Text
                  style={{
                    color: transactionType === 'BUY' ? '#fff' : colors.foreground,
                  }}
                  className="font-semibold"
                >
                  BUY
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setTransactionType('SELL')}
                style={[
                  {
                    backgroundColor: transactionType === 'SELL' ? colors.error : colors.surface,
                    borderColor: transactionType === 'SELL' ? colors.error : colors.border,
                  },
                ]}
                className="flex-1 py-3 rounded-r-xl border items-center"
              >
                <Text
                  style={{
                    color: transactionType === 'SELL' ? '#fff' : colors.foreground,
                  }}
                  className="font-semibold"
                >
                  SELL
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Portfolio Selection */}
          <View className="py-2">
            <Text className="text-foreground font-medium mb-2">Portfolio</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {state.portfolios.map((portfolio) => (
                <TouchableOpacity
                  key={portfolio.id}
                  onPress={() => setSelectedPortfolioId(portfolio.id)}
                  style={[
                    {
                      backgroundColor:
                        selectedPortfolioId === portfolio.id ? colors.tint : colors.surface,
                      borderColor:
                        selectedPortfolioId === portfolio.id ? colors.tint : colors.border,
                    },
                  ]}
                  className="px-4 py-2 rounded-full mr-2 border"
                >
                  <Text
                    style={{
                      color:
                        selectedPortfolioId === portfolio.id
                          ? colors.background
                          : colors.foreground,
                    }}
                    className="font-medium"
                  >
                    {portfolio.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Symbol */}
          <View className="py-2">
            <Text className="text-foreground font-medium mb-2">Symbol *</Text>
            <TextInput
              value={symbol}
              onChangeText={(text) => setSymbol(text.toUpperCase())}
              placeholder="e.g., AAPL, NVDA"
              placeholderTextColor={colors.muted}
              autoCapitalize="characters"
              className="bg-surface rounded-xl px-4 py-3 text-foreground border border-border"
            />
          </View>

          {/* Company Name */}
          <View className="py-2">
            <Text className="text-foreground font-medium mb-2">Company Name</Text>
            <TextInput
              value={companyName}
              onChangeText={setCompanyName}
              placeholder="e.g., Apple Inc."
              placeholderTextColor={colors.muted}
              className="bg-surface rounded-xl px-4 py-3 text-foreground border border-border"
            />
          </View>

          {/* Shares and Price Row */}
          <View className="flex-row py-2">
            <View className="flex-1 mr-2">
              <Text className="text-foreground font-medium mb-2">Shares *</Text>
              <TextInput
                value={shares}
                onChangeText={setShares}
                placeholder="0"
                placeholderTextColor={colors.muted}
                keyboardType="decimal-pad"
                className="bg-surface rounded-xl px-4 py-3 text-foreground border border-border"
              />
            </View>
            <View className="flex-1 ml-2">
              <Text className="text-foreground font-medium mb-2">Price ($) *</Text>
              <TextInput
                value={price}
                onChangeText={setPrice}
                placeholder="0.00"
                placeholderTextColor={colors.muted}
                keyboardType="decimal-pad"
                className="bg-surface rounded-xl px-4 py-3 text-foreground border border-border"
              />
            </View>
          </View>

          {/* Date */}
          <View className="py-2">
            <Text className="text-foreground font-medium mb-2">Date</Text>
            <TextInput
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.muted}
              className="bg-surface rounded-xl px-4 py-3 text-foreground border border-border"
            />
          </View>

          {/* Commission */}
          <View className="py-2">
            <Text className="text-foreground font-medium mb-2">Commission ($)</Text>
            <TextInput
              value={commission}
              onChangeText={setCommission}
              placeholder="0.00"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
              className="bg-surface rounded-xl px-4 py-3 text-foreground border border-border"
            />
          </View>

          {/* Notes */}
          <View className="py-2">
            <Text className="text-foreground font-medium mb-2">Notes</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Add notes about this trade..."
              placeholderTextColor={colors.muted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              className="bg-surface rounded-xl px-4 py-3 text-foreground border border-border min-h-[80px]"
            />
          </View>

          {/* Summary */}
          {shares && price && parseFloat(shares) > 0 && parseFloat(price) > 0 && (
            <View className="py-4 mt-2 bg-surface rounded-xl p-4 border border-border">
              <Text className="text-foreground font-semibold mb-2">Summary</Text>
              <View className="flex-row justify-between mb-1">
                <Text className="text-muted">Gross Amount</Text>
                <Text className="text-foreground">
                  ${(parseFloat(shares) * parseFloat(price)).toFixed(2)}
                </Text>
              </View>
              <View className="flex-row justify-between mb-1">
                <Text className="text-muted">Commission</Text>
                <Text className="text-foreground">${parseFloat(commission || '0').toFixed(2)}</Text>
              </View>
              <View className="flex-row justify-between pt-2 border-t border-border">
                <Text className="text-foreground font-semibold">Net Amount</Text>
                <Text className="text-foreground font-semibold">
                  $
                  {(
                    parseFloat(shares) * parseFloat(price) +
                    (transactionType === 'BUY' ? 1 : -1) * parseFloat(commission || '0')
                  ).toFixed(2)}
                </Text>
              </View>
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting}
            style={[
              {
                backgroundColor: transactionType === 'BUY' ? colors.success : colors.error,
                opacity: isSubmitting ? 0.6 : 1,
              },
            ]}
            className="py-4 rounded-xl mt-6 items-center"
          >
            <Text className="text-white font-semibold text-lg">
              {isSubmitting ? 'Adding...' : `Add ${transactionType} Order`}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
