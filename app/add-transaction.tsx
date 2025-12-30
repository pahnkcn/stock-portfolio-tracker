import {
  ScrollView,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Modal,
} from 'react-native';
import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { ScreenContainer } from '@/components/screen-container';
import { SymbolAutocomplete } from '@/components/SymbolAutocomplete';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/use-colors';
import { getApiBaseUrl } from '@/constants/oauth';
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
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [commission, setCommission] = useState('0');
  const [notes, setNotes] = useState('');
  const [exchangeRate, setExchangeRate] = useState(state.currencyRate.usdThb.toString());
  const [selectedPortfolioId, setSelectedPortfolioId] = useState(
    state.portfolios[0]?.id || ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Check if API key is configured
  const hasApiKey = !!(
    state.settings.apiKeys.yahooFinance ||
    state.settings.apiKeys.alphaVantage ||
    state.settings.apiKeys.finnhub ||
    state.settings.apiKeys.twelveData ||
    state.settings.apiKeys.polygonIo
  );

  // Auto-fetch price when symbol is selected and API key is available
  const fetchCurrentPrice = useCallback(async (stockSymbol: string) => {
    if (!hasApiKey || !stockSymbol) return;
    
    setIsFetchingPrice(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/trpc/stock.getQuote?input=${encodeURIComponent(JSON.stringify({ symbol: stockSymbol }))}`);
      const data = await response.json();
      const quote = data?.result?.data;
      if (quote && quote.price) {
        setPrice(quote.price.toFixed(2));
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } catch (error) {
      console.error('Error fetching price:', error);
    } finally {
      setIsFetchingPrice(false);
    }
  }, [hasApiKey]);

  const handleSelectSymbol = useCallback((selectedSymbol: string, selectedCompanyName: string) => {
    setSymbol(selectedSymbol);
    setCompanyName(selectedCompanyName);
    // Auto-fetch price when symbol is selected
    fetchCurrentPrice(selectedSymbol);
  }, [fetchCurrentPrice]);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const formatDate = (d: Date) => {
    return d.toISOString().split('T')[0];
  };

  const resetForm = () => {
    setSymbol('');
    setCompanyName('');
    setShares('');
    setPrice('');
    setDate(new Date());
    setCommission('0');
    setNotes('');
    setExchangeRate(state.currencyRate.usdThb.toString());
  };

  const handleSubmit = async () => {
    // Validation
    if (!symbol.trim()) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      return;
    }
    if (!shares || parseFloat(shares) <= 0) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      return;
    }
    if (!price || parseFloat(price) <= 0) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      return;
    }
    if (!selectedPortfolioId) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
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
      const currentRate = parseFloat(exchangeRate) || state.currencyRate.usdThb;

      // Add transaction
      await addTransaction({
        portfolioId: selectedPortfolioId,
        symbol: symbol.toUpperCase().trim(),
        companyName: companyName.trim() || symbol.toUpperCase().trim(),
        type: transactionType,
        shares: sharesNum,
        price: priceNum,
        date: formatDate(date),
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
                date: formatDate(date),
                commission: commissionNum,
                exchangeRate: currentRate,
              },
            ],
          });
        } else {
          // SELL - reduce shares
          const newShares = existingHolding.shares - sharesNum;
          if (newShares <= 0) {
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
              date: formatDate(date),
              commission: commissionNum,
              exchangeRate: currentRate,
            },
          ],
        });
      }

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      // Show success modal
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error adding transaction:', error);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddAnother = () => {
    setShowSuccessModal(false);
    resetForm();
  };

  const handleGoBack = () => {
    setShowSuccessModal(false);
    router.back();
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
              <View style={styles.labelRow}>
                <Text style={[styles.label, { color: colors.foreground, opacity: 0.7 }]}>Price per Share (USD) *</Text>
                {isFetchingPrice && (
                  <Text style={[styles.fetchingText, { color: colors.primary }]}>Fetching...</Text>
                )}
                {hasApiKey && !isFetchingPrice && symbol && (
                  <TouchableOpacity onPress={() => fetchCurrentPrice(symbol)}>
                    <Text style={[styles.refreshPriceText, { color: colors.primary }]}>↻ Refresh</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TextInput
                value={price}
                onChangeText={setPrice}
                placeholder={hasApiKey ? "Auto-filled from API" : "0.00"}
                placeholderTextColor={colors.muted}
                keyboardType="decimal-pad"
                style={[
                  styles.input,
                  { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border },
                ]}
              />
              {!hasApiKey && (
                <Text style={[styles.hintText, { color: colors.muted }]}>
                  Add API key in Settings for auto-fill
                </Text>
              )}
            </View>

            {/* Date with Date Picker */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: colors.foreground, opacity: 0.7 }]}>Date</Text>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                style={[
                  styles.input,
                  styles.dateInput,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Text style={{ color: colors.foreground, fontSize: 16 }}>
                  {formatDate(date)}
                </Text>
                <Text style={{ color: colors.muted }}>📅</Text>
              </TouchableOpacity>
              
              {showDatePicker && (
                <View>
                  <DateTimePicker
                    value={date}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleDateChange}
                    maximumDate={new Date()}
                  />
                  {Platform.OS === 'ios' && (
                    <TouchableOpacity
                      onPress={() => setShowDatePicker(false)}
                      style={[styles.datePickerDone, { backgroundColor: colors.primary }]}
                    >
                      <Text style={{ color: '#fff', fontWeight: '600' }}>Done</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

            {/* Exchange Rate (Editable) */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: colors.foreground, opacity: 0.7 }]}>Exchange Rate (USD/THB)</Text>
              <TextInput
                value={exchangeRate}
                onChangeText={setExchangeRate}
                placeholder="35.00"
                placeholderTextColor={colors.muted}
                keyboardType="decimal-pad"
                style={[
                  styles.input,
                  { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border },
                ]}
              />
              <Text style={[styles.hintText, { color: colors.muted }]}>
                1 USD = ฿{parseFloat(exchangeRate) || 0} THB
              </Text>
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

            {/* Transaction Summary */}
            {shares && price && (
              <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.summaryTitle, { color: colors.foreground }]}>Transaction Summary</Text>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.muted }]}>Gross Amount (USD)</Text>
                  <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                    ${(parseFloat(shares) * parseFloat(price)).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.muted }]}>Gross Amount (THB)</Text>
                  <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                    ฿{(parseFloat(shares) * parseFloat(price) * (parseFloat(exchangeRate) || 0)).toFixed(2)}
                  </Text>
                </View>
              </View>
            )}
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

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={handleGoBack}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={styles.successIcon}>✅</Text>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              Transaction Added!
            </Text>
            <Text style={[styles.modalMessage, { color: colors.muted }]}>
              {transactionType} {shares} shares of {symbol.toUpperCase()} at ${price}
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={handleAddAnother}
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.modalButtonText}>Add Another</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleGoBack}
                style={[styles.modalButton, styles.modalButtonSecondary, { borderColor: colors.border }]}
              >
                <Text style={[styles.modalButtonTextSecondary, { color: colors.foreground }]}>
                  Back to Dashboard
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fetchingText: {
    fontSize: 12,
    fontWeight: '500',
  },
  refreshPriceText: {
    fontSize: 12,
    fontWeight: '600',
  },
  hintText: {
    fontSize: 12,
    marginTop: 4,
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
  dateInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  datePickerDone: {
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  summaryCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  successIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    width: '100%',
    gap: 12,
  },
  modalButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  modalButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  modalButtonTextSecondary: {
    fontWeight: '600',
    fontSize: 16,
  },
});
