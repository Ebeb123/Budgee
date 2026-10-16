// ---------------------------------------------------------------------------
// AmountInput - a peso amount field with a fixed "₱" prefix.
// ---------------------------------------------------------------------------
// It holds the raw text the user types (a string like "40.50"); the parent
// converts it to centavos with toCents() when it's time to save. We use a
// decimal keypad and let the parent validate - the field itself stays simple.
// ---------------------------------------------------------------------------

import { Platform, TextInput, View, Text } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

/**
 * @param {object} props
 * @param {string} props.value
 * @param {(text: string) => void} props.onChangeText
 * @param {string} [props.placeholder='0.00']
 * @param {boolean} [props.autoFocus]
 * @param {'large'|'normal'} [props.size='large']
 */
export default function AmountInput({
  value,
  onChangeText,
  placeholder = '0.00',
  autoFocus = false,
  size = 'large',
}) {
  const { theme } = useTheme();
  const textStyle = size === 'large' ? theme.typography.h1 : theme.typography.h2;

  // Allow only digits and a single decimal point as the user types. This is a
  // gentle guard - final validation still happens with toCents() on save.
  const handleChange = (text) => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    // keep only the first "." if they type more than one
    const parts = cleaned.split('.');
    const normalized = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned;
    onChangeText(normalized);
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: theme.radius.md,
        paddingHorizontal: theme.spacing.md,
      }}
    >
      <Text style={[textStyle, { color: theme.colors.textMuted }]}>₱</Text>
      <TextInput
        value={value}
        onChangeText={handleChange}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        keyboardType="decimal-pad"
        autoFocus={autoFocus}
        style={[
          textStyle,
          { flex: 1, minWidth: 0, color: theme.colors.text, paddingVertical: 14, marginLeft: 8 },
          Platform.OS === 'web' && { outlineStyle: 'none' }, // browser: no default focus box / overflow
        ]}
      />
    </View>
  );
}