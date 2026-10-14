import type { ApiResponse } from '../types';

/** Erro "de aplicação": a API respondeu, mas com sucesso: false. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly httpStatus: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Junta a base URL configurada pelo usuário com o caminho do endpoint,
 *  tolerando barra final na base (ex.: ".../BioFrequenciaApi/"). */
function montarUrl(baseUrl: string, caminho: string): string {
  const base = baseUrl.trim().replace(/\/+$/, '');
  const path = caminho.replace(/^\/+/, '');
  return `${base}/${path}`;
}

/**
 * POST genérico contra a BioFrequenciaApi. Nenhum dos dois endpoints deste
 * app (vincularDispositivo.php, checkinBiometrico.php) usa cabeçalho de
 * autenticação - ver comentários no topo de cada arquivo PHP: a segurança
 * vem do código de vínculo de uso único e, depois, da assinatura HMAC.
 */
export async function postJson<T>(
  baseUrl: string,
  caminho: string,
  corpo: unknown
): Promise<ApiResponse<T>> {
  const url = montarUrl(baseUrl, caminho);

  let resposta: Response;
  try {
    resposta = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
    });
  } catch (erro) {
    throw new ApiError(
      'Não foi possível conectar ao servidor da escola. Verifique o endereço da API e sua conexão com a internet.',
      0
    );
  }

  let json: ApiResponse<T>;
  try {
    json = await resposta.json();
  } catch {
    throw new ApiError('Resposta inesperada do servidor da escola.', resposta.status);
  }

  return json;
}
