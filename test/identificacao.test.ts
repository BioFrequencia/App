import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CONFIRMACAO_EXPIRADA,
  FOLGA_CONFIRMACAO_MS,
  resultadoDaConfirmacao,
  resultadoDaIdentificacao,
  resultadoDoDesfazer,
  resultadoSomeSozinho,
  TEMPO_RESULTADO_COM_DESFAZER_MS,
  TEMPO_RESULTADO_MS,
  tempoNaTela,
} from '../src/identificacaoRegras.ts';

const aluno = { id_aluno: 7, nome_aluno: 'Ana Lima', id_sala: 1, nome_sala: '1º A' };
const presenca = (nova: boolean) => ({ id_presenca: 3, nova, registrada_em: '2026-11-03 10:32:00', metodo: 'facial' as const });
const entrada = (situacao: 'no_horario' | 'atrasada' | 'fora_do_horario' | 'sem_aula', idAtraso: number | null) => ({
  situacao,
  horario_turma: { inicio: '07:00', fim: '12:20' },
  tolerancia_minutos: 10,
  id_atraso: idAtraso,
});

test('presença nova no horário: registrada', () => {
  const r = resultadoDaIdentificacao({
    sucesso: true,
    mensagem: 'Presença registrada.',
    dados: { reconhecido: true, aluno, presenca: presenca(true), distancia: 0.3, entrada: entrada('no_horario', null) },
  });
  assert.deepEqual(r, { tipo: 'registrada', nome: 'Ana Lima', turma: '1º A', registradaEm: '2026-11-03 10:32:00', idPresenca: 3, podeDesfazer: false });
});

test('presença nova depois da tolerância: a tela avisa que virou entrada atrasada', () => {
  const r = resultadoDaIdentificacao({
    sucesso: true,
    mensagem: 'Presença registrada como entrada atrasada.',
    dados: { reconhecido: true, aluno, presenca: presenca(true), distancia: 0.3, entrada: entrada('atrasada', 55) },
  });
  assert.equal(r.tipo, 'atrasada');
  assert.equal(r.tipo === 'atrasada' && r.inicioAula, '07:00');
  assert.equal(r.tipo === 'atrasada' && r.tolerancia, 10);
  assert.equal(resultadoSomeSozinho(r), true);
});

test('atrasada sem o registro (a escola desligou a opção): fica só como presença', () => {
  const r = resultadoDaIdentificacao({
    sucesso: true,
    mensagem: 'Presença registrada depois da tolerância da turma.',
    dados: { reconhecido: true, aluno, presenca: presenca(true), distancia: 0.3, entrada: entrada('atrasada', null) },
  });
  assert.equal(r.tipo, 'registrada');
});

test('API antiga (sem "entrada") e presença repetida continuam como antes', () => {
  const antiga = resultadoDaIdentificacao({ sucesso: true, mensagem: '', dados: { reconhecido: true, aluno, presenca: presenca(true), distancia: 0.3 } });
  assert.equal(antiga.tipo, 'registrada');
  const repetida = resultadoDaIdentificacao({
    sucesso: true,
    mensagem: '',
    dados: { reconhecido: true, aluno, presenca: presenca(false), distancia: 0.3, entrada: null },
  });
  assert.equal(repetida.tipo, 'ja_registrada');
});

test('não reconhecido e erro', () => {
  assert.deepEqual(resultadoDaIdentificacao({ sucesso: true, mensagem: '', dados: { reconhecido: false } }), { tipo: 'nao_reconhecido' });
  assert.equal(resultadoDaIdentificacao({ sucesso: false, mensagem: 'Falhou.', dados: null }).tipo, 'erro');
});

// ---- Migração 012: só grava com certeza; com dúvida, pergunta; e dá para desfazer ----

test('reconhecido com certeza e pode_desfazer: "Não é este aluno" na tela, por mais tempo', () => {
  const r = resultadoDaIdentificacao({
    sucesso: true,
    mensagem: 'Presença registrada.',
    dados: { reconhecido: true, aluno, presenca: presenca(true), distancia: 0.3, entrada: entrada('no_horario', null), pode_desfazer: true },
  });
  assert.equal(r.tipo, 'registrada');
  assert.equal(r.tipo === 'registrada' && r.podeDesfazer, true);
  assert.equal(r.tipo === 'registrada' && r.idPresenca, 3);
  assert.equal(tempoNaTela(r), TEMPO_RESULTADO_COM_DESFAZER_MS);
  // Sem o desfazer (API antiga, presença repetida), o tempo de sempre.
  const antiga = resultadoDaIdentificacao({ sucesso: true, mensagem: '', dados: { reconhecido: true, aluno, presenca: presenca(true), distancia: 0.3 } });
  assert.equal(tempoNaTela(antiga), TEMPO_RESULTADO_MS);
  const repetida = resultadoDaIdentificacao({ sucesso: true, mensagem: '', dados: { reconhecido: true, aluno, presenca: presenca(false), pode_desfazer: false } });
  assert.equal(repetida.tipo, 'ja_registrada');
  assert.equal(tempoNaTela(repetida), TEMPO_RESULTADO_MS);
});

