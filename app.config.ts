import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Configuração dinâmica do app, por cima do app.json (que continua com a
 * parte fixa: nome, ícones, pacote, permissões).
 *
 * Endereço da API embutido no build (expo.extra.apiBaseUrl):
 *
 * O app.json trazia "http://10.0.2.2/BioFrequenciaApi/" - o endereço que o
 * EMULADOR Android usa para chegar ao XAMPP da máquina de quem desenvolve.
 * Num celular de verdade esse endereço não leva a lugar nenhum: o APK
 * distribuído só funcionaria na mesma rede do computador com a API (e nem
 * assim, porque o Android bloqueia HTTP sem TLS em builds de release).
 * Era essa a "dependência de estar na mesma rede".
 *
 * Agora:
 *  - builds de distribuição (perfis "preview" e "production" do EAS, ou
 *    APP_ENV=preview/production no build local do CI) usam API_URL ou, sem
 *    ela, a API publicada no Render. Um endereço local ou sem HTTPS faz o
 *    build FALHAR, em vez de gerar um APK que não conecta;
 *  - em desenvolvimento (expo start) vale API_URL ou o emulador.
 *
 * Versões: "version" (app.json) é a versão que o usuário vê, trocada à mão
 * a cada entrega. O número técnico do build (versionCode) é do EAS
 * (appVersionSource "remote" + autoIncrement no eas.json); no build local
 * do CI vem de ANDROID_VERSION_CODE (número da execução do workflow).
 */

/** URL da API no Render (nome do serviço em render.yaml do repositório Api). */
export const API_URL_PRODUCAO = 'https://biofrequencia-api.onrender.com/';
/** XAMPP da máquina de desenvolvimento, visto de dentro do emulador Android. */
export const API_URL_DESENVOLVIMENTO = 'http://10.0.2.2/BioFrequenciaApi/';

export function ehBuildDeDistribuicao(perfil: string | undefined): boolean {
  return perfil === 'preview' || perfil === 'production';
}

/** Endereço que só existe na máquina ou na rede de quem desenvolve. */
export function enderecoLocal(url: string): boolean {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return true;
  }
  return (
    host === 'localhost' ||
    host === '10.0.2.2' ||
    host.endsWith('.local') ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  );
}

export function resolverApiUrlDoBuild(env: Record<string, string | undefined>): string {
  const perfil = env.EAS_BUILD_PROFILE ?? env.APP_ENV;
  const distribuicao = ehBuildDeDistribuicao(perfil);
  const informada = env.API_URL?.trim();
  const url = (informada || (distribuicao ? API_URL_PRODUCAO : API_URL_DESENVOLVIMENTO)).replace(/\/+$/, '') + '/';
  if (distribuicao && (enderecoLocal(url) || !url.startsWith('https://'))) {
    throw new Error(
      `API_URL inválida para o build "${perfil}": ${url} - um APK distribuído precisa de um endereço público com HTTPS.`
    );
  }
  return url;
}

export function versionCodeDoBuild(valor: string | undefined): number | undefined {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : undefined;
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const versionCode = versionCodeDoBuild(process.env.ANDROID_VERSION_CODE);
  return {
    ...config,
    name: config.name ?? 'BioFrequência',
    slug: config.slug ?? 'biofrequencia-mobile',
    android: {
      ...config.android,
      ...(versionCode ? { versionCode } : {}),
    },
    extra: {
      ...config.extra,
      apiBaseUrl: resolverApiUrlDoBuild(process.env),
    },
  };
};
