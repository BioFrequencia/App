/**
 * Tradução das respostas da identificação para o que a tela mostra (funções
 * puras - testadas em test/identificacao.test.ts).
 *
 * "atrasada": a presença nova veio depois do início da aula mais a
 * tolerância da escola, e a API já registrou a entrada atrasada.
 * "confirmar": a API achou um aluno parecido, mas sem certeza - nada foi
 * gravado; quem está no tablet responde "é" ou "não é".
 * "nada_registrado": a resposta foi "não é", o tempo de confirmar passou ou
 * o tablet desfez um reconhecimento errado.
 */
import type { PresencaIdentificada, RespostaConfirmacao, RespostaIdentificacao } from './api/biometria';
import type { ApiResponse } from './types';

interface AlunoNaTela {
  nome: string;
  turma: string;
}

interface PresencaNaTela extends AlunoNaTela {
  registradaEm: string;
  idPresenca: number;
  /** A API deixa desfazer (presença nova, feita por esta conta agora). */
  podeDesfazer: boolean;
}

export type ResultadoTela =
  | ({ tipo: 'registrada' } & PresencaNaTela)
  | ({ tipo: 'atrasada'; inicioAula: string; tolerancia: number } & PresencaNaTela)
  | ({ tipo: 'ja_registrada'; registradaEm: string } & AlunoNaTela)
  | ({ tipo: 'confirmar'; idIdentificacao: number; motivo: string; expiraEmMs: number } & AlunoNaTela)
  | { tipo: 'nao_reconhecido'; motivo?: string }
  | { tipo: 'nada_registrado'; texto: string }
  | { tipo: 'foto'; texto: string }
  | { tipo: 'erro'; texto: string; titulo?: string };

/** Quanto tempo o resultado positivo fica na tela antes de liberar o próximo aluno. */
export const TEMPO_RESULTADO_MS = 4500;
/** Com "Não é este aluno" na tela: mais tempo para quem está no tablet conferir o nome. */
export const TEMPO_RESULTADO_COM_DESFAZER_MS = 8000;
/**
 * Folga da tela sobre o prazo de confirmar da API: o cartão some antes de a
 * API recusar a resposta (a contagem dela começou antes de a resposta chegar).
 */
export const FOLGA_CONFIRMACAO_MS = 5000;

export const CONFIRMACAO_EXPIRADA: ResultadoTela = {
  tipo: 'nada_registrado',
  texto: 'O tempo para confirmar passou e nada foi registrado. Tente de novo.',
};

/** Presença gravada (identificação com certeza ou confirmação "é este aluno"). */
function resultadoDaPresenca(dados: PresencaIdentificada): ResultadoTela {
  const base = {
    nome: dados.aluno.nome_aluno,
    turma: dados.aluno.nome_sala,
    registradaEm: dados.presenca.registrada_em,
  };
  if (!dados.presenca.nova) {
    return { tipo: 'ja_registrada', ...base };
  }
  // API antiga (sem pode_desfazer): sem o botão - ela não cancelava presença.
  const presenca = { ...base, idPresenca: dados.presenca.id_presenca, podeDesfazer: dados.pode_desfazer === true };
  const entrada = dados.entrada;
  if (entrada && entrada.situacao === 'atrasada' && entrada.id_atraso !== null) {
    return { tipo: 'atrasada', ...presenca, inicioAula: entrada.horario_turma.inicio, tolerancia: entrada.tolerancia_minutos };
  }
  return { tipo: 'registrada', ...presenca };
}

export function resultadoDaIdentificacao(resposta: ApiResponse<RespostaIdentificacao>, agoraMs = Date.now()): ResultadoTela {
  const dados = resposta.dados;
  if (!resposta.sucesso || !dados) {
    if (dados?.sem_cadastros) {
      return { tipo: 'erro', texto: 'Nenhum aluno desta escola tem biometria facial ainda. Cadastre em "Cadastrar biometria".' };
    }
    return { tipo: 'erro', texto: resposta.mensagem || 'Não foi possível identificar. Tente de novo.' };
  }
  if (!dados.reconhecido) {
    const confirmacao = dados.confirmacao;
    if (confirmacao?.aluno) {
      return {
        tipo: 'confirmar',
        idIdentificacao: confirmacao.id_identificacao,
        nome: confirmacao.aluno.nome_aluno,
        turma: confirmacao.aluno.nome_sala,
        motivo: confirmacao.motivo,
        expiraEmMs: agoraMs + Math.max(0, confirmacao.expira_em_segundos * 1000 - FOLGA_CONFIRMACAO_MS),
      };
    }
    return dados.motivo ? { tipo: 'nao_reconhecido', motivo: dados.motivo } : { tipo: 'nao_reconhecido' };
  }
  return resultadoDaPresenca(dados);
}

/** Resposta de biometria/confirmarIdentificacao.php. */
export function resultadoDaConfirmacao(resposta: ApiResponse<RespostaConfirmacao>): ResultadoTela {
  const dados = resposta.dados;
  if (!resposta.sucesso || !dados) {
    return { tipo: 'erro', titulo: 'Não foi possível confirmar', texto: resposta.mensagem || 'Não foi possível confirmar. Tente de novo.' };
  }
  if (!dados.registrado) {
    return { tipo: 'nada_registrado', texto: resposta.mensagem || 'Nada foi registrado. Tente de novo ou registre a presença manualmente.' };
  }
  return resultadoDaPresenca(dados);
}

/** Resposta de registro/remover.php ao desfazer a presença de `nome`. */
export function resultadoDoDesfazer(resposta: ApiResponse<unknown>, nome: string): ResultadoTela {
  if (!resposta.sucesso) {
    return {
      tipo: 'erro',
      titulo: 'Não foi possível desfazer',
      texto: resposta.mensagem || 'Não foi possível desfazer. Peça à gestão da escola para cancelar a presença pelo site.',
    };
  }
  return {
    tipo: 'nada_registrado',
    texto: `A presença de ${nome} foi desfeita e fica no histórico de correções. Tente de novo com o aluno de frente para a câmera, ou registre a presença manualmente.`,
  };
}

/** Resultados que somem sozinhos (o próximo aluno já pode se posicionar). */
export function resultadoSomeSozinho(resultado: ResultadoTela): boolean {
  return resultado.tipo === 'registrada' || resultado.tipo === 'atrasada' || resultado.tipo === 'ja_registrada';
}

/**
 * Quanto tempo o resultado fica na tela; null: até alguém responder. A
 * confirmação some quando o prazo da API está para vencer (e a tela passa
 * a mostrar CONFIRMACAO_EXPIRADA).
 */
export function tempoNaTela(resultado: ResultadoTela, agoraMs = Date.now()): number | null {
  if (resultado.tipo === 'registrada' || resultado.tipo === 'atrasada') {
    return resultado.podeDesfazer ? TEMPO_RESULTADO_COM_DESFAZER_MS : TEMPO_RESULTADO_MS;
  }
  if (resultado.tipo === 'ja_registrada') return TEMPO_RESULTADO_MS;
  if (resultado.tipo === 'confirmar') return Math.max(0, resultado.expiraEmMs - agoraMs);
  return null;
}
