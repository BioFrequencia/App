import { postJson } from './client';
import type { AlunoBiometria, ApiResponse, IdentificacaoDados } from '../types';

/** Identificador do modelo do motor facial (face/motor.js), gravado com o cadastro. */
export const MODELO_FACIAL = 'faceapi-resnet34-128';

/** Alunos da escola com a situação da biometria e da presença de hoje. */
export function listarAlunos(): Promise<ApiResponse<AlunoBiometria[]>> {
  return postJson<AlunoBiometria[]>('biometria/alunos.php');
}

export function registrarConsentimento(idAluno: number, nomeResponsavel: string): Promise<ApiResponse<{ registrado_em: string }>> {
  return postJson('biometria/consentimento.php', { id_aluno: idAluno, nome_responsavel: nomeResponsavel.trim() });
}

/** Revoga o consentimento e APAGA a biometria do aluno. */
export function revogarConsentimento(idAluno: number): Promise<ApiResponse<null>> {
  return postJson('biometria/consentimento.php', { id_aluno: idAluno, revogar: true });
}

/** Erros com detalhe que a tela de cadastro trata de forma especial. */
export interface DetalheCadastroFacial {
  amostras?: number;
  falta_consentimento?: boolean;
  duplicado?: boolean;
  id_aluno_parecido?: number;
}

/**
 * Cadastro facial com as amostras (vetores) calculadas no aparelho.
 * confirmarDuplicado: o operador conferiu que é o aluno certo mesmo com o
 * rosto parecido com o de outro (ex.: gêmeos).
 */
export function cadastrarFacial(
  idAluno: number,
  amostras: number[][],
  confirmarDuplicado = false
): Promise<ApiResponse<DetalheCadastroFacial>> {
  return postJson('biometria/cadastrarBiometriaFacial.php', {
    id_aluno: idAluno,
    amostras,
    modelo: MODELO_FACIAL,
    confirmar_duplicado: confirmarDuplicado,
  });
}

/** Identificação 1:N; reconhecido, a API já grava a presença do dia. */
export function identificarFacial(descritor: number[]): Promise<ApiResponse<IdentificacaoDados & { sem_cadastros?: boolean }>> {
  return postJson('biometria/identificarFacial.php', { embedding: descritor, modelo: MODELO_FACIAL });
}

export function excluirBiometria(idAluno: number, tipo: 'facial' | 'digital' | 'todas'): Promise<ApiResponse<{ registros_apagados: number }>> {
  return postJson('biometria/excluirBiometria.php', { id_aluno: idAluno, tipo });
}