test('incerto: pergunta "é este aluno?" com o candidato - nada foi gravado e o cartão não some sozinho antes do prazo', () => {
  const agora = 1_000_000;
  const r = resultadoDaIdentificacao(
    {
      sucesso: true,
      mensagem: 'Confirme quem é o aluno antes de registrar a presença.',
      dados: {
        reconhecido: false,
        confirmacao: { id_identificacao: 41, aluno, motivo: 'O rosto ficou parecido com o de outro aluno.', expira_em_segundos: 120 },
      },
    },
    agora
  );
  assert.deepEqual(r, {
    tipo: 'confirmar',
    idIdentificacao: 41,
    nome: 'Ana Lima',
    turma: '1º A',
    motivo: 'O rosto ficou parecido com o de outro aluno.',
    expiraEmMs: agora + 120_000 - FOLGA_CONFIRMACAO_MS,
  });
  assert.equal(resultadoSomeSozinho(r), false);
  // Vence um pouco antes da API (que começou a contar antes) e, vencido, não fica negativo.
  assert.equal(tempoNaTela(r, agora), 120_000 - FOLGA_CONFIRMACAO_MS);
  assert.equal(tempoNaTela(r, agora + 999_999), 0);
  assert.equal(CONFIRMACAO_EXPIRADA.tipo, 'nada_registrado');
});

test('não reconhecido: o motivo da API vai para a tela; sem motivo (API antiga), como antes', () => {
  const comMotivo = resultadoDaIdentificacao({
    sucesso: true,
    mensagem: 'Aluno não reconhecido.',
    dados: { reconhecido: false, motivo: 'As fotos apontaram alunos diferentes.' },
  });
  assert.deepEqual(comMotivo, { tipo: 'nao_reconhecido', motivo: 'As fotos apontaram alunos diferentes.' });
  assert.equal(tempoNaTela(comMotivo), null);
  assert.deepEqual(resultadoDaIdentificacao({ sucesso: true, mensagem: '', dados: { reconhecido: false } }), { tipo: 'nao_reconhecido' });
});

test('sem cadastros na escola: erro que explica o que fazer', () => {
  const r = resultadoDaIdentificacao({ sucesso: false, mensagem: 'Nenhum aluno...', dados: { reconhecido: false, sem_cadastros: true } });
  assert.equal(r.tipo, 'erro');
  assert.match(r.tipo === 'erro' ? r.texto : '', /Cadastrar biometria/);
});

test('confirmação "sim": a presença do candidato é registrada (e a entrada atrasada, quando for o caso)', () => {
  const registrada = resultadoDaConfirmacao({
    sucesso: true,
    mensagem: 'Presença registrada.',
    dados: { registrado: true, reconhecido: true, aluno, presenca: presenca(true), entrada: entrada('no_horario', null), pode_desfazer: true },
  });
  assert.equal(registrada.tipo, 'registrada');
  assert.equal(registrada.tipo === 'registrada' && registrada.podeDesfazer, true);
  const atrasada = resultadoDaConfirmacao({
    sucesso: true,
    mensagem: 'Presença registrada como entrada atrasada.',
    dados: { registrado: true, reconhecido: true, aluno, presenca: presenca(true), entrada: entrada('atrasada', 77), pode_desfazer: true },
  });
  assert.equal(atrasada.tipo, 'atrasada');
});

test('confirmação "não", prazo vencido ou já respondida: nada é registrado e a tela diz isso', () => {
  const nao = resultadoDaConfirmacao({ sucesso: true, mensagem: 'Nada foi registrado. Tente de novo.', dados: { registrado: false } });
  assert.deepEqual(nao, { tipo: 'nada_registrado', texto: 'Nada foi registrado. Tente de novo.' });
  const vencida = resultadoDaConfirmacao({
    sucesso: false,
    mensagem: 'Esta identificação não está mais esperando confirmação (já foi respondida ou passou o tempo). Tente de novo.',
    dados: null,
  });
  assert.equal(vencida.tipo, 'erro');
  assert.equal(vencida.tipo === 'erro' && vencida.titulo, 'Não foi possível confirmar');
  assert.match(vencida.tipo === 'erro' ? vencida.texto : '', /passou o tempo/);
});

test('"Não é este aluno": desfeita, a tela diz que nada ficou; recusada (prazo de 10 min), mostra o motivo da API', () => {
  const desfeita = resultadoDoDesfazer({ sucesso: true, mensagem: 'Presença cancelada.', dados: { cancelados: [{ tipo: 'presenca', id: 3 }] } }, 'Ana Lima');
  assert.equal(desfeita.tipo, 'nada_registrado');
  assert.match(desfeita.tipo === 'nada_registrado' ? desfeita.texto : '', /Ana Lima foi desfeita/);
  const recusada = resultadoDoDesfazer(
    { sucesso: false, mensagem: 'O prazo para você desfazer este registro (10 minutos) já passou. Peça à gestão da escola.', dados: null },
    'Ana Lima'
  );
  assert.equal(recusada.tipo, 'erro');
  assert.equal(recusada.tipo === 'erro' && recusada.titulo, 'Não foi possível desfazer');
  assert.match(recusada.tipo === 'erro' ? recusada.texto : '', /10 minutos/);
});

test('resultados que esperam alguém (erro, foto, nada registrado) não somem sozinhos', () => {
  assert.equal(tempoNaTela({ tipo: 'erro', texto: 'x' }), null);
  assert.equal(tempoNaTela({ tipo: 'foto', texto: 'x' }), null);
  assert.equal(tempoNaTela({ tipo: 'nada_registrado', texto: 'x' }), null);
});
