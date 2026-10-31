import { forwardRef } from 'react';

/**
 * Na prévia web ("expo start --web") não há WebView: o provider já marca o
 * motor como indisponível e o restante do app funciona normalmente.
 */
export const MotorWebView = forwardRef<unknown, { aoReceber: unknown; aoFalhar: unknown }>(function MotorWebView() {
  return null;
});
