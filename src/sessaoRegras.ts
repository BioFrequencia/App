/**
 * Regras da sessão da coordenação (funções puras, sem React Native -
 * testadas em test/sessao.test.ts).
 */
import type { LoginDados, Sessao } from './types';

/**
 * A sessão é descartada um pouco antes de o token vencer: um token que
 * vence no meio de uma identificação faria a presença do aluno falhar.
 */
export const MARGEM_EXPIRACAO_MS = 5 * 60 * 1000;

export function sessaoDoLogin(dados: LoginDados): Sessao {
  return {
    token: dados.token,
    expiraEm: dados.expira_em,
    nomeCoordenacao: dados.nome_coordenacao,
    emailCoordenacao: dados.email_coordenacao,
    nomeEscola: dados.nome_escola,
  };
}

export function sessaoValida(sessao: unknown, agoraMs: number = Date.now()): sessao is Sessao {
  if (!sessao || typeof sessao !== 'object') return false;
  const s = sessao as Partial<Sessao>;
  return typeof s.token === 'string' && s.token !== ''
    && typeof s.expiraEm === 'number'
    && s.expiraEm * 1000 - agoraMs > MARGEM_EXPIRACAO_MS
    && typeof s.nomeEscola === 'string';
}

/** Sessão guardada no aparelho (texto JSON), ou null se ausente, corrompida ou vencida. */
export function lerSessaoGuardada(texto: string | null, agoraMs: number = Date.now()): Sessao | null {
  if (!texto) return null;
  try {
    const sessao: unknown = JSON.parse(texto);
    return sessaoValida(sessao, agoraMs) ? sessao : null;
  } catch {
    return null;
  }
}
