// ---------------------------------------------------------------------------
// ONBOARDING  (app/onboarding.js)  -> route "/onboarding"
// ---------------------------------------------------------------------------
// The first-run flow. It holds all the data for the 3 steps in one place and
// renders one step component at a time. Only the final "Finish" writes to the
// database, so backing out midway changes nothing.
//
// It creates the goal (if you entered one) and then opens your ongoing account
// with the starting balance. Savings is NOT auto-moved into the goal here - you
// choose when to move savings into a goal from the Savings/Goals screen.
// ---------------------------------------------------------------------------

import { useState } from 'react';
import { Alert } from '@/lib/alert';
import { useRouter } from 'expo-router';

import Screen from '@/components/Screen';
import StepBalance from '@/features/onboarding/StepBalance';
import StepSplit from '@/features/onboarding/StepSplit';
import StepGoal from '@/features/onboarding/StepGoal';
import { toCents } from '@/services/money';
import { openAccount } from '@/services/periodService';
import { todayISO } from '@/utils/date';
import { createGoal } from '@/repositories/goalRepo';
import { setSetting } from '@/repositories/settingsRepo';
import { useBudget } from '@/state/BudgetProvider';

export default function Onboarding() {
  const router = useRouter();
  const { refresh } = useBudget();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState({
    periodType: 'weekly',
    incomeText: '',
    needsPct: 50,
    wantsPct: 30,
    savingsPct: 20,
    goalName: '',
    goalTargetText: '',
  });

  const update = (patch) => setData((d) => ({ ...d, ...patch }));

  async function finish() {
    setSubmitting(true);
    try {
      const incomeCents = toCents(data.incomeText);
      if (incomeCents == null || incomeCents <= 0) {
        Alert.alert('Invalid amount', 'Please go back and enter a valid balance.');
        setSubmitting(false);
        return;
      }

      // 1) Create the goal first (if the user filled it in), marked active.
      const goalTarget = toCents(data.goalTargetText);
      if (data.goalName.trim() && goalTarget != null && goalTarget > 0) {
        await createGoal({
          name: data.goalName.trim(),
          targetCents: goalTarget,
          isActive: true,
        });
      }

      // 2) Open the ongoing account with the starting balance (logged to the
      //    income ledger). No savings is auto-applied - that's now manual.
      await openAccount({
        periodType: data.periodType,
        startDate: todayISO(),
        incomeCents,
        needsPct: data.needsPct,
        wantsPct: data.wantsPct,
        savingsPct: data.savingsPct,
      });

      // 3) Remember that onboarding is done, refresh global state, go to the app.
      await setSetting('onboarded', '1');
      await refresh();
      router.replace('/(tabs)');
    } catch (err) {
      console.error('[onboarding] finish failed:', err);
      Alert.alert('Something went wrong', 'Could not save your setup. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      {step === 0 && <StepBalance data={data} update={update} onNext={() => setStep(1)} />}
      {step === 1 && (
        <StepSplit data={data} update={update} onNext={() => setStep(2)} onBack={() => setStep(0)} />
      )}
      {step === 2 && (
        <StepGoal data={data} update={update} onFinish={finish} onBack={() => setStep(1)} submitting={submitting} />
      )}
    </Screen>
  );
}
