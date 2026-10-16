// ---------------------------------------------------------------------------
// Onboarding Step 2 - confirm / adjust the 50/30/20 split.
// ---------------------------------------------------------------------------

import { Text, View } from 'react-native';

import Button from '@/components/Button';
import Card from '@/components/Card';
import SplitEditor from '@/features/budget/SplitEditor';
import { validateSplit } from '@/services/budget';
import { formatCents, toCents } from '@/services/money';
import { useTheme } from '@/theme/ThemeProvider';

export default function StepSplit({ data, update, onNext, onBack }) {
  const { theme } = useTheme();
  const incomeCents = toCents(data.incomeText) ?? 0;
  const valid = validateSplit(data.needsPct, data.wantsPct, data.savingsPct) === null;

  return (
    <View style={{ gap: theme.spacing.lg }}>
      <View>
        <Text style={[theme.typography.h1, { color: theme.colors.text }]}>Your budget split</Text>
        <Text style={[theme.typography.body, { color: theme.colors.textMuted, marginTop: 6 }]}>
          {formatCents(incomeCents)} divided by the 50/30/20 rule. Tap a percentage to change it.
        </Text>
      </View>

      <Card>
        <SplitEditor
          incomeCents={incomeCents}
          value={{ needsPct: data.needsPct, wantsPct: data.wantsPct, savingsPct: data.savingsPct }}
          onChange={(next) => update(next)}
        />
      </Card>

      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        <Button title="Back" variant="secondary" onPress={onBack} style={{ flex: 1 }} />
        <Button title="Continue" onPress={onNext} disabled={!valid} style={{ flex: 2 }} />
      </View>
    </View>
  );
}