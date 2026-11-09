import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  alternarDestino,
  avisoDosProvedores,
  chaveDeEnvio,
  destinosSugeridos,
  nomeDoCanal,
  novaChaveDeEnvio,
  problemaDaMensagem,
  problemaDoEmailDaConta,
  rotuloComoSai,
  seloDoEnvio,
  tamanhoDaMensagem,
  temDestino,
  tituloDoEnvio,
} from '../src/mensagensRegras.ts';
import type { ContatoResponsavel } from '../src/types.ts';

function responsavel(id: number, sugeridos: ContatoResponsavel['sugeridos'], extra: Partial<ContatoResponsavel> = {}): ContatoResponsavel {
  return {
    id_responsavel: id, nome: `Responsável ${id}`, parentesco: 'Mãe', telefone: '11999990000', email: null,
    canal_preferido: null, whatsapp: true, email_disponivel: false, sugeridos, ...extra,
  };
}

// A API aceita a chave do envio com 8 a 64 letras, números e hífens (helpers/mensagemManual.php).
const CHAVE_VALIDA = /^[A-Za-z0-9-]{8,64}$/;

test('os destinos já vêm marcados com o canal preferido de cada responsável', () => {
  const lista = [responsavel(1, ['whatsapp']), responsavel(2, ['whatsapp', 'email'], { email_disponivel: true }), responsavel(3, [])];
  assert.deepEqual(destinosSugeridos(lista), [
    { id_responsavel: 1, canal: 'whatsapp' },
    { id_responsavel: 2, canal: 'whatsapp' },
    { id_responsavel: 2, canal: 'email' },
  ]);
});

test('tocar num canal liga e tocar de novo desliga, sem mexer nos outros', () => {
  const ligado = alternarDestino([{ id_responsavel: 1, canal: 'whatsapp' }], { id_responsavel: 2, canal: 'email' });
  assert.equal(temDestino(ligado, 2, 'email'), true);
  assert.equal(temDestino(ligado, 1, 'whatsapp'), true);
  const desligado = alternarDestino(ligado, { id_responsavel: 1, canal: 'whatsapp' });
  assert.deepEqual(desligado, [{ id_responsavel: 2, canal: 'email' }]);
  assert.equal(temDestino(desligado, 2, 'whatsapp'), false);
});

test('a prévia só abre com texto, dentro do limite e com pelo menos um destino', () => {
  const destino = [{ id_responsavel: 1, canal: 'whatsapp' as const }];
  assert.equal(problemaDaMensagem('   ', destino, 1000), 'Escreva a mensagem ou escolha um modelo.');
  assert.equal(problemaDaMensagem('Olá', [], 1000), 'Escolha pelo menos um responsável e um canal.');
  assert.equal(problemaDaMensagem('a'.repeat(1001), destino, 1000), 'A mensagem passa de 1000 caracteres.');
  assert.equal(problemaDaMensagem('Olá, {responsavel}.', destino, 1000), null);
});

test('o tamanho conta como a API (mb_strlen): emoji vale um e as pontas não contam', () => {
  assert.equal(tamanhoDaMensagem('  oi 👋  '), 4);
  assert.equal(problemaDaMensagem('👋'.repeat(10), [{ id_responsavel: 1, canal: 'email' }], 10), null);
});

test('textos de canal, de como sai, do selo e do título do resultado', () => {
  assert.equal(nomeDoCanal('whatsapp'), 'WhatsApp');
  assert.equal(nomeDoCanal('email'), 'E-mail');
  assert.equal(rotuloComoSai('whatsapp', 'automatico'), 'Sai pelo WhatsApp da escola');
  assert.equal(rotuloComoSai('email', 'automatico'), 'Sai por e-mail');
  assert.match(rotuloComoSai('whatsapp', 'link'), /pelo link/);
  assert.match(rotuloComoSai('email', 'fila'), /fila de Notificações/);
  assert.deepEqual(seloDoEnvio('enviada'), { tipo: 'ok', texto: 'Enviada' });
  assert.deepEqual(seloDoEnvio('erro'), { tipo: 'perigo', texto: 'Erro no envio' });
  assert.deepEqual(seloDoEnvio('pendente'), { tipo: 'pendente', texto: 'Para mandar' });
  assert.equal(tituloDoEnvio({ enviadas: 0, pendentes: 0, erros: 2 }), 'A mensagem não saiu');
  assert.equal(tituloDoEnvio({ enviadas: 1, pendentes: 0, erros: 1 }), 'Mensagem enviada, com erro em parte');
  assert.equal(tituloDoEnvio({ enviadas: 0, pendentes: 2, erros: 0 }), 'Mensagem pronta: falta mandar pelo link');
  assert.equal(tituloDoEnvio({ enviadas: 2, pendentes: 1, erros: 0 }), 'Mensagem enviada');
});

test('o aviso dos provedores diz o que não sai sozinho', () => {
  assert.equal(avisoDosProvedores({ whatsapp: true, email: true }), null);
  assert.match(avisoDosProvedores({ whatsapp: false, email: true }) ?? '', /WhatsApp automático/);
  assert.match(avisoDosProvedores({ whatsapp: true, email: false }) ?? '', /e-mail automático/);
  assert.match(avisoDosProvedores({ whatsapp: false, email: false }) ?? '', /link.*fila/);
});

test('a chave de envio tem o formato que a API aceita e muda a cada mensagem', () => {
  const sequencia = [0.1, 0.2, 0.3, 0.4];
  let i = 0;
  const chave = chaveDeEnvio(Date.UTC(2026, 10, 9, 12), () => sequencia[i++ % sequencia.length]);
  assert.match(chave, CHAVE_VALIDA);
  assert.notEqual(chave, chaveDeEnvio(Date.UTC(2026, 10, 9, 12), () => 0.9));
  assert.match(chaveDeEnvio(0, () => 0), CHAVE_VALIDA);
  assert.match(chaveDeEnvio(Date.now(), () => 0.999999), CHAVE_VALIDA);
  const a = novaChaveDeEnvio();
  assert.match(a, CHAVE_VALIDA);
  assert.notEqual(a, novaChaveDeEnvio());
});

test('esqueci minha senha: pede um e-mail preenchido e válido', () => {
  assert.equal(problemaDoEmailDaConta('   '), 'Informe o e-mail da sua conta.');
  assert.equal(problemaDoEmailDaConta('coordenacao'), 'Informe um e-mail válido.');
  assert.equal(problemaDoEmailDaConta('coord@escola'), 'Informe um e-mail válido.');
  assert.equal(problemaDoEmailDaConta('  coordenacao@escola.sp.gov.br '), null);
});
