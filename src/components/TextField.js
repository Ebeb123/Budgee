// ---------------------------------------------------------------------------
// TextField - a labeled single-line text input.
// ---------------------------------------------------------------------------
// Generic reusable input for things like a goal name or a note.
// ---------------------------------------------------------------------------

import { Text, TextInput, View, Platform } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

/**
 * @param {object} props
 * @param {string} [props.label]
 * @param {string} props.value
 * @param {(text: string) => void} props.onChangeText
 * @param {string} [props.placeholder]
 * @param {string} [props.keyboardType]
 * @param {boolean} [props.autoFocus]
 * @param {number} [props.maxLength]
 */
export default function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  autoFocus = false,
  maxLength,
}) {
  const { theme } = useTheme();
  return (
    <View>
      {label ? (
        <Text style={[theme.typography.label, { color: theme.colors.textMuted, marginBottom: 6 }]}>
          {label}
        </Text>
      ) : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        keyboardType={keyboardType}
        autoFocus={autoFocus}
        maxLength={maxLength}
        style={{
          backgroundColor: theme.colors.surfaceAlt,
          borderRadius: theme.radius.md,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: 14,
          color: theme.colors.text,
          fontSize: 16,
          ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : null), // browser: no default focus box
        }}
      />
    </View>
  );
}