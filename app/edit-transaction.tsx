import {
  ScrollView,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ScreenContainer } from '@/components/screen-container';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/use-colors';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function EditTransactionScreen() {
  const colors = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, updateTransaction, deleteTransaction, updateHolding } = useApp();

  // Find the transaction
  const transaction = state.transactions.find(t => t.id === id);

  // Form state
  const [type, setType] = useState<'BUY' | 'SELL'>('BUY');
  const [symbol, setSymbol] = useState('');
  const [shares, setShares] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(new Date());
  const [exchangeRate, setExchangeRate] = useState('35.00');
  const [notes, setNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successType, setSuccessType] = useState<'update' | 'delete'>('update');

  // Load transaction data
  useEffect(() => {
    if (transaction) {
      setType(transaction.type as 'BUY' | 'SELL');
      setSymbol(transaction.symbol);
      setShares(transaction.shares.toString());
      setPrice(transaction.price.toString());
      setDate(new Date(transaction.date));
      setExchangeRate(transaction.exchangeRate?.toString() || '35.00');
      setNotes(transaction.notes || '');
    }
  }, [transaction]);

  if (!transaction) {
    return (
      <ScreenContainer className="p-6">
        <View style={styles.notFound}>
          <Text style={[styles.notFoundText, { color: colors.foreground }]}>
            Transaction not found
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const handleUpdate = async () => {
    // Validation
    if (!symbol.trim()) {
      return;
    }
    if (!shares || parseFloat(shares) <= 0) {
      return;
    }
    if (!price || parseFloat(price) <= 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      const updates = {
        type,
        symbol: symbol.toUpperCase().trim(),
        shares: parseFloat(shares),
        price: parseFloat(price),
        date: date.toISOString(),
        exchangeRate: parseFloat(exchangeRate) || 35.0,
        notes: notes.trim() || undefined,
      };

      await updateTransaction(id!, updates);

      // Recalculate holdings
      await recalculateHoldings();

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // Show success modal
      setSuccessType('update');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error updating transaction:', error);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setShowDeleteConfirm(false);
    setIsSubmitting(true);

    try {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }

      await deleteTransaction(id!);

      // Recalculate holdings
      await recalculateHoldings();

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // Show success modal
      setSuccessType('delete');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error deleting transaction:', error);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const recalculateHoldings = async () => {
    // Get all transactions for this symbol
    const symbolTransactions = state.transactions.filter(
      t => t.symbol === transaction.symbol && t.id !== id
    );

    // Find the holding for this symbol
    const holding = state.holdings.find(
      h => h.symbol === transaction.symbol && h.portfolioId === transaction.portfolioId
    );

    if (holding) {
      // Recalculate shares and average cost
      let totalShares = 0;
      let totalCost = 0;
      let totalExchangeRateCost = 0;

      symbolTransactions.forEach(t => {
        if (t.type === 'BUY') {
          totalShares += t.shares;
          totalCost += t.shares * t.price;
          totalExchangeRateCost += t.shares * (t.exchangeRate || 35);
        } else {
          totalShares -= t.shares;
        }
      });

      if (totalShares <= 0) {
        // No shares left, could delete holding
        // For now, just set to 0
        await updateHolding(holding.id, {
          shares: 0,
          avgCost: 0,
          avgExchangeRate: 35,
        });
      } else {
        await updateHolding(holding.id, {
          shares: totalShares,
          avgCost: totalCost / totalShares,
          avgExchangeRate: totalExchangeRateCost / totalShares,
        });
      }
    }
  };

  const formatDate = (d: Date) => {
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleGoBack = () => {
    setShowSuccessModal(false);
    router.back();
  };

  const handleGoToJournal = () => {
    setShowSuccessModal(false);
    router.replace('/(tabs)/journal' as any);
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={[styles.cancelText, { color: colors.primary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.foreground }]}>Edit Transaction</Text>
            <TouchableOpacity
              onPress={() => setShowDeleteConfirm(true)}
              disabled={isSubmitting}
            >
              <Text style={[styles.deleteText, { color: colors.error }]}>Delete</Text>
            </TouchableOpacity>
          </View>

          {/* Transaction Type */}
          <Animated.View
            entering={FadeInDown.delay(50).duration(300)}
            style={styles.section}
          >
            <Text style={[styles.label, { color: colors.foreground }]}>Transaction Type</Text>
            <View style={styles.typeToggle}>
              <TouchableOpacity
                onPress={() => setType('BUY')}
                style={[
                  styles.typeButton,
                  { backgroundColor: type === 'BUY' ? colors.success : colors.surface },
                ]}
              >
                <Text style={[
                  styles.typeButtonText,
                  { color: type === 'BUY' ? '#fff' : colors.foreground }
                ]}>
                  Buy
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setType('SELL')}
                style={[
                  styles.typeButton,
                  { backgroundColor: type === 'SELL' ? colors.error : colors.surface },
                ]}
              >
                <Text style={[
                  styles.typeButtonText,
                  { color: type === 'SELL' ? '#fff' : colors.foreground }
                ]}>
                  Sell
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Symbol */}
          <Animated.View
            entering={FadeInDown.delay(100).duration(300)}
            style={styles.section}
          >
            <Text style={[styles.label, { color: colors.foreground }]}>Symbol</Text>
            <TextInput
              value={symbol}
              onChangeText={setSymbol}
              placeholder="e.g., AAPL"
              placeholderTextColor={colors.muted}
              autoCapitalize="characters"
              style={[
                styles.input,
                { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }
              ]}
            />
          </Animated.View>

          {/* Shares */}
          <Animated.View
            entering={FadeInDown.delay(150).duration(300)}
            style={styles.section}
          >
            <Text style={[styles.label, { color: colors.foreground }]}>Number of Shares</Text>
            <TextInput
              value={shares}
              onChangeText={setShares}
              placeholder="0"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
              style={[
                styles.input,
                { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }
              ]}
            />
          </Animated.View>

          {/* Price */}
          <Animated.View
            entering={FadeInDown.delay(200).duration(300)}
            style={styles.section}
          >
            <Text style={[styles.label, { color: colors.foreground }]}>Price per Share (USD)</Text>
            <TextInput
              value={price}
              onChangeText={setPrice}
              placeholder="0.00"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
              style={[
                styles.input,
                { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }
              ]}
            />
          </Animated.View>

          {/* Date */}
          <Animated.View
            entering={FadeInDown.delay(250).duration(300)}
            style={styles.section}
          >
            <Text style={[styles.label, { color: colors.foreground }]}>Date</Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              style={[
                styles.input,
                styles.dateInput,
                { backgroundColor: colors.surface, borderColor: colors.border }
              ]}
            >
              <Text style={{ color: colors.foreground }}>{formatDate(date)}</Text>
            </TouchableOpacity>

            {showDatePicker && (
              Platform.OS === 'web' ? (
                <input
                  type="date"
                  value={date.toISOString().split('T')[0]}
                  onChange={(e) => {
                    setDate(new Date(e.target.value));
                    setShowDatePicker(false);
                  }}
                  style={{
                    marginTop: 8,
                    padding: 12,
                    borderRadius: 8,
                    border: `1px solid ${colors.border}`,
                    backgroundColor: colors.surface,
                    color: colors.foreground,
                    fontSize: 16,
                  }}
                />
              ) : (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                />
              )
            )}
          </Animated.View>

          {/* Exchange Rate */}
          <Animated.View
            entering={FadeInDown.delay(300).duration(300)}
            style={styles.section}
          >
            <Text style={[styles.label, { color: colors.foreground }]}>Exchange Rate (USD/THB)</Text>
            <TextInput
              value={exchangeRate}
              onChangeText={setExchangeRate}
              placeholder="35.00"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
              style={[
                styles.input,
                { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }
              ]}
            />
          </Animated.View>

          {/* Notes */}
          <Animated.View
            entering={FadeInDown.delay(350).duration(300)}
            style={styles.section}
          >
            <Text style={[styles.label, { color: colors.foreground }]}>Notes (Optional)</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Add notes..."
              placeholderTextColor={colors.muted}
              multiline
              numberOfLines={3}
              style={[
                styles.input,
                styles.notesInput,
                { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }
              ]}
            />
          </Animated.View>

          {/* Total */}
          <Animated.View
            entering={FadeInDown.delay(400).duration(300)}
            style={[styles.totalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Text style={[styles.totalLabel, { color: colors.foreground, opacity: 0.6 }]}>
              Total Value
            </Text>
            <Text style={[styles.totalValue, { color: colors.foreground }]}>
              ${((parseFloat(shares) || 0) * (parseFloat(price) || 0)).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
            <Text style={[styles.totalThb, { color: colors.foreground, opacity: 0.6 }]}>
              ≈ ฿{((parseFloat(shares) || 0) * (parseFloat(price) || 0) * (parseFloat(exchangeRate) || 35)).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
          </Animated.View>

          {/* Update Button */}
          <Animated.View entering={FadeInDown.delay(450).duration(300)}>
            <TouchableOpacity
              onPress={handleUpdate}
              disabled={isSubmitting}
              style={[
                styles.submitButton,
                { backgroundColor: colors.primary, opacity: isSubmitting ? 0.6 : 1 }
              ]}
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting ? 'Updating...' : 'Update Transaction'}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.iconCircle, { backgroundColor: colors.error + '20' }]}>
              <IconSymbol name="trash.fill" size={32} color={colors.error} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              Delete Transaction?
            </Text>
            <Text style={[styles.modalMessage, { color: colors.muted }]}>
              This action cannot be undone. The transaction will be permanently deleted.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setShowDeleteConfirm(false)}
                style={[styles.modalButton, styles.modalButtonSecondary, { borderColor: colors.border }]}
              >
                <Text style={[styles.modalButtonTextSecondary, { color: colors.foreground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDelete}
                style={[styles.modalButton, { backgroundColor: colors.error }]}
              >
                <Text style={styles.modalButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={handleGoBack}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.iconCircle, { backgroundColor: successType === 'update' ? colors.success + '20' : colors.warning + '20' }]}>
              <IconSymbol 
                name={successType === 'update' ? 'checkmark.circle.fill' : 'trash.fill'} 
                size={40} 
                color={successType === 'update' ? colors.success : colors.warning} 
              />
            </View>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {successType === 'update' ? 'Transaction Updated!' : 'Transaction Deleted!'}
            </Text>
            <Text style={[styles.modalMessage, { color: colors.muted }]}>
              {successType === 'update' 
                ? `${type} ${shares} shares of ${symbol.toUpperCase()} at $${price}`
                : `The transaction has been removed from your journal.`
              }
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={handleGoToJournal}
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.modalButtonText}>Go to Journal</Text>
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
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  cancelText: {
    fontSize: 17,
    fontWeight: '500',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  deleteText: {
    fontSize: 17,
    fontWeight: '500',
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  typeToggle: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  dateInput: {
    justifyContent: 'center',
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  totalCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 24,
  },
  totalLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 32,
    fontWeight: '700',
  },
  totalThb: {
    fontSize: 16,
    marginTop: 4,
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 40,
  },
  notFound: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  notFoundText: {
    fontSize: 18,
    fontWeight: '500',
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  modalButtons: {
    width: '100%',
    gap: 12,
  },
  modalButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  modalButtonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
  },
});
