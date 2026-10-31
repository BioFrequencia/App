import { test } from 'node:test';
import assert from 'node:assert/strict';

import { lerSessaoGuardada, MARGEM_EXPIRACAO_MS, sessaoDoLogin, sessaoValida } from '../src/sessaoRegras.ts';

const agora = Date.UTC(2026, 9, 30, 12, 0, 0);
const login = {
  id_coordenacao: 7,
  nome_coordenacao: 'Coordenação Teste',
  email_coordenacao: 'coord@escola.test',
  nome_escola: 'Escola Teste',
  token: 'abc.def.ghi',
  expira_em: agora / 1000 + 12 * 3600,
};

test('a sessão guarda o token, a validade e a escola do login', () => {
  const sessao = sessaoDoLogin(login);
  assert.deepEqual(sessao, {
    token: 'abc.def.ghi',
    expiraEm: login.expira_em,
    nomeCoordenacao: 'Coordenação Teste',
    emailCoordenacao: 'coord@escola.test',
    nomeEscola: 'Escola Teste',
  });
  assert.equal(sessaoValida(sessao, agora), true);
});

test('sessão perto de vencer é descartada antes (não falha no meio de uma identificação)', () => {
  const sessao = sessaoDoLogin({ ...login, expira_em: (agora + MARGEM_EXPIRACAO_MS - 1000) / 1000 });
  assert.equal(sessaoValida(sessao, agora), false);
});

test('sessão guardada corrompida, vencida ou da versão antiga do app é ignorada', () => {
  assert.equal(lerSessaoGuardada(null, agora), null);
  assert.equal(lerSessaoGuardada('{nao e json', agora), null);
  assert.equal(lerSessaoGuardada(JSON.stringify({ deviceUuid: 'x', deviceSecret: 'y' }), agora), null);
  assert.equal(lerSessaoGuardada(JSON.stringify(sessaoDoLogin({ ...login, expira_em: agora / 1000 - 1 })), agora), null);
  assert.deepEqual(lerSessaoGuardada(JSON.stringify(sessaoDoLogin(login)), agora), sessaoDoLogin(login));
});
