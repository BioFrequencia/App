/**
 * Tipos que espelham o contrato JSON da BioFrequenciaApi usado pelo app
 * da coordenação. Ver na API: user/selectCoord.php, biometria/*.php e
 * presenca/*.php.
 */

/** Envelope padrão de resposta usado por toda a API (helpers/resposta.php). */
export interface ApiResponse<T> {
  sucesso: boolean;
  mensagem: string;
  dados: T | null;
}

/** Sessão guardada no aparelho depois do login da coordenação. */
export interface Sessao {
  token: string;
  /** Segundos desde 1970 (UTC), como o "exp" do token. */
  expiraEm: number;
  nomeCoordenacao: string;
  emailCoordenacao: string;
  nomeEscola: string;
}

/** `dados` do login (user/selectCoord.php). */
export interface LoginDados {
  id_coordenacao: number;
  nome_coordenacao: string;
  email_coordenacao: string;
  nome_escola: string;
  token: string;
  expira_em: number;
}

export interface Turma {
  id_sala: number;
  nome_sala: string;
  periodo_sala: string | null;
}

/** Linha de biometria/alunos.php. */
export interface AlunoBiometria {
  id_aluno: number;
  nome_aluno: string;
  dta_nasc_aluno: string;
  id_sala: number;
  nome_sala: string;
  tem_facial: boolean;
  facial_atualizada_em: string | null;
  digitais: number;
  consentimento_responsavel: string | null;
  consentimento_em: string | null;
  presenca_hoje: string | null;
  presenca_metodo: MetodoPresenca | null;
}

export type MetodoPresenca = 'facial' | 'digital' | 'manual';

export interface Presenca {
  nova: boolean;
  id_presenca: number;
  registrada_em: string;
  metodo: MetodoPresenca;
}

export interface AlunoResumo {
  id_aluno: number;
  nome_aluno: string;
  id_sala: number;
  nome_sala: string;
}

/** `dados` de biometria/identificarFacial.php. */
export type IdentificacaoDados =
  | { reconhecido: false }
  | { reconhecido: true; aluno: AlunoResumo; presenca: Presenca; distancia: number };

/** `dados` de presenca/listar.php. */
export interface PresencasDoDia {
  data: string;
  total_alunos: number;
  presentes: (AlunoResumo & { id_presenca: number; registrada_em: string; metodo: MetodoPresenca })[];
  ausentes: AlunoResumo[];
}
