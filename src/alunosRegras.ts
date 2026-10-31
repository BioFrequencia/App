/**
 * Busca e resumo da lista de alunos do app (funções puras - testadas em
 * test/alunos.test.ts).
 */
import type { AlunoBiometria } from './types';

/** Minúsculas e sem acento: "JOÃO" e "joao" se encontram. */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export type FiltroBiometria = 'todos' | 'sem_facial' | 'com_facial';

/** Filtra por nome (todas as palavras digitadas, em qualquer ordem), turma e situação da biometria. */
export function filtrarAlunos(
  alunos: AlunoBiometria[],
  busca: string,
  idSala: number | null,
  filtro: FiltroBiometria = 'todos'
): AlunoBiometria[] {
  const palavras = normalizar(busca).split(/\s+/).filter(Boolean);
  return alunos.filter((aluno) => {
    if (idSala !== null && aluno.id_sala !== idSala) return false;
    if (filtro === 'sem_facial' && aluno.tem_facial) return false;
    if (filtro === 'com_facial' && !aluno.tem_facial) return false;
    const nome = normalizar(aluno.nome_aluno);
    return palavras.every((palavra) => nome.includes(palavra));
  });
}

export interface ResumoEscola {
  total: number;
  presentesHoje: number;
  comFacial: number;
  semConsentimento: number;
}

export function resumirAlunos(alunos: AlunoBiometria[]): ResumoEscola {
  return {
    total: alunos.length,
    presentesHoje: alunos.filter((a) => a.presenca_hoje !== null).length,
    comFacial: alunos.filter((a) => a.tem_facial).length,
    semConsentimento: alunos.filter((a) => a.consentimento_responsavel === null).length,
  };
}

/** Turmas presentes na lista (para os filtros), em ordem alfabética. */
export function turmasDaLista(alunos: AlunoBiometria[]): { id_sala: number; nome_sala: string }[] {
  const porId = new Map<number, string>();
  alunos.forEach((a) => porId.set(a.id_sala, a.nome_sala));
  return [...porId.entries()]
    .map(([id_sala, nome_sala]) => ({ id_sala, nome_sala }))
    .sort((a, b) => a.nome_sala.localeCompare(b.nome_sala, 'pt-BR', { numeric: true }));
}
