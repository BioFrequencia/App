import { test } from 'node:test';
import assert from 'node:assert/strict';

import { lerMensagemMotor, TAMANHO_DESCRITOR, textoDaFalha } from '../src/face/protocolo.ts';
import { resultadoDaIdentificacao, resultadoSomeSozinho } from '../src/identificacaoRegras.ts';

const descritor = Array.from({ length: TAMANHO_DESCRITOR }, (_, i) => Math.sin(i) / 10);

test('mensagens do motor facial (face/motor.js)', () => {
  assert.deepEqual(lerMensagemMotor('{"tipo":"pronto","backend":"webgl"}'), { tipo: 'pronto', backend: 'webgl' });
  assert.deepEqual(lerMensagemMotor('{"tipo":"erro_carregar","mensagem":"sem WebGL"}'), { tipo: 'erro_carregar', mensagem: 'sem WebGL' });
  assert.deepEqual(lerMensagemMotor(JSON.stringify({ tipo: 'resultado', id: 3, ok: true, descritor, confianca: 0.97 })), {
    tipo: 'resultado', id: 3, resultado: { ok: true, descritor, confianca: 0.97 },
  });
  assert.deepEqual(lerMensagemMotor('{"tipo":"resultado","id":4,"ok":false,"motivo":"varios_rostos"}'), {
    tipo: 'resultado', id: 4, resultado: { ok: false, motivo: 'varios_rostos', mensagem: undefined },
  });
});

test('vetor do tamanho errado ou com valor inválido vira erro (não vai para a API)', () => {
  const curto = lerMensagemMotor(JSON.stringify({ tipo: 'resultado', id: 5, ok: true, descritor: [0.1, 0.2] }));
  assert.equal(curto?.tipo === 'resultado' && curto.resultado.ok, false);
  const nulo = lerMensagemMotor(JSON.stringify({ tipo: 'resultado', id: 6, ok: true, descritor: [...descritor.slice(1), null] }));
  assert.equal(nulo?.tipo === 'resultado' && nulo.resultado.ok, false);
});

test('mensagens que não são do motor são ignoradas', () => {
  assert.equal(lerMensagemMotor('texto qualquer'), null);
  assert.equal(lerMensagemMotor('{"tipo":"outro"}'), null);
  assert.equal(lerMensagemMotor('{"tipo":"resultado"}'), null);
});

test('cada recusa da foto tem uma orientação para quem está operando', () => {
  assert.match(textoDaFalha('sem_rosto'), /contorno/);
  assert.match(textoDaFalha('varios_rostos'), /um aluno por vez/);
  assert.match(textoDaFalha('longe'), /aproximar/);
});

test('resultado da identificação para a tela', () => {
  const aluno = { id_aluno: 1, nome_aluno: 'Ana Teste', id_sala: 2, nome_sala: '1A' };
  const presenca = { nova: true, id_presenca: 9, registrada_em: '2026-10-30 10:42:00', metodo: 'facial' as const };
  const registrada = resultadoDaIdentificacao({ sucesso: true, mensagem: '', dados: { reconhecido: true, aluno, presenca, distancia: 0.3 } });
  assert.deepEqual(registrada, { tipo: 'registrada', nome: 'Ana Teste', turma: '1A', registradaEm: '2026-10-30 10:42:00' });
  assert.equal(resultadoSomeSozinho(registrada), true);

  const repetida = resultadoDaIdentificacao({ sucesso: true, mensagem: '', dados: { reconhecido: true, aluno, presenca: { ...presenca, nova: false }, distancia: 0.3 } });
  assert.equal(repetida.tipo, 'ja_registrada');

  const recusada = resultadoDaIdentificacao({ sucesso: true, mensagem: '', dados: { reconhecido: false } });
  assert.deepEqual(recusada, { tipo: 'nao_reconhecido' });
  assert.equal(resultadoSomeSozinho(recusada), false);

  const semCadastros = resultadoDaIdentificacao({ sucesso: false, mensagem: 'x', dados: { reconhecido: false, sem_cadastros: true } });
  assert.equal(semCadastros.tipo === 'erro' && /Cadastrar biometria/.test(semCadastros.texto), true);

  const erro = resultadoDaIdentificacao({ sucesso: false, mensagem: 'Erro no servidor.', dados: null });
  assert.deepEqual(erro, { tipo: 'erro', texto: 'Erro no servidor.' });
});
