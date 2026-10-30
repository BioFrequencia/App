/**
 * Regras da confirmação de identidade no aparelho (funções puras, sem o
 * módulo nativo - testadas em test/biometria.test.ts).
 *
 * A biometria é SÓ local: o Android/iOS confirma que quem está com o
 * celular é o dono dele (digital, rosto ou o PIN/padrão de bloqueio) e a
 * API nunca recebe imagem, digital ou modelo biométrico. Quem prova ao
 * servidor que o envio veio deste aparelho é a assinatura HMAC com o
 * segredo guardado no Keystore/Keychain no momento do vínculo.
 *
 * O que mudou: as telas exigiam hasHardwareAsync() E isEnrolledAsync()
 * (biometria cadastrada), embora dissessem "biometria ou PIN" - um celular
 * só com PIN/padrão de bloqueio era recusado, apesar de o sistema aceitar
 * o PIN como alternativa (disableDeviceFallback: false). E qualquer falha
 * (cancelar, bloqueio por tentativas, sensor sujo) virava a mesma
 * mensagem genérica.
 */

/** Mesmos valores de SecurityLevel do expo-local-authentication. */
export const NIVEL_NENHUM = 0;
export const NIVEL_PIN_OU_SENHA = 1;

export type ResultadoIdentidade = { ok: true } | { ok: false; mensagem: string };

/**
 * Dá para pedir a confirmação? Basta haver QUALQUER forma de bloqueio
 * cadastrada (biometria fraca/forte ou PIN/padrão/senha).
 */
export function avaliarDisponibilidade(nivelCadastrado: number): ResultadoIdentidade {
  if (nivelCadastrado <= NIVEL_NENHUM) {
    return {
      ok: false,
      mensagem:
        'Este celular não tem biometria nem bloqueio de tela (PIN, padrão ou senha). Configure um nos ajustes do aparelho para confirmar sua identidade.',
    };
  }
  return { ok: true };
}

/** Mensagem para cada motivo de falha devolvido pelo sistema. */
export function mensagemDaFalha(erro: string | undefined): string {
  switch (erro) {
    case 'user_cancel':
    case 'system_cancel':
    case 'app_cancel':
    case 'user_fallback':
      return 'Confirmação cancelada. Nada foi enviado.';
    case 'lockout':
      return 'Muitas tentativas sem sucesso. Desbloqueie o celular com o PIN/senha e tente de novo.';
    case 'not_enrolled':
    case 'passcode_not_set':
      return 'Configure uma biometria ou um bloqueio de tela nos ajustes do celular e tente de novo.';
    case 'authentication_failed':
      return 'Identidade não confirmada. Tente de novo.';
    case 'timeout':
      return 'O tempo para confirmar acabou. Tente de novo.';
    case 'not_available':
    case 'unable_to_process':
      return 'Não foi possível usar a biometria agora. Tente de novo ou use o PIN do celular.';
    default:
      return 'Não foi possível confirmar sua identidade. Nada foi enviado.';
  }
}
