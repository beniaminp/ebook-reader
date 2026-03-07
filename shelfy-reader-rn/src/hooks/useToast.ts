/**
 * useToast Hook
 * React Native version using react-native-toast-message.
 */

import Toast from 'react-native-toast-message';

export function useToast() {
  return {
    showToast: (message: string, type: 'success' | 'error' | 'info' = 'info') => {
      Toast.show({ type, text1: message, position: 'bottom', visibilityTime: 2000 });
    },
  };
}

export default useToast;
