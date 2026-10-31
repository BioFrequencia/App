import React, { forwardRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

/** Página do motor dentro do APK (copiada pelo plugin plugins/comMotorFacial.js). */
const PAGINA = 'file:///android_asset/face/index.html';

interface Props {
  aoReceber: (evento: WebViewMessageEvent) => void;
  aoFalhar: (detalhe: string) => void;
}

/**
 * A WebView escondida que roda o motor facial. Separada do provider para a
 * prévia web (MotorWebView.web.tsx) não importar a react-native-webview,
 * que não existe no navegador.
 */
export const MotorWebView = forwardRef<WebView, Props>(function MotorWebView({ aoReceber, aoFalhar }, ref) {
  return (
    <View style={estilos.oculto} pointerEvents="none">
      <WebView
        ref={ref}
        source={{ uri: PAGINA }}
        originWhitelist={['*']}
        javaScriptEnabled
        allowFileAccess
        allowFileAccessFromFileURLs
        allowUniversalAccessFromFileURLs
        onMessage={aoReceber}
        onError={(evento) => aoFalhar(evento.nativeEvent.description)}
        onRenderProcessGone={() => aoFalhar('o sistema encerrou o motor facial (pouca memória?)')}
      />
    </View>
  );
});

const estilos = StyleSheet.create({
  // Visível para o sistema (WebView invisível pode ser pausada), mas sem
  // ocupar espaço nem receber toques.
  oculto: { position: 'absolute', left: 0, top: 0, width: 2, height: 2, opacity: 0.01 },
});
