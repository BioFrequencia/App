import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

import type { DispositivoVinculado } from '../types';

/**
 * Tudo relacionado a identidade/pareamento do dispositivo fica no
 * SecureStore (Keychain no iOS, Keystore no Android), nunca em
 * AsyncStorage/estado em memória, porque `device_secret` é um segredo
 * criptográfico de longa duração: qualquer check-in assinado com ele é
 * aceito pela API como vindo deste aluno. Ver comentário no topo de
 * vincularDispositivo.php - o servidor só entrega o segredo uma vez.
 */

const KEY_DEVICE_UUID = 'biofreq_device_uuid';
const KEY_DEVICE_VINCULADO = 'biofreq_device_vinculado';
const KEY_BASE_URL = 'biofreq_base_url';

export async function getBaseUrl(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY_BASE_URL);
}

export async function setBaseUrl(baseUrl: string): Promise<void> {
  await SecureStore.setItemAsync(KEY_BASE_URL, baseUrl);
}

/**
 * O device_uuid é gerado uma única vez por instalação e reaproveitado em
 * toda tentativa de vínculo futura (a API já lida com reenvio do mesmo
 * UUID - ver comentário "desativaAnterior" em vincularDispositivo.php).
 */
export async function getOrCreateDeviceUuid(): Promise<string> {
  const existente = await SecureStore.getItemAsync(KEY_DEVICE_UUID);
  if (existente) {
    return existente;
  }
  const novo = Crypto.randomUUID();
  await SecureStore.setItemAsync(KEY_DEVICE_UUID, novo);
  return novo;
}

export async function salvarDispositivoVinculado(dados: DispositivoVinculado): Promise<void> {
  await SecureStore.setItemAsync(KEY_DEVICE_VINCULADO, JSON.stringify(dados));
}

export async function obterDispositivoVinculado(): Promise<DispositivoVinculado | null> {
  const bruto = await SecureStore.getItemAsync(KEY_DEVICE_VINCULADO);
  if (!bruto) {
    return null;
  }
  try {
    return JSON.parse(bruto) as DispositivoVinculado;
  } catch {
    // Dado corrompido/formato antigo - trata como não pareado.
    return null;
  }
}

/**
 * "Trocar dispositivo / Sair": apaga o segredo do vínculo atual. O
 * device_uuid é mantido de propósito (é uma identidade estável do
 * aparelho, não um segredo) para que um novo pareamento no mesmo celular
 * reaproveite o mesmo UUID, exatamente como a API já espera.
 */
export async function limparVinculo(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY_DEVICE_VINCULADO);
}
