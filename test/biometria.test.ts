import { test } from 'node:test';
import assert from 'node:assert/strict';

import { avaliarDisponibilidade, mensagemDaFalha, NIVEL_NENHUM, NIVEL_PIN_OU_SENHA } from '../src/biometriaRegras.ts';

test('celular sem biometria e sem bloqueio de tela: não dá para confirmar', () => {
  const resultado = avaliarDisponibilidade(NIVEL_NENHUM);
  assert.equal(resultado.ok, false);
  assert.match(!resultado.ok ? resultado.mensagem : '', /bloqueio de tela/);
});

test('celular só com PIN/padrão é aceito (antes era recusado por não ter biometria)', () => {
  assert.deepEqual(avaliarDisponibilidade(NIVEL_PIN_OU_SENHA), { ok: true });
});

test('biometria fraca ou forte é aceita', () => {
  assert.deepEqual(avaliarDisponibilidade(2), { ok: true });
  assert.deepEqual(avaliarDisponibilidade(3), { ok: true });
});

test('cada falha do sistema tem a sua mensagem', () => {
  assert.match(mensagemDaFalha('user_cancel'), /cancelada/);
  assert.match(mensagemDaFalha('system_cancel'), /cancelada/);
  assert.match(mensagemDaFalha('lockout'), /Muitas tentativas/);
  assert.match(mensagemDaFalha('not_enrolled'), /Configure/);
  assert.match(mensagemDaFalha('passcode_not_set'), /Configure/);
  assert.match(mensagemDaFalha('authentication_failed'), /não confirmada/);
  assert.match(mensagemDaFalha('timeout'), /tempo/);
  assert.match(mensagemDaFalha(undefined), /Nada foi enviado/);
});
