import { postJson } from './client';
import type { ApiResponse, CadastroPendenteDados, Sala } from '../types';

/**
 * POST {baseUrl}/user/listarSalasPublico.php
 * Mesma lista de turmas usada no cadastro feito pela coordenação
 * (site/desktop), só que sem exigir login - o aluno precisa escolher a
 * turma antes de existir qualquer cadastro dele no sistema.
 */
export async function listarSalasPublico(baseUrl: string): Promise<ApiResponse<Sala[]>> {
  return postJson<Sala[]>(baseUrl, 'user/listarSalasPublico.php', {});
}

/**
 * POST {baseUrl}/aluno/cadastroPendente.php
 * Sem cabeçalho de autenticação (assim como vincularDispositivo.php) -
 * fica pendente em tb_aluno_pendente até a coordenação aprovar ou
 * rejeitar pelo site/desktop. Ver comentário no topo do arquivo PHP.
 */
export async function cadastroPendente(
  baseUrl: string,
  dados: { nomeAluno: string; idSala: number; dtaNascAluno: string; generoAluno: string }
): Promise<ApiResponse<CadastroPendenteDados>> {
  return postJson<CadastroPendenteDados>(baseUrl, 'aluno/cadastroPendente.php', {
    nome_aluno: dados.nomeAluno,
    id_sala: dados.idSala,
    dta_nasc_aluno: dados.dtaNascAluno,
    genero_aluno: dados.generoAluno,
  });
}
