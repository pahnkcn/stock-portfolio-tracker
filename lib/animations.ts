import {
  withTiming,
  withSpring,
  withDelay,
  Easing,
  type WithTimingConfig,
  type WithSpringConfig,
} from 'react-native-reanimated';

// Timing configurations
export const TIMING_CONFIG: WithTimingConfig = {
  duration: 300,
  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
};

export const FAST_TIMING: WithTimingConfig = {
  duration: 150,
  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
};

export const SLOW_TIMING: WithTimingConfig = {
  duration: 500,
  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
};

// Spring configurations
export const SPRING_CONFIG: WithSpringConfig = {
  damping: 15,
  stiffness: 150,
  mass: 1,
};

export const BOUNCY_SPRING: WithSpringConfig = {
  damping: 10,
  stiffness: 180,
  mass: 1,
};

export const GENTLE_SPRING: WithSpringConfig = {
  damping: 20,
  stiffness: 100,
  mass: 1,
};

// Animation helpers
export const fadeIn = (delay = 0) => {
  'worklet';
  return withDelay(delay, withTiming(1, TIMING_CONFIG));
};

export const fadeOut = (delay = 0) => {
  'worklet';
  return withDelay(delay, withTiming(0, TIMING_CONFIG));
};

export const scaleIn = (delay = 0) => {
  'worklet';
  return withDelay(delay, withSpring(1, SPRING_CONFIG));
};

export const scaleOut = (delay = 0) => {
  'worklet';
  return withDelay(delay, withTiming(0.95, FAST_TIMING));
};

export const slideInFromBottom = (delay = 0) => {
  'worklet';
  return withDelay(delay, withSpring(0, SPRING_CONFIG));
};

export const slideInFromRight = (delay = 0) => {
  'worklet';
  return withDelay(delay, withSpring(0, SPRING_CONFIG));
};

// Stagger delay calculator
export const getStaggerDelay = (index: number, baseDelay = 50) => {
  return index * baseDelay;
};

// Press animation values
export const PRESS_SCALE = 0.97;
export const PRESS_OPACITY = 0.8;

// List item animation delays
export const LIST_ITEM_DELAY = 50;
export const CARD_ANIMATION_DELAY = 100;
