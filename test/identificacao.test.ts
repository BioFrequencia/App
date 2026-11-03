import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resultadoDaIdentificacao, resultadoSomeSozinho } from '../src/identificacaoRegras.ts';

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
  assert.deepEqual(r, { tipo: 'registrada', nome: 'Ana Lima', turma: '1º A', registradaEm: '2026-11-03 10:32:00' });
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
