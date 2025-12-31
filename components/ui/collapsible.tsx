import { PropsWithChildren, useState, useCallback } from "react";
import { Text, Pressable, View, LayoutChangeEvent, Platform } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

export function Collapsible({ children, title }: PropsWithChildren & { title: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const colors = useColors();

  // Animation values
  const progress = useSharedValue(0);
  const scale = useSharedValue(1);

  const handleToggle = () => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setIsOpen((value) => !value);
    progress.value = withSpring(isOpen ? 0 : 1, {
      damping: 15,
      stiffness: 120,
    });
  };

  const handlePressIn = () => {
    scale.value = withTiming(0.98, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
  };

  const onContentLayout = useCallback((event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    if (height > 0) {
      setContentHeight(height);
    }
  }, []);

  const headerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const chevronStyle = useAnimatedStyle(() => {
    const rotation = interpolate(progress.value, [0, 1], [0, 90], Extrapolation.CLAMP);
    return {
      transform: [{ rotate: `${rotation}deg` }],
    };
  });

  const contentStyle = useAnimatedStyle(() => {
    const height = interpolate(
      progress.value,
      [0, 1],
      [0, contentHeight],
      Extrapolation.CLAMP
    );
    const opacity = interpolate(progress.value, [0, 0.5, 1], [0, 0, 1], Extrapolation.CLAMP);

    return {
      height: contentHeight > 0 ? height : undefined,
      opacity,
      overflow: "hidden" as const,
    };
  });

  return (
    <View style={{ backgroundColor: colors.background }}>
      <Pressable
        onPress={handleToggle}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View
          style={[
            { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4 },
            headerStyle,
          ]}
        >
          <Animated.View style={chevronStyle}>
            <IconSymbol
              name="chevron.right"
              size={18}
              weight="medium"
              color={colors.icon}
            />
          </Animated.View>
          <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground }}>
            {title}
          </Text>
        </Animated.View>
      </Pressable>

      <Animated.View style={contentStyle}>
        <View
          onLayout={onContentLayout}
          style={{ marginTop: 6, marginLeft: 24 }}
        >
          {children}
        </View>
      </Animated.View>
    </View>
  );
}
