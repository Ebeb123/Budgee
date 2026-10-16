// ---------------------------------------------------------------------------
// Onboarding Step 1 - starting balance + period type.
// ---------------------------------------------------------------------------
// A "controlled" component: it doesn't own the data, it reads it from props and
// reports changes up via update(). The orchestrator (app/onboarding.js) holds
// the actual state. This keeps each step dumb and the flow logic in one place.
// ---------------------------------------------------------------------------

import { Text, View } from 'react-native';

import AmountInput from '@/components/AmountInput';
import Button from '@/components/Button';
import Card from '@/components/Card';
import Segmented from '@/components/Segmented';
import { toCents } from '@/services/money';
import { useTheme } from '@/theme/ThemeProvider';

export default function StepBalance({ data, update, onNext }) {
  const { theme } = useTheme();

  // Next is enabled only when the amount parses to a positive value.
  const cents = toCents(data.incomeText);
  const canContinue = cents != null && cents > 0;

  return (
    <View style={{ gap: theme.spacing.lg }}>
      <View>
        <Text style={[theme.typography.h1, { color: theme.colors.text }]}>Set your balance</Text>
        <Text style={[theme.typography.body, { color: theme.colors.textMuted, marginTop: 6 }]}>
          How much money do you have for this period? We'll split it using the 50/30/20 rule.
        </Text>
      </View>

      <Card style={{ gap: theme.spacing.md }}>
        <Text style={[theme.typography.label, { color: theme.colors.textMuted }]}>PERIOD</Text>
        <Segmented
          options={[
            { key: 'weekly', label: 'Weekly' },
            { key: 'monthly', label: 'Monthly' },
          ]}
          value={data.periodType}
          onChange={(k) => update({ periodType: k })}
        />

        <Text style={[theme.typography.label, { color: theme.colors.textMuted, marginTop: theme.spacing.sm }]}>
          {data.periodType === 'weekly' ? 'WEEKLY ALLOWANCE' : 'MONTHLY ALLOWANCE'}
        </Text>
        <AmountInput
          value={data.incomeText}
          onChangeText={(t) => update({ incomeText: t })}
          autoFocus
        />
      </Card>

      <Button title="Continue" onPress={onNext} disabled={!canContinue} />
    </View>
  );
}