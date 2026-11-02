// face/motor.js roda numa WebView; aqui ele roda no Node com uma face-api
// de mentira, para testar as decisões do motor: em que posição a foto
// está, qual rosto vale, quando a foto é recusada e quando a placa de
// vídeo não serve.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

type Giro = 0 | 90 | 180 | 270;
interface RostoFalso { confianca: number; largura: number; vetor?: number }
/** Rostos que o detector "acha" em cada giro aplicado à foto. */
type Cenario = Partial<Record<Giro, RostoFalso[]>>;

const fonte = readFileSync(new URL('../face/motor.js', import.meta.url), 'utf8');

/** Canvas de mentira: guarda o giro que o motor aplicou. */
class Tela {
  width = 0;
  height = 0;
  giro: number | undefined = undefined;
  getContext() {
    return {
      translate() {},
      rotate: (radianos: number) => { this.giro = Math.round((radianos * 180) / Math.PI); },
      drawImage() {},
      fillRect() {},
      fillStyle: '',
    };
  }
}

const fotos = new Map<string, { largura: number; altura: number }>();

class Imagem {
  naturalWidth = 0;
  naturalHeight = 0;
  width = 0;
  height = 0;
  onload: () => void = () => {};
  onerror: () => void = () => {};
  set src(endereco: string) {
    const foto = fotos.get(endereco);
    if (!foto) {
      setTimeout(() => this.onerror());
      return;
    }
    this.naturalWidth = this.width = foto.largura;
    this.naturalHeight = this.height = foto.altura;
    setTimeout(() => this.onload());
  }
}

class Xhr {
  responseType = '';
  status = 0;
  response: unknown = null;
  onload: () => void = () => {};
  onerror: () => void = () => {};
  open() {}
  send() {
    this.status = 200;
    this.response = this.responseType === 'json' ? [] : new ArrayBuffer(0);
    setTimeout(() => this.onload());
  }
}

/** Sobe o motor com a face-api de mentira; desvioGpu desloca os pontos do rosto calculados pela placa. */
async function criarMotor({ desvioGpu = 0 } = {}) {
  const enviadas: Record<string, any>[] = [];
  const ouvintes: ((evento: { data: string }) => void)[] = [];
  let cenario: Cenario = {};
  let passagens: number[] = [];
  const tf = {
    atual: 'webgl',
    setBackend: (nome: string) => { tf.atual = nome; return Promise.resolve(true); },
    ready: () => Promise.resolve(),
    getBackend: () => tf.atual,
    io: { decodeWeights: () => ({}) },
  };
  const faceapi = {
    tf,
    nets: {
      ssdMobilenetv1: { loadFromWeightMap() {} },
      faceLandmark68Net: {
        loadFromWeightMap() {},
        detectLandmarks: () => Promise.resolve({ relativePositions: [{ x: 0.5 + (tf.atual === 'webgl' ? desvioGpu : 0), y: 0.5 }] }),
      },
      faceRecognitionNet: { loadFromWeightMap() {}, computeFaceDescriptor: () => Promise.resolve(new Float32Array(128)) },
    },
    SsdMobilenetv1Options: class { minConfidence = 0; constructor(opcoes: { minConfidence: number }) { this.minConfidence = opcoes.minConfidence; } },
    detectAllFaces(entrada: Imagem | Tela, opcoes: { minConfidence: number }) {
      // O padrão de teste (canvas que o motor não girou) não tem rosto.
      const giro = entrada instanceof Imagem ? 0 : entrada.giro;
      const rostos = giro === undefined ? [] : (cenario[((giro + 360) % 360) as Giro] ?? []);
      if (giro !== undefined) passagens.push((giro + 360) % 360);
      const achados = rostos
        .filter((r) => r.confianca >= opcoes.minConfidence)
        .map((r) => ({ detection: { score: r.confianca, box: { width: r.largura } }, descriptor: new Float32Array(128).fill(r.vetor ?? 0.1) }));
      return { withFaceLandmarks: () => ({ withFaceDescriptors: () => Promise.resolve(achados) }) };
    },
  };
  const contexto = vm.createContext({
    faceapi,
    Image: Imagem,
    XMLHttpRequest: Xhr,
    setTimeout,
    window: { ReactNativeWebView: { postMessage: (texto: string) => enviadas.push(JSON.parse(texto)) }, addEventListener() {} },
    // Android entrega as mensagens do app em "document".
    document: {
      readyState: 'complete',
      createElement: () => new Tela(),
      addEventListener: (tipo: string, ouvinte: (evento: { data: string }) => void) => { if (tipo === 'message') ouvintes.push(ouvinte); },
    },
  });
  vm.runInContext(fonte, contexto);

  const esperar = async (achou: () => Record<string, any> | undefined) => {
    for (let i = 0; i < 200; i++) {
      const mensagem = achou();
      if (mensagem) return mensagem;
      await new Promise((r) => setTimeout(r, 1));
    }
    throw new Error('o motor não respondeu');
  };
  const pronto = await esperar(() => enviadas.find((m) => m.tipo === 'pronto' || m.tipo === 'erro_carregar'));

  let proximoId = 1;
  async function processar(foto: { largura: number; altura: number; retrato?: boolean; cenario: Cenario }) {
    const id = proximoId++;
    const imagem = `data:image/jpeg;base64,foto${id}`;
    fotos.set(imagem, foto);
    cenario = foto.cenario;
    passagens = [];
    ouvintes.forEach((ouvinte) => ouvinte({ data: JSON.stringify({ tipo: 'processar', id, imagem, retrato: foto.retrato }) }));
    const resposta = await esperar(() => enviadas.find((m) => m.tipo === 'resultado' && m.id === id));
    return { resposta, passagens };
  }
  return { pronto, processar };
}

