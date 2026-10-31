import type { AlunoBiometria, Sessao } from './types';

/** Telas do app (pilha simples, sem biblioteca de navegação). */
export type Rota =
  | { nome: 'inicio' }
  | { nome: 'identificar' }
  | { nome: 'alunos' }
  | { nome: 'aluno'; aluno: AlunoBiometria }
  | { nome: 'capturaFacial'; aluno: AlunoBiometria }
  | { nome: 'registros' };

export interface Navegacao {
  sessao: Sessao;
  navegar: (rota: Rota) => void;
  voltar: () => void;
  /** Encerra a sessão da coordenação neste aparelho. */
  sair: () => void;
}
