import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';

export function QuickActions() {
  const colors = useColors();
  const router = useRouter();

  const actions = [
    {
      icon: 'plus.circle.fill' as const,
      label: 'Add Stock',
      onPress: () => router.push('/add-transaction' as any),
    },
    {
      icon: 'doc.text.fill' as const,
      label: 'Import CSV',
      onPress: () => router.push('/import-csv' as any),
    },
  ];

  return (
    <View className="flex-row justify-around py-4">
      {actions.map((action, index) => (
        <TouchableOpacity
          key={index}
          onPress={action.onPress}
          activeOpacity={0.7}
          style={styles.actionButton}
          className="items-center"
        >
          <View
            style={[styles.iconContainer, { backgroundColor: colors.tint + '15' }]}
            className="rounded-full p-3 mb-2"
          >
            <IconSymbol name={action.icon} size={24} color={colors.tint} />
          </View>
          <Text className="text-foreground text-xs font-medium">{action.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    minWidth: 80,
  },
  iconContainer: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
