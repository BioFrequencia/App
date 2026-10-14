import { postJson } from './client';
import { assinarCheckin } from '../crypto/hmac';
import type { ApiResponse, EnviarOcorrenciaDados, TipoOcorrencia } from '../types';

/**
 * POST {baseUrl}/ocorrencia/enviarOcorrencia.php
 *
 * Manda o que o aluno preencheu depois de confirmar a biometria. NÃO
 * cria falta: o registro fica pendente até a coordenação aprovar ou
 * negar pelo site. A mesma assinatura HMAC do check-in prova que o
 * envio veio deste aparelho, sem precisar de token de coordenação
 * nenhum dentro do aplicativo.
 *
 * O timestamp é gerado imediatamente antes do envio (nunca cacheado):
 * o servidor recusa qualquer requisição a mais de 5 minutos do horário
 * dele, e a assinatura usa exatamente esta string.
 */
export async function enviarOcorrencia(
  baseUrl: string,
  deviceUuid: string,
  deviceSecret: string,
  dados: {
    tipo: TipoOcorrencia;
    motivo: string;
    observacao: string;
    responsavelCiente: boolean;
  }
): Promise<ApiResponse<EnviarOcorrenciaDados>> {
  const timestamp = new Date().toISOString();
  const assinatura = assinarCheckin(deviceUuid, dados.tipo, timestamp, deviceSecret);

  return postJson<EnviarOcorrenciaDados>(baseUrl, 'ocorrencia/enviarOcorrencia.php', {
    device_uuid: deviceUuid,
    tipo: dados.tipo,
    timestamp,
    assinatura,
    motivo: dados.motivo,
    observacao: dados.observacao,
    responsavel_ciente: dados.responsavelCiente,
  });
}
