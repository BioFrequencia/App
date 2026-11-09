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
/**
 * Como a API leu a presença nova (migração 008): no horário, entrada
 * atrasada (depois da tolerância - a API já registra o atraso), depois
 * do fim da aula ou num dia sem aula. null quando a API não conseguiu
 * conferir; ausente em API antiga.
 */
export interface EntradaDaPresenca {
  situacao: 'no_horario' | 'atrasada' | 'fora_do_horario' | 'sem_aula';
  horario_turma: { inicio: string; fim: string };
  tolerancia_minutos: number;
  id_atraso: number | null;
}

export type IdentificacaoDados =
  | { reconhecido: false }
  | { reconhecido: true; aluno: AlunoResumo; presenca: Presenca; distancia: number; entrada?: EntradaDaPresenca | null };

/** `dados` de presenca/listar.php. */
export interface PresencasDoDia {
  data: string;
  total_alunos: number;
  presentes: (AlunoResumo & { id_presenca: number; registrada_em: string; metodo: MetodoPresenca })[];
  ausentes: AlunoResumo[];
}

// ---------- Mensagem aos responsáveis (notificacao/*.php, a mesma do site) ----------

export type CanalMensagem = 'whatsapp' | 'email';

/** Se cada canal tem envio automático configurado na API. */
export interface ProvedoresMensagem {
  whatsapp: boolean;
  email: boolean;
}

/** `dados` de notificacao/modelos.php. */
export interface ModelosMensagem {
  modelos: { chave: string; titulo: string; texto: string }[];
  variaveis: { variavel: string; descricao: string }[];
  maximo: number;
  provedores: ProvedoresMensagem;
}

export interface ContatoResponsavel {
  id_responsavel: number;
  nome: string;
  parentesco: string | null;
  telefone: string;
  email: string | null;
  canal_preferido: string | null;
  /** Tem telefone que serve para o WhatsApp. */
  whatsapp: boolean;
  email_disponivel: boolean;
  /** Os canais que já vêm marcados (o preferido do responsável). */
  sugeridos: CanalMensagem[];
}

/** `dados` de notificacao/contatos.php. */
export interface ContatosDoAluno {
  aluno: { id_aluno: number; nome: string; turma: string };
  responsaveis: ContatoResponsavel[];
  provedores: ProvedoresMensagem;
}

export interface DestinoMensagem {
  id_responsavel: number;
  canal: CanalMensagem;
}

/** Como a mensagem sai: pelo provedor, pelo link do WhatsApp (sem provedor) ou na fila (e-mail sem provedor). */
export type ComoSaiMensagem = 'automatico' | 'link' | 'fila';

/** Um item da prévia (notificacao/previa.php). */
export interface EnvioPrevisto {
  id_responsavel: number;
  nome: string;
  parentesco: string | null;
  canal: CanalMensagem;
  contato: string;
  assunto: string | null;
  mensagem: string;
  como: ComoSaiMensagem;
}

export type StatusEnvio = 'enviada' | 'pendente' | 'erro';

export interface ResultadoEnvio {
  id_notificacao: number;
  id_responsavel: number;
  nome: string;
  canal: CanalMensagem;
  contato: string;
  status: StatusEnvio;
  /** O mesmo envio já tinha sido feito (a chave repetiu): nada saiu de novo. */
  repetido: boolean;
  /** WhatsApp sem envio automático: o link pronto para mandar. */
  link: string | null;
}

/** `dados` de notificacao/enviar.php. */
export interface EnvioDeMensagem {
  resultados: ResultadoEnvio[];
  resumo: { enviadas: number; pendentes: number; erros: number; repetidas: number };
}
