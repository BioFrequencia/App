import { obterApiBaseUrl } from '../config';
import type { ApiResponse } from '../types';

/** A API não respondeu (rede, tempo esgotado) ou respondeu algo que não é JSON. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly httpStatus: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** O token da coordenação venceu ou foi recusado: o app volta para o login. */
export class SessaoExpiradaError extends ApiError {
  constructor() {
    super('Sua sessão terminou. Entre de novo com a conta da coordenação.', 401);
    this.name = 'SessaoExpiradaError';
  }
}

// A API gratuita do Render dorme sem uso e leva até ~1 minuto para
// acordar. Sem limite nenhum, uma conexão presa deixava o botão girando
// para sempre; com um limite curto, o primeiro envio do dia falhava.
const TEMPO_LIMITE_MS = 70_000;

let tokenAtual: string | null = null;
let aoExpirar: (() => void) | null = null;

/** Token mandado em toda chamada autenticada (definido no login). */
export function definirToken(token: string | null): void {
  tokenAtual = token;
}

/** Quem trata a sessão expirada (o App, que volta para o login). */
export function definirAoExpirar(funcao: (() => void) | null): void {
  aoExpirar = funcao;
}

function montarUrl(caminho: string): string {
  return obterApiBaseUrl() + caminho.replace(/^\/+/, '');
}

/**
 * POST contra a BioFrequenciaApi. Devolve o envelope da API mesmo quando
 * ela recusa (sucesso: false, com a mensagem para a tela); lança ApiError
 * só quando não houve resposta utilizável e SessaoExpiradaError no 401 de
 * uma chamada autenticada.
 */
export async function postJson<T>(caminho: string, corpo: unknown = {}, autenticado = true): Promise<ApiResponse<T>> {
  const controlador = new AbortController();
  const limite = setTimeout(() => controlador.abort(), TEMPO_LIMITE_MS);
  const cabecalhos: Record<string, string> = { 'Content-Type': 'application/json' };
  if (autenticado && tokenAtual) {
    cabecalhos.Authorization = `Bearer ${tokenAtual}`;
  }

  let resposta: Response;
  try {
    resposta = await fetch(montarUrl(caminho), {
      method: 'POST',
      headers: cabecalhos,
      body: JSON.stringify(corpo),
      signal: controlador.signal,
    });
  } catch {
    throw new ApiError(
      controlador.signal.aborted
        ? 'O servidor demorou demais para responder. Tente de novo em instantes.'
        : 'Sem conexão com o servidor. Verifique a internet do aparelho.',
      0
    );
  } finally {
    clearTimeout(limite);
  }

  if (autenticado && resposta.status === 401) {
    aoExpirar?.();
    throw new SessaoExpiradaError();
  }

  try {
    return (await resposta.json()) as ApiResponse<T>;
  } catch {
    throw new ApiError(`Resposta inesperada do servidor (HTTP ${resposta.status}).`, resposta.status);
  }
}

/** Mensagem para a tela a partir de qualquer erro de chamada. */
export function mensagemDeErro(erro: unknown, padrao = 'Algo deu errado. Tente de novo.'): string {
  return erro instanceof ApiError ? erro.message : padrao;
}
