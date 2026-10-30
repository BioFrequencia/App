import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  dataBrParaIso,
  emailPareceValido,
  mascararData,
  validarCriarConta,
  validarEntrar,
} from '../src/contaRegras.ts';

const hoje = new Date(2026, 9, 30); // 30/10/2026
const cadastroOk = {
  nome: 'Elisa Teste',
  dataNascimento: '10/05/2010',
  email: 'elisa@aluno.test',
  senha: 'Senha@123',
  confirmacaoSenha: 'Senha@123',
};

test('máscara da data põe as barras enquanto o aluno digita', () => {
  assert.equal(mascararData('3'), '3');
  assert.equal(mascararData('3101'), '31/01');
  assert.equal(mascararData('310120'), '31/01/20');
  assert.equal(mascararData('31/01/2010'), '31/01/2010');
  assert.equal(mascararData('31012010999'), '31/01/2010');
});

test('data de nascimento vai para a API no formato AAAA-MM-DD', () => {
  assert.equal(dataBrParaIso('10/05/2010', hoje), '2010-05-10');
  assert.equal(dataBrParaIso(' 29/02/2012 ', hoje), '2012-02-29');
});

test('data que não existe, incompleta, futura ou absurda é recusada', () => {
  assert.equal(dataBrParaIso('31/02/2010', hoje), null);
  assert.equal(dataBrParaIso('29/02/2011', hoje), null);
  assert.equal(dataBrParaIso('10/05/20', hoje), null);
  assert.equal(dataBrParaIso('31/10/2026', hoje), null);
  assert.equal(dataBrParaIso('01/01/1900', hoje), null);
});

test('e-mail', () => {
  assert.equal(emailPareceValido(' Elisa@Aluno.test '), true);
  assert.equal(emailPareceValido('elisa@aluno'), false);
  assert.equal(emailPareceValido('elisa aluno.test'), false);
});

test('cadastro completo passa', () => {
  assert.equal(validarCriarConta(cadastroOk, hoje), null);
});

test('cadastro: aponta o primeiro problema', () => {
  assert.match(validarCriarConta({ ...cadastroOk, nome: 'Elisa' }, hoje) ?? '', /sobrenome/);
  assert.match(validarCriarConta({ ...cadastroOk, dataNascimento: '10/5/2010' }, hoje) ?? '', /DD\/MM\/AAAA/);
  assert.match(validarCriarConta({ ...cadastroOk, email: 'elisa' }, hoje) ?? '', /e-mail/);
  assert.match(validarCriarConta({ ...cadastroOk, senha: '123', confirmacaoSenha: '123' }, hoje) ?? '', /6 caracteres/);
  assert.match(validarCriarConta({ ...cadastroOk, confirmacaoSenha: 'Senha@124' }, hoje) ?? '', /não são iguais/);
});

test('login', () => {
  assert.equal(validarEntrar('elisa@aluno.test', 'x'), null);
  assert.match(validarEntrar('', 'x') ?? '', /e-mail/);
  assert.match(validarEntrar('elisa@aluno.test', '') ?? '', /senha/);
});
