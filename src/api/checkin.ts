import { postJson } from './client';
import { assinarCheckin } from '../crypto/hmac';
import type { ApiResponse, CheckinBiometricoDados, TipoCheckin } from '../types';

/**
 * POST {baseUrl}/digital/checkinBiometrico.php
 *
 * O timestamp é gerado aqui, imediatamente antes do envio (nunca
 * cacheado), porque o servidor rejeita qualquer check-in cujo timestamp
 * esteja a mais de 5 minutos do horário dele (ver checkinBiometrico.php,
 * tolerância de replay). A assinatura usa exatamente essa mesma string de
 * timestamp, não uma recalculada depois.
 */
export async function enviarCheckinBiometrico(
  baseUrl: string,
  deviceUuid: string,
  deviceSecret: string,
  tipo: TipoCheckin
): Promise<ApiResponse<CheckinBiometricoDados>> {
  const timestamp = new Date().toISOString();
  const assinatura = assinarCheckin(deviceUuid, tipo, timestamp, deviceSecret);

  return postJson<CheckinBiometricoDados>(baseUrl, 'digital/checkinBiometrico.php', {
    device_uuid: deviceUuid,
    tipo,
    timestamp,
    assinatura,
  });
}
