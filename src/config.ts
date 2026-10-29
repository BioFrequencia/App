/**
 * Endereço da API da escola.
 *
 * Antes isto era digitado pelo usuário numa tela inicial de "URL +
 * token", que era a primeira coisa que aparecia ao abrir o app. Isso
 * saiu: ninguém deveria precisar saber o endereço de um servidor para
 * registrar uma falta, e um token digitado à mão é fácil de errar e de
 * vazar.
 *
 * O endereço vem da configuração do build (app.config.ts ->
 * expo.extra.apiBaseUrl): nos builds de distribuição é a API publicada
 * (HTTPS), e o build falha se alguém tentar gerar um APK apontando para
 * um endereço local. Em desenvolvimento, cai no padrão do emulador.
 *
 * Isto NÃO é um segredo: é só onde o servidor está. Nenhum token,
 * senha ou chave fica embutido no aplicativo - o que autentica cada
 * envio é o segredo do dispositivo, trocado no momento do vínculo e
 * guardado no Keystore/Keychain do aparelho.
 */
import Constants from 'expo-constants';

const PADRAO_DESENVOLVIMENTO = 'http://10.0.2.2/BioFrequenciaApi/';

export function obterApiBaseUrl(): string {
  const configurado = (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl;
  const url = configurado && configurado.trim() !== '' ? configurado : PADRAO_DESENVOLVIMENTO;
  return url.trim().replace(/\/+$/, '') + '/';
}
