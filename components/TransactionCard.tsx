import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { formatCurrency, formatDate } from '@/lib/calculations';
import { useColors } from '@/hooks/use-colors';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { Transaction } from '@/types';

interface TransactionCardProps {
  transaction: Transaction;
  showEditButton?: boolean;
}

export function TransactionCard({ transaction, showEditButton = true }: TransactionCardProps) {
  const colors = useColors();
  const router = useRouter();
  const isBuy = transaction.type === 'BUY';

  const handleEdit = () => {
    router.push(`/edit-transaction?id=${transaction.id}` as any);
  };

  return (
    <View className="bg-surface rounded-xl p-4 border border-border mb-3">
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1">
          <View className="flex-row items-center mb-1">
            <View
              style={[
                styles.typeBadge,
                { backgroundColor: isBuy ? colors.success + '20' : colors.error + '20' },
              ]}
            >
              <Text
                style={{ color: isBuy ? colors.success : colors.error }}
                className="text-xs font-bold"
              >
                {transaction.type}
              </Text>
            </View>
            <Text className="text-foreground text-lg font-bold ml-2">{transaction.symbol}</Text>
          </View>
          <Text className="text-muted text-xs" numberOfLines={1}>
            {transaction.companyName}
          </Text>
        </View>
        <View className="items-end">
          <View className="flex-row items-center">
            <Text className="text-foreground text-lg font-semibold mr-2">
              {formatCurrency(transaction.netAmount, 'USD')}
            </Text>
            {showEditButton && (
              <TouchableOpacity
                onPress={handleEdit}
                style={[styles.editButton, { backgroundColor: colors.primary + '15' }]}
                activeOpacity={0.7}
              >
                <IconSymbol name="pencil" size={14} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
          <Text className="text-muted text-xs">{formatDate(transaction.date)}</Text>
        </View>
      </View>

      <View className="flex-row justify-between items-center pt-2 border-t border-border">
        <View className="flex-row">
          <View className="mr-4">
            <Text className="text-muted text-xs">Shares</Text>
            <Text className="text-foreground text-sm font-medium">
              {transaction.shares.toLocaleString('en-US', { maximumFractionDigits: 5 })}
            </Text>
          </View>
          <View className="mr-4">
            <Text className="text-muted text-xs">Price</Text>
            <Text className="text-foreground text-sm font-medium">
              ${transaction.price.toFixed(2)}
            </Text>
          </View>
          <View>
            <Text className="text-muted text-xs">Fees</Text>
            <Text className="text-foreground text-sm font-medium">
              ${(transaction.commission + transaction.vat).toFixed(2)}
            </Text>
          </View>
        </View>

        {transaction.tags && transaction.tags.length > 0 && (
          <View className="flex-row flex-wrap justify-end">
            {transaction.tags.slice(0, 2).map((tag, index) => (
              <View key={index} style={styles.tag} className="bg-primary/10 ml-1">
                <Text className="text-primary text-xs">{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {transaction.notes && (
        <View className="mt-2 pt-2 border-t border-border">
          <Text className="text-muted text-xs" numberOfLines={2}>
            {transaction.notes}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  editButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
