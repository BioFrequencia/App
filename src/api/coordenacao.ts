import { postJson } from './client';
import type { ApiResponse, LoginDados, Turma } from '../types';

/**
 * Login da coordenação - a mesma conta do site. "cliente: app" pede a
 * sessão de 12 horas (o tablet fica na entrada o turno inteiro).
 */
export function entrar(email: string, senha: string): Promise<ApiResponse<LoginDados>> {
  return postJson<LoginDados>('user/selectCoord.php', { email: email.trim(), senha, cliente: 'app' }, false);
}

/** Turmas da escola de quem está logado. */
export function listarTurmas(): Promise<ApiResponse<Turma[]>> {
  return postJson<Turma[]>('user/listarSalas.php');
}
