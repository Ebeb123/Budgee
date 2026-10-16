// ---------------------------------------------------------------------------
// Button - the app's standard tappable button.
// ---------------------------------------------------------------------------
// One button component with two looks: 'primary' (filled accent) and
// 'secondary' (muted surface). Centralizing it keeps every button the same
// shape/size and makes disabled + pressed feedback consistent.
// ---------------------------------------------------------------------------

import { Pressable, Text } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

/**
 * @param {object} props
 * @param {string} props.title
 * @param {() => void} props.onPress
 * @param {'primary'|'secondary'} [props.variant='primary']
 * @param {boolean} [props.disabled]
 * @param {object} [props.style]
 */
export default function Button({ title, onPress, variant = 'primary', disabled = false, style }) {
  const { theme } = useTheme();
  const isPrimary = variant === 'primary';
  const bg = isPrimary ? theme.colors.accent : theme.colors.surfaceAlt;
  const fg = isPrimary ? theme.colors.onAccent : theme.colors.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          borderRadius: theme.radius.pill,
          paddingVertical: 14,
          paddingHorizontal: theme.spacing.lg,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <Text style={[theme.typography.title, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}