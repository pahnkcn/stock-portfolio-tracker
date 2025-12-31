import { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/use-colors';
import { IconSymbol } from '@/components/ui/icon-symbol';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
  duration?: number;
  onHide?: () => void;
  position?: 'top' | 'bottom';
}

export function Toast({
  visible,
  message,
  type = 'info',
  duration = 3000,
  onHide,
  position = 'top',
}: ToastProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const translateY = useSharedValue(position === 'top' ? -100 : 100);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);

  const hideToast = useCallback(() => {
    onHide?.();
  }, [onHide]);

  useEffect(() => {
    if (visible) {
      // Show toast with haptic feedback
      if (Platform.OS === 'ios') {
        if (type === 'success') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else if (type === 'error') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }

      translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
      opacity.value = withTiming(1, { duration: 200 });
      scale.value = withSpring(1, { damping: 12, stiffness: 180 });

      // Auto hide after duration
      translateY.value = withDelay(
        duration,
        withTiming(position === 'top' ? -100 : 100, { duration: 300 }, () => {
          runOnJS(hideToast)();
        })
      );
      opacity.value = withDelay(duration, withTiming(0, { duration: 300 }));
      scale.value = withDelay(duration, withTiming(0.9, { duration: 300 }));
    }
  }, [visible, duration, position, type, hideToast]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: colors.success + '15',
          borderColor: colors.success + '30',
          iconColor: colors.success,
          iconName: 'checkmark.circle.fill' as const,
        };
      case 'error':
        return {
          backgroundColor: colors.error + '15',
          borderColor: colors.error + '30',
          iconColor: colors.error,
          iconName: 'xmark.circle.fill' as const,
        };
      case 'warning':
        return {
          backgroundColor: colors.warning + '15',
          borderColor: colors.warning + '30',
          iconColor: colors.warning,
          iconName: 'exclamationmark.triangle.fill' as const,
        };
      default:
        return {
          backgroundColor: colors.primary + '15',
          borderColor: colors.primary + '30',
          iconColor: colors.primary,
          iconName: 'info.circle.fill' as const,
        };
    }
  };

  const typeStyles = getTypeStyles();

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          [position]: position === 'top' ? insets.top + 10 : insets.bottom + 10,
        },
        animatedStyle,
      ]}
    >
      <View
        style={[
          styles.toast,
          {
            backgroundColor: typeStyles.backgroundColor,
            borderColor: typeStyles.borderColor,
          },
        ]}
      >
        <IconSymbol
          name={typeStyles.iconName}
          size={20}
          color={typeStyles.iconColor}
        />
        <Text style={[styles.message, { color: colors.foreground }]}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}

// Toast Context for global usage
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: ToastType;
    duration: number;
  }>({
    visible: false,
    message: '',
    type: 'info',
    duration: 3000,
  });

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', duration: number = 3000) => {
      setToast({ visible: true, message, type, duration });
    },
    []
  );

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        duration={toast.duration}
        onHide={hideToast}
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    maxWidth: 400,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
});
