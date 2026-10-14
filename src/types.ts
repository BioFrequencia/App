/**
 * Tipos que espelham exatamente o contrato JSON da BioFrequenciaApi.
 * Ver: BioFrequenciaApi/digital/vincularDispositivo.php e
 *      BioFrequenciaApi/digital/checkinBiometrico.php
 */

/** Envelope padrão de resposta usado por toda a API (helpers/resposta.php). */
export interface ApiResponse<T> {
  sucesso: boolean;
  mensagem: string;
  dados: T | null;
}

/** `dados` de uma resposta bem-sucedida de vincularDispositivo.php */
export interface VincularDispositivoDados {
  id_dispositivo: number;
  id_aluno: number;
  nome_aluno: string;
  /** Só é enviado nesta resposta - nunca mais é retornado pela API. */
  device_secret: string;
}

/** Ver BioFrequenciaApi/user/listarSalasPublico.php */
export interface Sala {
  id_sala: number;
  nome_sala: string;
  periodo_sala: string | null;
}

export const GENEROS_ALUNO = ['Feminino', 'Masculino'] as const;

/** `dados` de uma resposta bem-sucedida de aluno/cadastroPendente.php */
export interface CadastroPendenteDados {
  id_aluno_pendente: number;
}

/** `dados` de uma resposta bem-sucedida de checkinBiometrico.php */
export interface CheckinBiometricoDados {
  id_checkin: number;
}

export type TipoCheckin = 'atraso' | 'presenca';

/** O que fica salvo localmente (SecureStore) depois de um vínculo bem-sucedido. */
export interface DispositivoVinculado {
  baseUrl: string;
  deviceUuid: string;
  deviceSecret: string;
  idAluno: number;
  nomeAluno: string;
}
