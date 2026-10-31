import { test } from 'node:test';
import assert from 'node:assert/strict';

import { dataPorExtenso, formatarData, formatarHora, hojeNaEscola, iniciais, lerHorarioApi, somarDias } from '../src/ui/formatar.ts';

test('horário da API (UTC sem fuso) aparece no horário da escola', () => {
  assert.equal(lerHorarioApi('2026-10-30 10:42:07.123')?.toISOString(), '2026-10-30T10:42:07.123Z');
  assert.equal(formatarHora('2026-10-30 10:42:07'), '07:42');
  assert.equal(formatarHora(null), '--:--');
});

test('presença às 23h de Brasília é do mesmo dia na escola (02h UTC do dia seguinte)', () => {
  assert.equal(formatarData('2026-10-31 02:30:00'), '30/10/2026');
  assert.equal(hojeNaEscola(new Date('2026-10-31T02:30:00Z')), '2026-10-30');
});

test('data pura não passa por fuso', () => {
  assert.equal(formatarData('2010-05-10'), '10/05/2010');
  assert.equal(somarDias('2026-10-31', 1), '2026-11-01');
  assert.equal(somarDias('2026-03-01', -1), '2026-02-28');
  assert.match(dataPorExtenso('2026-10-30'), /30 de outubro/);
});

test('iniciais do avatar', () => {
  assert.equal(iniciais('Ana Clara Souza'), 'AS');
  assert.equal(iniciais('Zeca'), 'ZE');
  assert.equal(iniciais('  '), '?');
});
