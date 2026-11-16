// Custom Alert that calls the in-app glass Dialog (see src/components/Dialog.js).
// API matches React Native's Alert.alert() so every existing call works unchanged.
import { _callShow } from '@/components/Dialog';

export const Alert = {
  alert: (title, message, buttons) => _callShow(title, message, buttons),
};
