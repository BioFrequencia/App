import { postJson } from './client';
import type { ApiResponse, VincularDispositivoDados } from '../types';

/**
 * POST {baseUrl}/digital/vincularDispositivo.php
 * Campos e formato de resposta espelham exatamente
 * BioFrequenciaApi/digital/vincularDispositivo.php.
 */
export async function vincularDispositivo(
  baseUrl: string,
  codigo: string,
  deviceUuid: string
): Promise<ApiResponse<VincularDispositivoDados>> {
  return postJson<VincularDispositivoDados>(baseUrl, 'digital/vincularDispositivo.php', {
    codigo,
    device_uuid: deviceUuid,
  });
}
