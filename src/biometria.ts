import * as LocalAuthentication from 'expo-local-authentication';

import { avaliarDisponibilidade, mensagemDaFalha, type ResultadoIdentidade } from './biometriaRegras';

/**
 * Pede ao sistema a confirmação de identidade (digital, rosto ou o
 * PIN/padrão de bloqueio) e diz se deu certo. Ver src/biometriaRegras.ts
 * para as regras e o porquê. Nunca lança exceção: um erro do módulo
 * nativo vira uma mensagem para a tela.
 */
export async function confirmarIdentidade(motivo: string): Promise<ResultadoIdentidade> {
  try {
    const disponibilidade = avaliarDisponibilidade(await LocalAuthentication.getEnrolledLevelAsync());
    if (!disponibilidade.ok) {
      return disponibilidade;
    }
    const resultado = await LocalAuthentication.authenticateAsync({
      promptMessage: motivo,
      cancelLabel: 'Cancelar',
      // Sem biometria cadastrada (ou depois de falhar), o sistema oferece
      // o PIN/padrão do próprio celular.
      disableDeviceFallback: false,
    });
    return resultado.success ? { ok: true } : { ok: false, mensagem: mensagemDaFalha(resultado.error) };
  } catch {
    return { ok: false, mensagem: mensagemDaFalha(undefined) };
  }
}
