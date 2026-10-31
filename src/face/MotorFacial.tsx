import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import type { WebView, WebViewMessageEvent } from 'react-native-webview';

import { MotorWebView } from './MotorWebView';
import { lerMensagemMotor, type ResultadoFacial } from './protocolo';

/**
 * Motor de reconhecimento facial: uma WebView escondida com a face-api.js
 * (face/motor.js, copiado para dentro do APK pelo plugin
 * plugins/comMotorFacial.js). Carrega os modelos uma vez, quando o app
 * abre, e fica disponível para todas as telas por useMotorFacial().
 *
 * Por que WebView: o modelo roda no próprio aparelho (a foto do aluno não
 * sai dele), sem depender de um módulo nativo de aprendizado de máquina.
 */
export type EstadoMotor = 'carregando' | 'pronto' | 'erro' | 'indisponivel';

interface Motor {
  estado: EstadoMotor;
  /** Detalhe técnico do erro de carregamento, para o suporte. */
  detalhe: string | null;
  /** Foto (JPEG em base64) -> vetor do rosto, ou o motivo da recusa. */
  processar: (base64Jpeg: string) => Promise<ResultadoFacial>;
  reiniciar: () => void;
}

const TEMPO_LIMITE_MS = 25_000;

const Contexto = createContext<Motor | null>(null);

export function MotorFacialProvider({ children }: { children: React.ReactNode }) {
  // Os arquivos do motor só são instalados no APK Android (plugin). Na
  // prévia web e no iOS o app funciona, mas sem reconhecimento.
  const disponivel = Platform.OS === 'android';
  const webview = useRef<WebView>(null);
  const pendentes = useRef(new Map<number, (resultado: ResultadoFacial) => void>());
  const proximoId = useRef(1);
  const estadoAtual = useRef<EstadoMotor>(disponivel ? 'carregando' : 'indisponivel');
  const [estado, setEstado] = useState<EstadoMotor>(estadoAtual.current);
  const [detalhe, setDetalhe] = useState<string | null>(null);
  const [chave, setChave] = useState(0);

  const mudarEstado = useCallback((novo: EstadoMotor, texto: string | null = null) => {
    estadoAtual.current = novo;
    setEstado(novo);
    setDetalhe(texto);
  }, []);

  const aoReceber = useCallback(
    (evento: WebViewMessageEvent) => {
      const mensagem = lerMensagemMotor(evento.nativeEvent.data);
      if (!mensagem) return;
      if (mensagem.tipo === 'pronto') {
        mudarEstado('pronto');
      } else if (mensagem.tipo === 'erro_carregar') {
        mudarEstado('erro', mensagem.mensagem);
      } else {
        const resolver = pendentes.current.get(mensagem.id);
        if (resolver) {
          pendentes.current.delete(mensagem.id);
          resolver(mensagem.resultado);
        }
      }
    },
    [mudarEstado]
  );

  const processar = useCallback(
    (base64Jpeg: string) =>
      new Promise<ResultadoFacial>((resolve) => {
        if (estadoAtual.current !== 'pronto') {
          resolve({ ok: false, motivo: estadoAtual.current === 'carregando' ? 'carregando' : 'indisponivel' });
          return;
        }
        const id = proximoId.current++;
        pendentes.current.set(id, resolve);
        webview.current?.postMessage(JSON.stringify({ tipo: 'processar', id, imagem: `data:image/jpeg;base64,${base64Jpeg}` }));
        setTimeout(() => {
          if (pendentes.current.delete(id)) {
            resolve({ ok: false, motivo: 'tempo' });
          }
        }, TEMPO_LIMITE_MS);
      }),
    []
  );

  const reiniciar = useCallback(() => {
    if (!disponivel) return;
    pendentes.current.forEach((resolver) => resolver({ ok: false, motivo: 'erro' }));
    pendentes.current.clear();
    mudarEstado('carregando');
    setChave((atual) => atual + 1);
  }, [disponivel, mudarEstado]);

  const valor = useMemo(() => ({ estado, detalhe, processar, reiniciar }), [estado, detalhe, processar, reiniciar]);

  return (
    <Contexto.Provider value={valor}>
      {children}
      {disponivel ? (
        <MotorWebView key={chave} ref={webview} aoReceber={aoReceber} aoFalhar={(detalhe) => mudarEstado('erro', detalhe)} />
      ) : null}
    </Contexto.Provider>
  );
}

export function useMotorFacial(): Motor {
  const motor = useContext(Contexto);
  if (!motor) {
    throw new Error('useMotorFacial fora do MotorFacialProvider');
  }
  return motor;
}