const EM_PE = { largura: 720, altura: 960, retrato: true };
const DEITADA = { largura: 960, altura: 720, retrato: true };

test('foto em pé com rosto nítido: uma passagem do detector, sem girar', async () => {
  const motor = await criarMotor();
  const { resposta, passagens } = await motor.processar({ ...EM_PE, cenario: { 0: [{ confianca: 0.98, largura: 300 }] } });
  assert.equal(resposta.ok, true);
  assert.equal(resposta.rotacao, 0);
  assert.equal(resposta.descritor.length, 128);
  assert.deepEqual(passagens, [0]);
});

test('confiança média: confere a foto de cabeça para baixo e fica com a posição mais confiante', async () => {
  const motor = await criarMotor();
  const emPe = await motor.processar({ ...EM_PE, cenario: { 0: [{ confianca: 0.7, largura: 300 }], 180: [{ confianca: 0.6, largura: 300 }] } });
  assert.equal(emPe.resposta.rotacao, 0);
  assert.deepEqual(emPe.passagens, [0, 180]);

  const invertida = await motor.processar({ ...EM_PE, cenario: { 0: [{ confianca: 0.6, largura: 300 }], 180: [{ confianca: 0.9, largura: 300 }] } });
  assert.equal(invertida.resposta.rotacao, 180);
});

test('foto deitada (paisagem com a tela em pé): só valem 90° e 270°, mesmo que a foto como veio pareça ter rosto', async () => {
  // O detector acha rosto deitado com até 0,99 de confiança: a posição
  // original não pode nem ser considerada.
  const motor = await criarMotor();
  const cenario = { 0: [{ confianca: 0.99, largura: 300 }], 90: [{ confianca: 0.7, largura: 300 }], 270: [{ confianca: 0.93, largura: 300 }] };
  const { resposta, passagens } = await motor.processar({ ...DEITADA, cenario });
  assert.equal(resposta.rotacao, 270);
  assert.deepEqual(passagens, [90, 270]);
});

test('lembra a posição que venceu: a próxima foto deitada começa por ela', async () => {
  const motor = await criarMotor();
  await motor.processar({ ...DEITADA, cenario: { 90: [{ confianca: 0.6, largura: 300 }], 270: [{ confianca: 0.9, largura: 300 }] } });
  const { resposta, passagens } = await motor.processar({ ...DEITADA, cenario: { 270: [{ confianca: 0.97, largura: 300 }] } });
  assert.equal(resposta.rotacao, 270);
  assert.deepEqual(passagens, [270]);
});

test('sem a orientação da tela, a foto é tratada como em pé', async () => {
  const motor = await criarMotor();
  const { resposta, passagens } = await motor.processar({ largura: 960, altura: 720, cenario: { 0: [{ confianca: 0.98, largura: 300 }] } });
  assert.equal(resposta.rotacao, 0);
  assert.deepEqual(passagens, [0]);
});

test('colega ao fundo não atrapalha: vale o rosto bem maior', async () => {
  const motor = await criarMotor();
  const cenario = { 0: [{ confianca: 0.9, largura: 120, vetor: 0.2 }, { confianca: 0.97, largura: 300, vetor: 0.1 }] };
  const { resposta } = await motor.processar({ ...EM_PE, cenario });
  assert.equal(resposta.ok, true);
  assert.equal(resposta.descritor[0], 0.1);
});

test('dois rostos de tamanho parecido: "mais de um rosto"', async () => {
  const motor = await criarMotor();
  const cenario = { 0: [{ confianca: 0.97, largura: 300 }, { confianca: 0.96, largura: 250 }] };
  const { resposta } = await motor.processar({ ...EM_PE, cenario });
  assert.equal(resposta.ok, false);
  assert.equal(resposta.motivo, 'varios_rostos');
});

test('rosto pequeno demais na foto: "longe", com a proporção no detalhe', async () => {
  const motor = await criarMotor();
  const { resposta } = await motor.processar({ ...EM_PE, cenario: { 0: [{ confianca: 0.97, largura: 50 }] } });
  assert.equal(resposta.motivo, 'longe');
  assert.match(resposta.detalhe, /7% da largura/);
});

test('nada nítido: "sem rosto", com o tamanho da foto, o processador e a maior confiança no detalhe', async () => {
  const motor = await criarMotor();
  const cenario = { 0: [{ confianca: 0.45, largura: 300 }], 180: [{ confianca: 0.42, largura: 300 }] };
  const { resposta } = await motor.processar({ ...EM_PE, cenario });
  assert.equal(resposta.motivo, 'sem_rosto');
  assert.equal(resposta.detalhe, '720x960 · webgl · maior confiança 0.45');
});

test('placa de vídeo de 16 bits continua sendo usada; placa que calcula errado cede lugar à CPU', async () => {
  const dezesseisBits = await criarMotor({ desvioGpu: 0.001 });
  assert.equal(dezesseisBits.pronto.backend, 'webgl');

  const errada = await criarMotor({ desvioGpu: 0.3 });
  assert.equal(errada.pronto.backend, 'cpu');
  assert.ok(errada.pronto.diferencaGpu > 0.02);
});
