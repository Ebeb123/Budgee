// Web build uses the same in-app glass Dialog as native (see Dialog.js).
import { _callShow } from '@/components/Dialog';

export const Alert = {
  alert: (title, message, buttons) => _callShow(title, message, buttons),
};
