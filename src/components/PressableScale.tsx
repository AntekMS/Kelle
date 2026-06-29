import { useRef } from 'react';
import {
  Animated,
  Pressable,
  type PressableProps,
  type ViewStyle,
  type StyleProp,
  type GestureResponderEvent,
} from 'react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props extends PressableProps {
  /** Wie weit beim Drücken herunterskaliert wird (Standard 0.96). */
  activeScale?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Drop-in-Ersatz für Pressable mit dezentem Scale-Feedback beim Antippen.
 * Style + Scale liegen auf demselben Element (createAnimatedComponent), damit
 * Layout-Styles wie flex:1 unverändert wirken. useNativeDriver → kein Jank.
 */
export default function PressableScale({
  activeScale = 0.96,
  style,
  onPressIn,
  onPressOut,
  children,
  ...rest
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (to: number) =>
    Animated.spring(scale, { toValue: to, useNativeDriver: true, speed: 40, bounciness: 6 }).start();

  return (
    <AnimatedPressable
      {...rest}
      style={[style, { transform: [{ scale }] }]}
      onPressIn={(e: GestureResponderEvent) => {
        animateTo(activeScale);
        onPressIn?.(e);
      }}
      onPressOut={(e: GestureResponderEvent) => {
        animateTo(1);
        onPressOut?.(e);
      }}
    >
      {children as React.ReactNode}
    </AnimatedPressable>
  );
}
