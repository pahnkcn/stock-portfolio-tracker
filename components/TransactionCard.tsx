import { useEffect } from 'react';
import { View, Text, StyleSheet, Platform, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withSpring,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { formatCurrency, formatDate } from '@/lib/calculations';
import { useColors } from '@/hooks/use-colors';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { Transaction } from '@/types';

interface TransactionCardProps {
  transaction: Transaction;
  showEditButton?: boolean;
  index?: number;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onLongPress?: () => void;
  onSelect?: () => void;
}

export function TransactionCard({
  transaction,
  showEditButton = true,
  index = 0,
  isSelectionMode = false,
  isSelected = false,
  onLongPress,
  onSelect,
}: TransactionCardProps) {
  const colors = useColors();
  const router = useRouter();
  const isBuy = transaction.type === 'BUY';

  // Animation values
  const progress = useSharedValue(0);
  const scale = useSharedValue(1);
  const animationDelay = index * 50;

  useEffect(() => {
    progress.value = withDelay(animationDelay, withTiming(1, { duration: 300 }));
  }, [animationDelay]);

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP);
    const translateY = interpolate(progress.value, [0, 1], [20, 0], Extrapolation.CLAMP);
    return {
      opacity,
      transform: [{ translateY }, { scale: scale.value }],
    };
  });

  const handlePressIn = () => {
    scale.value = withTiming(0.98, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
  };

  const handleEdit = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/edit-transaction?id=${transaction.id}` as any);
  };

  const handlePress = () => {
    if (isSelectionMode && onSelect) {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      onSelect();
    } else {
      handleEdit();
    }
  };

  const handleLongPress = () => {
    if (onLongPress) {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      onLongPress();
    }
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        onLongPress={handleLongPress}
        delayLongPress={500}
        disabled={!showEditButton && !isSelectionMode}
      >
        <View
          style={[
            styles.cardContainer,
            {
              backgroundColor: colors.surface,
              borderColor: isSelected ? colors.primary : colors.border,
              borderWidth: isSelected ? 2 : 1,
            },
          ]}
        >
          <View style={styles.topRow}>
            <View style={styles.leftSection}>
              <View style={styles.headerRow}>
                <View
                  style={[
                    styles.typeBadge,
                    { backgroundColor: isBuy ? colors.success + '20' : colors.error + '20' },
                  ]}
                >
                  <Text
                    style={[styles.typeText, { color: isBuy ? colors.success : colors.error }]}
                  >
                    {transaction.type}
                  </Text>
                </View>
                <Text style={[styles.symbolText, { color: colors.foreground }]}>
                  {transaction.symbol}
                </Text>
              </View>
              <Text style={[styles.companyName, { color: colors.muted }]} numberOfLines={1}>
                {transaction.companyName}
              </Text>
            </View>
            <View style={styles.rightSection}>
              <View style={styles.amountRow}>
                <Text style={[styles.amountText, { color: colors.foreground }]}>
                  {formatCurrency(transaction.netAmount, 'USD')}
                </Text>
                {isSelectionMode ? (
                  <View
                    style={[
                      styles.checkbox,
                      {
                        backgroundColor: isSelected ? colors.primary : 'transparent',
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    {isSelected && (
                      <IconSymbol name="checkmark" size={14} color="#fff" />
                    )}
                  </View>
                ) : showEditButton ? (
                  <View
                    style={[styles.editButton, { backgroundColor: colors.primary + '15' }]}
                  >
                    <IconSymbol name="pencil" size={14} color={colors.primary} />
                  </View>
                ) : null}
              </View>
              <Text style={[styles.dateText, { color: colors.muted }]}>
                {formatDate(transaction.date)}
              </Text>
            </View>
          </View>

          <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
            <View style={styles.statsLeft}>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: colors.muted }]}>Shares</Text>
                <Text style={[styles.statValue, { color: colors.foreground }]}>
                  {transaction.shares.toLocaleString('en-US', { maximumFractionDigits: 5 })}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: colors.muted }]}>Price</Text>
                <Text style={[styles.statValue, { color: colors.foreground }]}>
                  ${transaction.price.toFixed(2)}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: colors.muted }]}>Fees</Text>
                <Text style={[styles.statValue, { color: colors.foreground }]}>
                  ${(transaction.commission + transaction.vat).toFixed(2)}
                </Text>
              </View>
            </View>

            {transaction.tags && transaction.tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {transaction.tags.slice(0, 2).map((tag, idx) => (
                  <View
                    key={idx}
                    style={[styles.tag, { backgroundColor: colors.primary + '15' }]}
                  >
                    <Text style={[styles.tagText, { color: colors.primary }]}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {transaction.notes && (
            <View style={[styles.notesSection, { borderTopColor: colors.border }]}>
              <Text style={[styles.notesText, { color: colors.muted }]} numberOfLines={2}>
                {transaction.notes}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  leftSection: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  symbolText: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  companyName: {
    fontSize: 12,
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountText: {
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  dateText: {
    fontSize: 12,
    marginTop: 4,
  },
  editButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
  },
  statsLeft: {
    flexDirection: 'row',
  },
  statItem: {
    marginRight: 16,
  },
  statLabel: {
    fontSize: 11,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  tagText: {
    fontSize: 11,
  },
  notesSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  notesText: {
    fontSize: 12,
  },
});
