import { postJson } from './client';
import type { AlunoResumo, ApiResponse, Presenca, PresencasDoDia } from '../types';

/** Presentes e ainda não registrados num dia (padrão: hoje), opcionalmente de uma turma. */
export function listarPresencas(data?: string, idSala?: number | null): Promise<ApiResponse<PresencasDoDia>> {
  return postJson<PresencasDoDia>('presenca/listar.php', { data, id_sala: idSala ?? null });
}

/** Presença sem biometria (o reconhecimento falhou ou o aluno não tem cadastro). */
export function registrarPresencaManual(idAluno: number): Promise<ApiResponse<{ aluno: AlunoResumo; presenca: Presenca }>> {
  return postJson('presenca/registrar.php', { id_aluno: idAluno, metodo: 'manual' });
}
