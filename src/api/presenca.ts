import { postJson } from './client';
import type { AlunoResumo, ApiResponse, EntradaDaPresenca, Presenca, PresencasDoDia } from '../types';

/** Presentes e ainda não registrados num dia (padrão: hoje), opcionalmente de uma turma. */
export function listarPresencas(data?: string, idSala?: number | null): Promise<ApiResponse<PresencasDoDia>> {
  return postJson<PresencasDoDia>('presenca/listar.php', { data, id_sala: idSala ?? null });
}

/** Presença sem biometria (o reconhecimento falhou ou o aluno não tem cadastro). */
export function registrarPresencaManual(idAluno: number): Promise<ApiResponse<{ aluno: AlunoResumo; presenca: Presenca }>> {
  return postJson('presenca/registrar.php', { id_aluno: idAluno, metodo: 'manual' });
}

/** Presença do aluno que o leitor de digital identificou (a comparação foi feita no tablet). */
export function registrarPresencaDigital(
  idAluno: number
): Promise<ApiResponse<{ aluno: AlunoResumo; presenca: Presenca; entrada?: EntradaDaPresenca | null }>> {
  return postJson('presenca/registrar.php', { id_aluno: idAluno, metodo: 'digital' });
}

/** O que fica no histórico de correções quando o tablet desfaz um reconhecimento errado. */
export const MOTIVO_DESFAZER_RECONHECIMENTO = 'Reconhecimento facial errado: não era este aluno (desfeito no app).';

/**
 * Desfaz a presença que o reconhecimento acabou de gravar para o aluno
 * errado (registro/remover.php). Ela é cancelada, não apagada: fica no
 * histórico de correções com o motivo, e leva junto a entrada atrasada que
 * gerou. Quem registrou pode desfazer no mesmo dia; depois, só a gestão,
 * pelo site.
 */
export function desfazerPresenca(idPresenca: number): Promise<ApiResponse<{ cancelados: { tipo: string; id: number }[] }>> {
  return postJson('registro/remover.php', { tipo: 'presenca', id: idPresenca, motivo: MOTIVO_DESFAZER_RECONHECIMENTO });
}
