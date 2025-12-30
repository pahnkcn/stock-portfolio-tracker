import {
  ScrollView,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { SymbolAutocomplete } from '@/components/SymbolAutocomplete';
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

  const handleSelectSymbol = useCallback((selectedSymbol: string, selectedCompanyName: string) => {
    setSymbol(selectedSymbol);
    setCompanyName(selectedCompanyName);
  }, []);

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
        style={styles.flex1}
      >
        <ScrollView 
          style={styles.flex1} 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.cancelButton}
            >
              <Text style={[styles.cancelText, { color: colors.primary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              Add Transaction
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Transaction Type Toggle */}
          <View style={[styles.toggleContainer, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              onPress={() => setTransactionType('BUY')}
              style={[
                styles.toggleButton,
                {
                  backgroundColor: transactionType === 'BUY' ? colors.success : 'transparent',
                },
              ]}
            >
              <Text
                style={[
                  styles.toggleText,
                  {
                    color: transactionType === 'BUY' ? '#fff' : colors.foreground,
                    opacity: transactionType === 'BUY' ? 1 : 0.6,
                  },
                ]}
              >
                BUY
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setTransactionType('SELL')}
              style={[
                styles.toggleButton,
                {
                  backgroundColor: transactionType === 'SELL' ? colors.error : 'transparent',
                },
              ]}
            >
              <Text
                style={[
                  styles.toggleText,
                  {
                    color: transactionType === 'SELL' ? '#fff' : colors.foreground,
                    opacity: transactionType === 'SELL' ? 1 : 0.6,
                  },
                ]}
              >
                SELL
              </Text>
            </TouchableOpacity>
          </View>

          {/* Portfolio Selector */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: colors.foreground, opacity: 0.7 }]}>Portfolio</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.portfolioRow}>
                {state.portfolios.map((portfolio) => (
                  <TouchableOpacity
                    key={portfolio.id}
                    onPress={() => setSelectedPortfolioId(portfolio.id)}
                    style={[
                      styles.portfolioButton,
                      {
                        backgroundColor:
                          selectedPortfolioId === portfolio.id
                            ? colors.primary
                            : colors.surface,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color:
                          selectedPortfolioId === portfolio.id
                            ? '#fff'
                            : colors.foreground,
                        fontWeight: '500',
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
          <View style={styles.formContainer}>
            {/* Symbol with Autocomplete */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: colors.foreground, opacity: 0.7 }]}>Symbol *</Text>
              <SymbolAutocomplete
                value={symbol}
                onChangeText={setSymbol}
                onSelectSymbol={handleSelectSymbol}
                placeholder="Search symbol (e.g., AAPL)"
              />
            </View>

            {/* Company Name (auto-filled) */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: colors.foreground, opacity: 0.7 }]}>Company Name</Text>
              <TextInput
                value={companyName}
                onChangeText={setCompanyName}
                placeholder="Auto-filled when selecting symbol"
                placeholderTextColor={colors.muted}
                style={[
                  styles.input,
                  { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border },
                ]}
              />
            </View>

            {/* Shares */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: colors.foreground, opacity: 0.7 }]}>Shares *</Text>
              <TextInput
                value={shares}
                onChangeText={setShares}
                placeholder="0"
                placeholderTextColor={colors.muted}
                keyboardType="decimal-pad"
                style={[
                  styles.input,
                  { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border },
                ]}
              />
            </View>

            {/* Price */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: colors.foreground, opacity: 0.7 }]}>Price per Share (USD) *</Text>
              <TextInput
                value={price}
                onChangeText={setPrice}
                placeholder="0.00"
                placeholderTextColor={colors.muted}
                keyboardType="decimal-pad"
                style={[
                  styles.input,
                  { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border },
                ]}
              />
            </View>

            {/* Date */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: colors.foreground, opacity: 0.7 }]}>Date</Text>
              <TextInput
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.muted}
                style={[
                  styles.input,
                  { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border },
                ]}
              />
            </View>

            {/* Commission */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: colors.foreground, opacity: 0.7 }]}>Commission (USD)</Text>
              <TextInput
                value={commission}
                onChangeText={setCommission}
                placeholder="0.00"
                placeholderTextColor={colors.muted}
                keyboardType="decimal-pad"
                style={[
                  styles.input,
                  { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border },
                ]}
              />
            </View>

            {/* Notes */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: colors.foreground, opacity: 0.7 }]}>Notes</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Optional notes..."
                placeholderTextColor={colors.muted}
                multiline
                numberOfLines={3}
                style={[
                  styles.input,
                  styles.textArea,
                  { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border },
                ]}
              />
            </View>

            {/* Current Exchange Rate Info */}
            <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.infoLabel, { color: colors.foreground, opacity: 0.7 }]}>Current Exchange Rate</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                1 USD = ฿{state.currencyRate.usdThb.toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting}
            style={[
              styles.submitButton,
              {
                backgroundColor: transactionType === 'BUY' ? colors.success : colors.error,
                opacity: isSubmitting ? 0.6 : 1,
              },
            ]}
          >
            <Text style={styles.submitText}>
              {isSubmitting ? 'Adding...' : `Add ${transactionType} Transaction`}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  cancelButton: {
    padding: 8,
  },
  cancelText: {
    fontSize: 16,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 60,
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
  },
  toggleText: {
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 15,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  portfolioRow: {
    flexDirection: 'row',
    gap: 8,
  },
  portfolioButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  formContainer: {
    gap: 4,
  },
  input: {
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  submitButton: {
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
  },
  submitText: {
    textAlign: 'center',
    color: '#fff',
    fontWeight: '700',
    fontSize: 17,
  },
});
