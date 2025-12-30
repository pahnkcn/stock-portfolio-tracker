import { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import * as Haptics from 'expo-haptics';

export function QuickActions() {
  const colors = useColors();
  const router = useRouter();

  const actions = [
    {
      icon: 'plus.circle.fill' as const,
      label: 'Add Stock',
      color: colors.primary,
      onPress: () => router.push('/add-transaction' as any),
    },
    {
      icon: 'doc.text.fill' as const,
      label: 'Import CSV',
      color: '#06B6D4', // Cyan accent
      onPress: () => router.push('/import-csv' as any),
    },
  ];

  return (
    <View style={styles.container}>
      {actions.map((action, index) => (
        <QuickActionButton
          key={index}
          icon={action.icon}
          label={action.label}
          color={action.color}
          onPress={action.onPress}
          index={index}
        />
      ))}
    </View>
  );
}

interface QuickActionButtonProps {
  icon: 'plus.circle.fill' | 'doc.text.fill';
  label: string;
  color: string;
  onPress: () => void;
  index: number;
}

function QuickActionButton({ icon, label, color, onPress, index }: QuickActionButtonProps) {
  const colors = useColors();
  const progress = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    progress.value = withDelay(index * 100 + 200, withSpring(1, { damping: 15, stiffness: 150 }));
  }, [index]);

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP);
    const translateY = interpolate(progress.value, [0, 1], [20, 0], Extrapolation.CLAMP);
    return {
      opacity,
      transform: [{ translateY }, { scale: scale.value }],
    };
  });

  const handlePressIn = () => {
    scale.value = withTiming(0.95, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
    >
      <Animated.View
        style={[
          styles.actionButton,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
              },
              android: { elevation: 3 },
              web: { boxShadow: '0 2px 12px rgba(0,0,0,0.04)' },
            }),
          },
          animatedStyle,
        ]}
      >
        <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
          <IconSymbol name={icon} size={22} color={color} />
        </View>
        <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
});
