/**
 * Plugin do Expo: leitor de digital USB "ligou, funcionou".
 *
 * Durante o "expo prebuild":
 *  - gera res/xml/leitores_digitais.xml com os fabricantes de
 *    modules/leitor-digital/leitores.json (vendorId USB);
 *  - põe na tela principal o filtro USB_DEVICE_ATTACHED com esse arquivo.
 * Assim, ao ligar um desses leitores no tablet, o Android pergunta se quer
 * abrir o BioFrequência (marcando "usar sempre", nem pergunta mais) e já
 * dá ao app a permissão de usar o leitor. O módulo nativo
 * (modules/leitor-digital) avisa a tela, que passa a ler digitais.
 */
const fs = require('fs');
const path = require('path');
const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');

const ACAO = 'android.hardware.usb.action.USB_DEVICE_ATTACHED';
const RECURSO = 'leitores_digitais';

function lerFabricantes(raizProjeto) {
  const arquivo = path.join(raizProjeto, 'modules', 'leitor-digital', 'leitores.json');
  const { fabricantes } = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
  return fabricantes.filter((f) => Number.isInteger(f.vendorId) && f.vendorId > 0);
}

/** O XML do filtro (função pura, testada em test/leitorDigital.test.ts). */
function xmlDoFiltro(fabricantes) {
  const linhas = fabricantes.map((f) => `  <!-- ${String(f.nome).replace(/--/g, '-')} -->\n  <usb-device vendor-id="${f.vendorId}" />`);
  return `<?xml version="1.0" encoding="utf-8"?>\n<!-- Gerado por plugins/comLeitorDigital.js a partir de modules/leitor-digital/leitores.json. -->\n<resources>\n${linhas.join('\n')}\n</resources>\n`;
}

function comFiltroNaAtividade(manifesto) {
  const aplicacao = manifesto.manifest.application?.[0];
  const atividade = aplicacao?.activity?.find((a) => a.$['android:name'] === '.MainActivity') ?? aplicacao?.activity?.[0];
  if (!atividade) return manifesto;
  atividade['intent-filter'] = atividade['intent-filter'] ?? [];
  const jaTem = atividade['intent-filter'].some((f) => (f.action ?? []).some((a) => a.$['android:name'] === ACAO));
  if (!jaTem) {
    atividade['intent-filter'].push({ action: [{ $: { 'android:name': ACAO } }] });
  }
  atividade['meta-data'] = (atividade['meta-data'] ?? []).filter((m) => m.$['android:name'] !== ACAO);
  atividade['meta-data'].push({ $: { 'android:name': ACAO, 'android:resource': `@xml/${RECURSO}` } });
  return manifesto;
}

function comLeitorDigital(config) {
  config = withAndroidManifest(config, (configuracao) => {
    configuracao.modResults = comFiltroNaAtividade(configuracao.modResults);
    return configuracao;
  });
  return withDangerousMod(config, [
    'android',
    (configuracao) => {
      const raiz = configuracao.modRequest.projectRoot;
      const pasta = path.join(configuracao.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res', 'xml');
      fs.mkdirSync(pasta, { recursive: true });
      fs.writeFileSync(path.join(pasta, `${RECURSO}.xml`), xmlDoFiltro(lerFabricantes(raiz)));
      return configuracao;
    },
  ]);
}

module.exports = comLeitorDigital;
module.exports.xmlDoFiltro = xmlDoFiltro;
module.exports.comFiltroNaAtividade = comFiltroNaAtividade;
