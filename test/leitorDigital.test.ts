import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { colunasDosTemplates, estadoDoLeitor, mensagemDoLeitor } from '../src/digital/leitorRegras.ts';

const exigir = createRequire(import.meta.url);
const { xmlDoFiltro, comFiltroNaAtividade } = exigir('../plugins/comLeitorDigital.js');
const { fabricantes } = exigir('../modules/leitor-digital/leitores.json');

const secugen = { nome: '/dev/bus/usb/001/002', vendorId: 4450, productId: 8704, fabricante: 'SecuGen', produto: null, permitido: false, driver: null };
const pendrive = { nome: '/dev/bus/usb/001/003', vendorId: 2316, productId: 4096, fabricante: 'Pendrive', produto: 'USB Disk', permitido: true, driver: null };

test('sem o módulo nativo (preview web): sem suporte', () => {
  assert.equal(estadoDoLeitor(false, [], fabricantes).situacao, 'sem_suporte');
});

test('nada ligado, ou só um pendrive: desconectado', () => {
  assert.equal(estadoDoLeitor(true, [], fabricantes).situacao, 'desconectado');
  assert.equal(estadoDoLeitor(true, [pendrive], fabricantes).situacao, 'desconectado');
});

test('leitor de fabricante conhecido sem driver instalado: avisa e cita o fabricante', () => {
  const estado = estadoDoLeitor(true, [pendrive, secugen], fabricantes);
  assert.equal(estado.situacao, 'sem_driver');
  assert.equal(estado.nomeDoLeitor, 'leitor SecuGen');
  assert.match(mensagemDoLeitor(estado).titulo, /^Leitor SecuGen conectado$/);
});

test('com o driver: falta a permissão do Android, depois pronto', () => {
  const comDriver = { ...secugen, driver: { id: 'secugen', nome: 'SecuGen Hamster Pro 20' } };
  assert.equal(estadoDoLeitor(true, [comDriver], fabricantes).situacao, 'sem_permissao');
  const pronto = estadoDoLeitor(true, [{ ...comDriver, permitido: true }], fabricantes);
  assert.equal(pronto.situacao, 'pronto');
  assert.equal(pronto.nomeDoLeitor, 'SecuGen Hamster Pro 20');
  assert.equal(pronto.dispositivo?.nome, secugen.nome);
});

test('aparelho de fabricante desconhecido, mas com driver instalado, também serve', () => {
  const outro = { ...pendrive, permitido: true, driver: { id: 'x', nome: 'Leitor X' } };
  assert.equal(estadoDoLeitor(true, [outro], fabricantes).situacao, 'pronto');
});

test('todas as situações têm título e texto', () => {
  for (const situacao of ['sem_suporte', 'desconectado', 'sem_driver', 'sem_permissao', 'pronto'] as const) {
    const m = mensagemDoLeitor({ situacao, dispositivo: null, nomeDoLeitor: 'leitor SecuGen' });
    assert.ok(m.titulo.length > 0 && m.texto.length > 0, situacao);
  }
});

test('digitais da escola viram as colunas que o módulo nativo compara', () => {
  assert.deepEqual(
    colunasDosTemplates([
      { id_aluno: 1, template: 'AAA', formato: 'ISO 19794-2' },
      { id_aluno: 2, template: 'BBB', formato: 'ISO 19794-2' },
    ]),
    { ids: [1, 2], templates: ['AAA', 'BBB'], formatos: ['ISO 19794-2', 'ISO 19794-2'] }
  );
});

test('lista de fabricantes: vendorIds inteiros e sem repetir', () => {
  const ids = fabricantes.map((f: { vendorId: number }) => f.vendorId);
  assert.ok(ids.length > 0 && ids.every((id: number) => Number.isInteger(id) && id > 0 && id < 65536));
  assert.equal(new Set(ids).size, ids.length);
});

test('plugin: o filtro USB do Android lista cada fabricante', () => {
  const xml = xmlDoFiltro([{ vendorId: 4450, nome: 'SecuGen' }, { vendorId: 5265, nome: 'Futronic' }]);
  assert.match(xml, /<usb-device vendor-id="4450" \/>/);
  assert.match(xml, /<usb-device vendor-id="5265" \/>/);
  assert.match(xml, /^<\?xml/);
});

test('plugin: a tela principal ganha o filtro de "leitor conectado", uma vez só', () => {
  const manifesto = {
    manifest: {
      application: [{ activity: [{ $: { 'android:name': '.MainActivity' }, 'intent-filter': [{ action: [{ $: { 'android:name': 'android.intent.action.MAIN' } }] }] }] }],
    },
  };
  const uma = comFiltroNaAtividade(manifesto);
  const duas = comFiltroNaAtividade(uma);
  const atividade = duas.manifest.application[0].activity[0];
  const filtrosUsb = atividade['intent-filter'].filter((f: { action: { $: Record<string, string> }[] }) =>
    f.action.some((a) => a.$['android:name'] === 'android.hardware.usb.action.USB_DEVICE_ATTACHED')
  );
  assert.equal(filtrosUsb.length, 1);
  assert.equal(atividade['meta-data'].length, 1);
  assert.equal(atividade['meta-data'][0].$['android:resource'], '@xml/leitores_digitais');
});
