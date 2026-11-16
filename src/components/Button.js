// ---------------------------------------------------------------------------
// Button - the app's standard tappable button.
// ---------------------------------------------------------------------------
// Three looks:
//   - 'primary'   solid lime with a soft glow. Kept SOLID on purpose: a glass
//                 primary button would be hard to read and lose the clear
//                 "tap here" signal.
//   - 'secondary' glass, matching the cards.
//   - 'danger'    glass with red text, for delete actions.
// Centralizing it keeps every button the same shape/size and makes disabled +
// pressed feedback consistent.
// ---------------------------------------------------------------------------

import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/theme/ThemeProvider';

/**
 * @param {object} props
 * @param {string} props.title
 * @param {() => void} props.onPress
 * @param {'primary'|'secondary'|'danger'} [props.variant='primary']
 * @param {string} [props.icon]      Optional Ionicons name shown before the title
 * @param {boolean} [props.disabled]
 * @param {object} [props.style]
 */
export default function Button({ title, onPress, variant = 'primary', icon, disabled = false, style }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const isPrimary = variant === 'primary';
  const fg = isPrimary ? c.onAccent : variant === 'danger' ? c.alert : c.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          borderRadius: theme.radius.pill,
          paddingVertical: 14,
          paddingHorizontal: theme.spacing.lg,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.4 : pressed ? 0.82 : 1,
          transform: [{ scale: pressed && !disabled ? 0.98 : 1 }],
        },
        isPrimary
          ? {
              backgroundColor: c.accent,
              boxShadow: disabled ? undefined : `0 6px 20px ${c.accent}${theme.scheme === 'dark' ? '40' : '33'}`,
            }
          : {
              backgroundColor: c.surfaceAlt,
              borderWidth: 1,
              borderColor: c.glassBorder,
              borderTopColor: c.glassHighlight,
            },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
        <Text style={[theme.typography.title, { color: fg }]}>{title}</Text>
      </View>
    </Pressable>
  );
}
