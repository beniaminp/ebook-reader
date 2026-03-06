import { useState } from 'react';

export function useToast(defaultColor: string = 'success') {
  const [message, setMessage] = useState('');
  const [color, setColor] = useState(defaultColor);

  const show = (msg: string, toastColor?: string) => {
    setMessage(msg);
    if (toastColor) setColor(toastColor);
  };

  const dismiss = () => setMessage('');

  return {
    message,
    color,
    isOpen: message !== '',
    show,
    dismiss,
  };
}
