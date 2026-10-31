import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { lerSessaoGuardada } from './sessaoRegras';
import type { Sessao } from './types';

/**
 * A sessão da coordenação (token) fica no SecureStore - Keystore no
 * Android, Keychain no iOS -, nunca em armazenamento comum: com ela,
 * qualquer pessoa com o aparelho na mão leria e alteraria os dados da
 * escola. A senha não é guardada.
 */
const CHAVE = 'biofreq_sessao_coordenacao';

/** Chaves da versão anterior do app (celular do aluno), apagadas na primeira abertura. */
const CHAVES_ANTIGAS = ['biofreq_device_vinculado', 'biofreq_device_uuid'];

// No navegador (prévia com "expo start --web") não existe SecureStore.
const naWeb = Platform.OS === 'web';

async function ler(chave: string): Promise<string | null> {
  return naWeb ? globalThis.localStorage?.getItem(chave) ?? null : SecureStore.getItemAsync(chave);
}

async function apagar(chave: string): Promise<void> {
  if (naWeb) {
    globalThis.localStorage?.removeItem(chave);
  } else {
    await SecureStore.deleteItemAsync(chave);
  }
}

export async function carregarSessao(): Promise<Sessao | null> {
  if (!naWeb) {
    await Promise.all(CHAVES_ANTIGAS.map((chave) => SecureStore.deleteItemAsync(chave).catch(() => undefined)));
  }
  const sessao = lerSessaoGuardada(await ler(CHAVE));
  if (!sessao) {
    await apagar(CHAVE);
  }
  return sessao;
}

export async function salvarSessao(sessao: Sessao): Promise<void> {
  const texto = JSON.stringify(sessao);
  if (naWeb) {
    globalThis.localStorage?.setItem(CHAVE, texto);
  } else {
    await SecureStore.setItemAsync(CHAVE, texto);
  }
}

export async function apagarSessao(): Promise<void> {
  await apagar(CHAVE);
}
