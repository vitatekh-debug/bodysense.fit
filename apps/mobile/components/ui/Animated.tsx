/**
 * Helpers de animación nativa (react-native-reanimated).
 * Animaciones sutiles y de alto rendimiento (60 FPS) sobre el hilo de UI.
 */
import { useEffect } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const POP_SPRING = { damping: 13, stiffness: 260, mass: 0.6 };
const ACTIVE_SPRING = { damping: 15, stiffness: 300, mass: 0.6 };

/**
 * Pulso elástico sutil: cada vez que `pulseKey` cambia, la vista hace un
 * "pop-settle" (1.14 → 1). Ideal para indicadores numéricos de sliders.
 */
export function PulseScale({
  pulseKey,
  children,
  style,
}: {
  pulseKey: number | string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = 1.14;
    scale.value = withSpring(1, POP_SPRING);
  }, [pulseKey]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return <Animated.View style={[style, animStyle]}>{children}</Animated.View>;
}

/**
 * Escala persistente según `active`: 1.03 al activarse, 1 al desactivarse.
 * Para selectores (Feiss) y toggles (Windlass / Pinzamiento).
 */
export function ActiveScale({
  active,
  children,
  style,
}: {
  active: boolean;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(active ? 1.03 : 1, ACTIVE_SPRING);
  }, [active]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return <Animated.View style={[style, animStyle]}>{children}</Animated.View>;
}
