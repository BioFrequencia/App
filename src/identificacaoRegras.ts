/**
 * Tradução da resposta da identificação para o que a tela mostra (função
 * pura - testada em test/identificacao.test.ts).
 *
 * "atrasada": a presença nova veio depois do início da aula mais a
 * tolerância da escola, e a API já registrou a entrada atrasada.
 */
import type { ApiResponse, IdentificacaoDados } from './types';

export type ResultadoTela =
  | { tipo: 'registrada'; nome: string; turma: string; registradaEm: string }
  | { tipo: 'atrasada'; nome: string; turma: string; registradaEm: string; inicioAula: string; tolerancia: number }
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
  if (!dados.presenca.nova) {
    return { tipo: 'ja_registrada', ...base };
  }
  const entrada = dados.entrada;
  if (entrada && entrada.situacao === 'atrasada' && entrada.id_atraso !== null) {
    return { tipo: 'atrasada', ...base, inicioAula: entrada.horario_turma.inicio, tolerancia: entrada.tolerancia_minutos };
  }
  return { tipo: 'registrada', ...base };
}

/** Resultados que somem sozinhos (o próximo aluno já pode se posicionar). */
export function resultadoSomeSozinho(resultado: ResultadoTela): boolean {
  return resultado.tipo === 'registrada' || resultado.tipo === 'atrasada' || resultado.tipo === 'ja_registrada';
}
