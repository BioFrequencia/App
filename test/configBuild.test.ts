// node --test (ver "npm test"): sem dependências, o Node lê TypeScript direto.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  API_URL_DESENVOLVIMENTO,
  API_URL_PRODUCAO,
  enderecoLocal,
  resolverApiUrlDoBuild,
  versionCodeDoBuild,
} from '../app.config.ts';

test('APK de distribuição sem API_URL usa a API publicada, nunca o emulador', () => {
  // Regressão: o app.json embutia http://10.0.2.2/... em todo build.
  assert.equal(resolverApiUrlDoBuild({ EAS_BUILD_PROFILE: 'preview' }), API_URL_PRODUCAO);
  assert.equal(resolverApiUrlDoBuild({ APP_ENV: 'production' }), API_URL_PRODUCAO);
  assert.ok(API_URL_PRODUCAO.startsWith('https://'));
});

test('API_URL informada no build é usada (normalizada)', () => {
  assert.equal(
    resolverApiUrlDoBuild({ EAS_BUILD_PROFILE: 'production', API_URL: 'https://api.escola.br//' }),
    'https://api.escola.br/'
  );
});

test('APK de distribuição apontando para endereço local ou sem HTTPS: o build falha', () => {
  for (const url of [
    'http://10.0.2.2/BioFrequenciaApi/',
    'http://192.168.0.15/BioFrequenciaApi/',
    'https://localhost/api/',
    'http://api.escola.br/',
  ]) {
    assert.throws(() => resolverApiUrlDoBuild({ EAS_BUILD_PROFILE: 'preview', API_URL: url }), /API_URL inválida/, url);
  }
});

test('em desenvolvimento vale o emulador (ou o que for informado)', () => {
  assert.equal(resolverApiUrlDoBuild({}), API_URL_DESENVOLVIMENTO);
  assert.equal(resolverApiUrlDoBuild({ API_URL: 'http://192.168.0.15/api' }), 'http://192.168.0.15/api/');
});

test('reconhece endereços que só existem na rede de quem desenvolve', () => {
  assert.equal(enderecoLocal('http://172.20.1.1/api'), true);
  assert.equal(enderecoLocal('http://172.40.1.1/api'), false);
  assert.equal(enderecoLocal('https://biofrequencia-api.onrender.com/'), false);
  assert.equal(enderecoLocal('não é url'), true);
});

test('versionCode do build local vem do número da execução do CI', () => {
  assert.equal(versionCodeDoBuild('57'), 57);
  assert.equal(versionCodeDoBuild(undefined), undefined);
  assert.equal(versionCodeDoBuild('0'), undefined);
  assert.equal(versionCodeDoBuild('abc'), undefined);
});
