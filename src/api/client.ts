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
 * POST genérico contra a BioFrequenciaApi. Nenhum endpoint deste app usa
 * cabeçalho de autenticação - ver comentários no topo de cada arquivo
 * PHP: o login (e-mail e senha) entrega o segredo do celular, e cada
 * check-in vai assinado com ele (HMAC).
 */
// A API gratuita do Render dorme sem uso e leva até ~1 minuto para
// acordar. Sem limite nenhum, uma conexão presa deixava o botão girando
// para sempre; com um limite curto, o primeiro envio do dia falhava.
const TEMPO_LIMITE_MS = 70_000;

export async function postJson<T>(
  baseUrl: string,
  caminho: string,
  corpo: unknown
): Promise<ApiResponse<T>> {
  const url = montarUrl(baseUrl, caminho);
  const controlador = new AbortController();
  const limite = setTimeout(() => controlador.abort(), TEMPO_LIMITE_MS);

  let resposta: Response;
  try {
    resposta = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
      signal: controlador.signal,
    });
  } catch (erro) {
    throw new ApiError(
      controlador.signal.aborted
        ? 'O servidor da escola demorou demais para responder. Tente de novo em instantes.'
        : 'Não foi possível conectar ao servidor da escola. Verifique sua conexão com a internet.',
      0
    );
  } finally {
    clearTimeout(limite);
  }

  let json: ApiResponse<T>;
  try {
    json = await resposta.json();
  } catch {
    throw new ApiError(`Resposta inesperada do servidor da escola (HTTP ${resposta.status}).`, resposta.status);
  }

  return json;
}

/**
 * A API recusou o envio porque este celular não está mais conectado à
 * conta (a coordenação desconectou, ou o aluno entrou em outro aparelho):
 * o app volta para o login em vez de deixar o aluno tentando de novo.
 */
export function pedeNovoLogin(resposta: ApiResponse<unknown>): boolean {
  const dados = resposta.dados as { reconectar?: unknown } | null;
  return !resposta.sucesso && dados?.reconectar === true;
}
