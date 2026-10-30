import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

import type { DispositivoVinculado } from '../types';

/**
 * Tudo relacionado à conexão do celular com a conta fica no SecureStore
 * (Keychain no iOS, Keystore no Android), nunca em AsyncStorage/estado em
 * memória, porque `device_secret` é um segredo criptográfico de longa
 * duração: qualquer check-in assinado com ele é aceito pela API como
 * vindo deste aluno. O servidor só entrega o segredo na resposta do login
 * (aluno/entrar.php) ou do cadastro. A senha da conta não é guardada.
 */

const KEY_DEVICE_UUID = 'biofreq_device_uuid';
const KEY_DEVICE_VINCULADO = 'biofreq_device_vinculado';

/**
 * O device_uuid é gerado uma única vez por instalação e reaproveitado em
 * todo login futuro: a API reaproveita a linha desse UUID e troca o
 * segredo (ver registrarDispositivo() em helpers/dispositivo.php).
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
 * "Sair da conta" (ou celular desconectado pela API): apaga o segredo da
 * conexão atual. O device_uuid é mantido de propósito (é uma identidade
 * estável do aparelho, não um segredo) para que o próximo login no mesmo
 * celular reaproveite o mesmo UUID, exatamente como a API já espera.
 */
export async function limparVinculo(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY_DEVICE_VINCULADO);
}
