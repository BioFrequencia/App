/**
 * Tradução da resposta da identificação para o que a tela mostra (função
 * pura - testada em test/identificacao.test.ts).
 */
import type { ApiResponse, IdentificacaoDados } from './types';

export type ResultadoTela =
  | { tipo: 'registrada'; nome: string; turma: string; registradaEm: string }
  | { tipo: 'ja_registrada'; nome: string; turma: string; registradaEm: string }
  | { tipo: 'nao_reconhecido' }
  | { tipo: 'foto'; texto: string }
  | { tipo: 'erro'; texto: string };

/** Quanto tempo o resultado positivo fica na tela antes de liberar o próximo aluno. */
export const TEMPO_RESULTADO_MS = 4500;

export function resultadoDaIdentificacao(
  resposta: ApiResponse<IdentificacaoDados & { sem_cadastros?: boolean }>
): ResultadoTela {
  const dados = resposta.dados;
  if (!resposta.sucesso || !dados) {
    if (dados?.sem_cadastros) {
      return { tipo: 'erro', texto: 'Nenhum aluno desta escola tem biometria facial ainda. Cadastre em "Cadastrar biometria".' };
    }
    return { tipo: 'erro', texto: resposta.mensagem || 'Não foi possível identificar. Tente de novo.' };
  }
  if (!dados.reconhecido) {
    return { tipo: 'nao_reconhecido' };
  }
  const base = {
    nome: dados.aluno.nome_aluno,
    turma: dados.aluno.nome_sala,
    registradaEm: dados.presenca.registrada_em,
  };
  return dados.presenca.nova ? { tipo: 'registrada', ...base } : { tipo: 'ja_registrada', ...base };
}

/** Resultados que somem sozinhos (o próximo aluno já pode se posicionar). */
export function resultadoSomeSozinho(resultado: ResultadoTela): boolean {
  return resultado.tipo === 'registrada' || resultado.tipo === 'ja_registrada';
}
