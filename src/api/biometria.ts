import { postJson } from './client';
import type { AlunoBiometria, AlunoResumo, ApiResponse, EntradaDaPresenca, Presenca } from '../types';

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

/**
 * Fotos tiradas em seguida a cada identificação. A API só grava a presença
 * sozinha quando todas apontam o mesmo aluno com semelhança alta; com uma
 * foto só ela é mais exigente.
 */
export const FOTOS_POR_IDENTIFICACAO = 2;

/**
 * Identificação incerta (migração 012): a API achou um candidato, mas sem
 * certeza - NADA foi gravado. Quem está no tablet confirma ou recusa em
 * confirmarIdentificacao(), dentro de expira_em_segundos.
 */
export interface ConfirmacaoIdentificacao {
  id_identificacao: number;
  aluno: AlunoResumo;
  motivo: string;
  expira_em_segundos: number;
}

/** Presença gravada pela identificação (ou pela confirmação). */
export interface PresencaIdentificada {
  reconhecido: true;
  aluno: AlunoResumo;
  presenca: Presenca;
  /** Como a API leu a entrada (no horário, atrasada...); ausente em API antiga. */
  entrada?: EntradaDaPresenca | null;
  distancia?: number;
  /** Presença nova: quem está no tablet pode desfazer se o nome não for o do aluno. */
  pode_desfazer?: boolean;
}

/** `dados` de biometria/identificarFacial.php. */
export type RespostaIdentificacao = (
  | PresencaIdentificada
  | { reconhecido: false; motivo?: string; confirmacao?: ConfirmacaoIdentificacao }
) & { sem_cadastros?: boolean };

/** `dados` de biometria/confirmarIdentificacao.php. */
export type RespostaConfirmacao = { registrado: false } | (PresencaIdentificada & { registrado: true });

/**
 * Identificação 1:N com as fotos tiradas em seguida. Só com certeza a API
 * grava a presença do dia; com dúvida ela devolve `confirmacao` e não grava
 * nada.
 */
export function identificarFacial(descritores: number[][]): Promise<ApiResponse<RespostaIdentificacao>> {
  return postJson('biometria/identificarFacial.php', { embeddings: descritores, modelo: MODELO_FACIAL });
}

/**
 * Resposta de quem está no tablet à identificação incerta: true grava a
 * presença do aluno que a API guardou na tentativa (não um id mandado
 * pelo app); false não grava nada.
 */
export function confirmarIdentificacao(idIdentificacao: number, confirmar: boolean): Promise<ApiResponse<RespostaConfirmacao>> {
  return postJson('biometria/confirmarIdentificacao.php', { id_identificacao: idIdentificacao, confirmar });
}

export function excluirBiometria(idAluno: number, tipo: 'facial' | 'digital' | 'todas'): Promise<ApiResponse<{ registros_apagados: number }>> {
  return postJson('biometria/excluirBiometria.php', { id_aluno: idAluno, tipo });
}

/** Uma digital da escola, decifrada pela API, para o leitor comparar no aparelho. */
export interface TemplateDigital {
  id_aluno: number;
  dedo: string;
  formato: string;
  template: string;
}

/** Digitais dos alunos ativos da escola (a comparação 1:N é feita pelo SDK do leitor, no tablet). */
export function templatesDigitais(): Promise<ApiResponse<TemplateDigital[]>> {
  return postJson<TemplateDigital[]>('biometria/templatesDigitais.php');
}

/** Cadastra (ou troca) a digital de um dedo do aluno - precisa do consentimento do responsável. */
export function cadastrarDigital(
  idAluno: number,
  dedo: string,
  template: string,
  formato: string
): Promise<ApiResponse<{ falta_consentimento?: boolean } | null>> {
  return postJson('biometria/cadastrarBiometriaDigital.php', { id_aluno: idAluno, dedo, template, formato });
}
