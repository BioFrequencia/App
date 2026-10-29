import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

import { assinarCheckin } from '../src/crypto/hmac.ts';

// A API recalcula a assinatura com hash_hmac('sha256', "uuid|tipo|timestamp",
// segredo) (helpers/dispositivo.php). Se o app assinar diferente, todo
// envio volta "Assinatura inválida". Aqui a implementação do app
// (crypto-js) é conferida contra o HMAC nativo do Node, que é o mesmo
// algoritmo do PHP.
test('assinatura do app bate com o HMAC-SHA256 que a API calcula', () => {
  const uuid = '3f2a9c1e-0000-4000-8000-123456789abc';
  const timestamp = '2026-10-29T13:45:00.123Z';
  const segredo = 'a'.repeat(64);
  const esperada = createHmac('sha256', segredo).update(`${uuid}|falta|${timestamp}`).digest('hex');
  assert.equal(assinarCheckin(uuid, 'falta', timestamp, segredo), esperada);
});

test('qualquer campo diferente muda a assinatura', () => {
  const base = assinarCheckin('uuid', 'falta', '2026-10-29T13:45:00.123Z', 'segredo');
  assert.notEqual(assinarCheckin('uuid', 'atraso', '2026-10-29T13:45:00.123Z', 'segredo'), base);
  assert.notEqual(assinarCheckin('uuid', 'falta', '2026-10-29T13:45:01.123Z', 'segredo'), base);
  assert.notEqual(assinarCheckin('uuid', 'falta', '2026-10-29T13:45:00.123Z', 'outro'), base);
});
