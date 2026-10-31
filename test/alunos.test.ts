import { test } from 'node:test';
import assert from 'node:assert/strict';

import { filtrarAlunos, normalizar, resumirAlunos, turmasDaLista } from '../src/alunosRegras.ts';
import type { AlunoBiometria } from '../src/types.ts';

function aluno(id: number, nome: string, sala: [number, string], extra: Partial<AlunoBiometria> = {}): AlunoBiometria {
  return {
    id_aluno: id, nome_aluno: nome, dta_nasc_aluno: '2010-05-10', id_sala: sala[0], nome_sala: sala[1],
    tem_facial: false, facial_atualizada_em: null, digitais: 0, consentimento_responsavel: null, consentimento_em: null,
    presenca_hoje: null, presenca_metodo: null, ...extra,
  };
}

const alunos = [
  aluno(1, 'João Pedro Silva', [10, '2º B'], { tem_facial: true, consentimento_responsavel: 'Mãe', presenca_hoje: '2026-10-30 10:00:00' }),
  aluno(2, 'Ana Souza', [11, '1º A']),
  aluno(3, 'Pedro Álvares', [10, '2º B'], { consentimento_responsavel: 'Pai' }),
];

test('busca sem acento, sem caixa e por qualquer parte do nome', () => {
  assert.equal(normalizar('  JOÃO '), 'joao');
  assert.deepEqual(filtrarAlunos(alunos, 'joao silva', null).map((a) => a.id_aluno), [1]);
  assert.deepEqual(filtrarAlunos(alunos, 'pedro', null).map((a) => a.id_aluno), [1, 3]);
  assert.deepEqual(filtrarAlunos(alunos, 'alvares', null).map((a) => a.id_aluno), [3]);
});

test('filtro por turma e por situação da biometria', () => {
  assert.deepEqual(filtrarAlunos(alunos, '', 10).map((a) => a.id_aluno), [1, 3]);
  assert.deepEqual(filtrarAlunos(alunos, '', null, 'sem_facial').map((a) => a.id_aluno), [2, 3]);
  assert.deepEqual(filtrarAlunos(alunos, '', 10, 'com_facial').map((a) => a.id_aluno), [1]);
});

test('resumo do início e turmas em ordem', () => {
  assert.deepEqual(resumirAlunos(alunos), { total: 3, presentesHoje: 1, comFacial: 1, semConsentimento: 1 });
  assert.deepEqual(turmasDaLista(alunos).map((t) => t.nome_sala), ['1º A', '2º B']);
});
