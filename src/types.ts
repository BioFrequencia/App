/**
 * Tipos que espelham exatamente o contrato JSON da BioFrequenciaApi.
 * Ver: BioFrequenciaApi/aluno/entrar.php, aluno/criarConta.php e
 *      digital/checkinBiometrico.php
 */

/** Envelope padrão de resposta usado por toda a API (helpers/resposta.php). */
export interface ApiResponse<T> {
  sucesso: boolean;
  mensagem: string;
  dados: T | null;
}

/** `dados` do login (aluno/entrar.php) e do cadastro (aluno/criarConta.php). */
export interface AcessoAlunoDados {
  id_dispositivo: number;
  id_aluno: number;
  nome_aluno: string;
  nome_sala: string | null;
  email: string;
  /** Só é enviado nesta resposta - nunca mais é retornado pela API. */
  device_secret: string;
}

/** `dados` de uma resposta bem-sucedida de checkinBiometrico.php */
export interface CheckinBiometricoDados {
  id_checkin: number;
}

export type TipoCheckin = 'atraso' | 'presenca';

/** O que fica salvo localmente (SecureStore) depois do login ou do cadastro. */
export interface DispositivoVinculado {
  baseUrl: string;
  deviceUuid: string;
  deviceSecret: string;
  idAluno: number;
  nomeAluno: string;
  /** E-mail da conta. Ausente em celulares conectados pelo antigo código de vínculo. */
  email?: string;
}

/** Tipo de ocorrência que o aluno envia pelo aplicativo. */
export type TipoOcorrencia = 'falta' | 'atraso';

/** `dados` de uma resposta bem-sucedida de ocorrencia/enviarOcorrencia.php */
export interface EnviarOcorrenciaDados {
  id_ocorrencia: number;
  criado_em: string;
  nome_aluno: string;
  status: 'pendente';
}

/** O que o aluno preenche depois de confirmar a biometria. */
export interface FormularioOcorrencia {
  tipo: TipoOcorrencia;
  motivo: string;
  observacao: string;
  responsavelCiente: boolean;
}
