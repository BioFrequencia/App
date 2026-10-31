/*
 * Motor de reconhecimento facial do app da coordenação. Roda numa WebView
 * escondida (src/face/MotorFacial.tsx): o app manda a foto (JPEG em
 * base64), e este código encontra o rosto, os 68 pontos do rosto e calcula
 * o vetor de 128 números (face-api.js, rede ResNet-34). Só o vetor volta
 * para o app - a foto não sai do aparelho e não é guardada.
 *
 * Mensagens (JSON):
 *   app -> motor  { tipo: "processar", id, imagem: "data:image/jpeg;base64,..." }
 *   motor -> app  { tipo: "pronto", backend }
 *                 { tipo: "erro_carregar", mensagem }
 *                 { tipo: "resultado", id, ok: true, descritor: [128], confianca }
 *                 { tipo: "resultado", id, ok: false, motivo, mensagem? }
 *   motivo: carregando | sem_rosto | varios_rostos | longe | imagem | erro
 */
(function () {
  'use strict';

  var MODELOS = {
    ssd_mobilenetv1_model: function () { return faceapi.nets.ssdMobilenetv1; },
    face_landmark_68_model: function () { return faceapi.nets.faceLandmark68Net; },
    face_recognition_model: function () { return faceapi.nets.faceRecognitionNet; }
  };
  // Detecção com menos certeza que isto não serve para cadastrar nem
  // identificar: a foto é recusada e o app pede outra.
  var CONFIANCA_MINIMA = 0.6;
  // O rosto precisa ocupar ao menos 18% da largura da foto - mais longe
  // que isso, os detalhes somem e o vetor perde qualidade.
  var LARGURA_MINIMA = 0.18;

  var pronto = false;

  function enviar(mensagem) {
    var texto = JSON.stringify(mensagem);
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(texto);
    } else if (window.parent && window.parent !== window) {
      window.parent.postMessage(texto, '*'); // teste no navegador, dentro de um iframe
    }
  }

  // XMLHttpRequest e não fetch: a página é aberta de
  // file:///android_asset/face/ e o fetch do Chrome não aceita file://.
  function ler(caminho, tipo) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', caminho, true);
      xhr.responseType = tipo;
      xhr.onload = function () {
        var ok = xhr.status === 0 || (xhr.status >= 200 && xhr.status < 300); // file:// responde 0
        if (ok && xhr.response) {
          resolve(xhr.response);
        } else {
          reject(new Error('não foi possível ler ' + caminho + ' (status ' + xhr.status + ')'));
        }
      };
      xhr.onerror = function () { reject(new Error('não foi possível ler ' + caminho)); };
      xhr.send();
    });
  }

  function carregarModelo(nome) {
    return ler('model/' + nome + '-weights_manifest.json', 'json').then(function (grupos) {
      var partes = [];
      var especificacoes = [];
      grupos.forEach(function (grupo) {
        partes = partes.concat(grupo.paths);
        especificacoes = especificacoes.concat(grupo.weights);
      });
      return Promise.all(partes.map(function (parte) { return ler('model/' + parte, 'arraybuffer'); }))
        .then(function (buffers) {
          var total = buffers.reduce(function (soma, b) { return soma + b.byteLength; }, 0);
          var junto = new Uint8Array(total);
          var posicao = 0;
          buffers.forEach(function (b) { junto.set(new Uint8Array(b), posicao); posicao += b.byteLength; });
          MODELOS[nome]().loadFromWeightMap(faceapi.tf.io.decodeWeights(junto.buffer, especificacoes));
        });
    });
  }

  // WebGL só se a placa de vídeo calcula em 32 bits: com 16 bits (alguns
  // celulares), o vetor sai impreciso e o mesmo aluno deixa de ser
  // reconhecido. Nesse caso usa a CPU - mais lento, mas exato.
  function escolherBackend() {
    return faceapi.tf.setBackend('webgl').then(function (ok) {
      var exato = ok && faceapi.tf.env().getBool('WEBGL_RENDER_FLOAT32_CAPABLE');
      return exato ? faceapi.tf.ready() : faceapi.tf.setBackend('cpu').then(function () { return faceapi.tf.ready(); });
    }).catch(function () {
      return faceapi.tf.setBackend('cpu').then(function () { return faceapi.tf.ready(); });
    });
  }

  // As tarefas da face-api.js só têm "then" (não "catch"): Promise.resolve
  // as transforma em Promise de verdade.
  function detectar(entrada, opcoes) {
    return Promise.resolve(faceapi.detectAllFaces(entrada, opcoes).withFaceLandmarks().withFaceDescriptors());
  }

  // A primeira passagem compila os programas da GPU e demora; fazer agora
  // evita que o primeiro aluno espere.
  function aquecer() {
    var tela = document.createElement('canvas');
    tela.width = 160;
    tela.height = 160;
    return detectar(tela, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 })).catch(function () { return []; });
  }

  function arredondar(valor) {
    return Math.round(valor * 1e6) / 1e6;
  }

  function processar(mensagem) {
    var imagem = new Image();
    imagem.onerror = function () {
      enviar({ tipo: 'resultado', id: mensagem.id, ok: false, motivo: 'imagem' });
    };
    imagem.onload = function () {
      detectar(imagem, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5, maxResults: 4 }))
        .then(function (rostos) {
          var nitidos = rostos.filter(function (r) { return r.detection.score >= CONFIANCA_MINIMA; });
          if (nitidos.length === 0) {
            return enviar({ tipo: 'resultado', id: mensagem.id, ok: false, motivo: 'sem_rosto' });
          }
          if (nitidos.length > 1) {
            return enviar({ tipo: 'resultado', id: mensagem.id, ok: false, motivo: 'varios_rostos' });
          }
          var rosto = nitidos[0];
          if (rosto.detection.box.width / imagem.width < LARGURA_MINIMA) {
            return enviar({ tipo: 'resultado', id: mensagem.id, ok: false, motivo: 'longe' });
          }
          enviar({
            tipo: 'resultado',
            id: mensagem.id,
            ok: true,
            descritor: Array.prototype.map.call(rosto.descriptor, arredondar),
            confianca: arredondar(rosto.detection.score)
          });
        })
        .catch(function (erro) {
          enviar({ tipo: 'resultado', id: mensagem.id, ok: false, motivo: 'erro', mensagem: String((erro && erro.message) || erro) });
        });
    };
    imagem.src = mensagem.imagem;
  }

  function receber(evento) {
    var mensagem;
    try {
      mensagem = JSON.parse(evento.data);
    } catch (e) {
      return;
    }
    if (!mensagem || mensagem.tipo !== 'processar') {
      return;
    }
    if (!pronto) {
      enviar({ tipo: 'resultado', id: mensagem.id, ok: false, motivo: 'carregando' });
      return;
    }
    processar(mensagem);
  }

  // Android entrega as mensagens do app em "document"; iOS e o navegador, em "window".
  document.addEventListener('message', receber);
  window.addEventListener('message', receber);

  function iniciar() {
    if (typeof faceapi === 'undefined') {
      enviar({ tipo: 'erro_carregar', mensagem: 'face-api.js não foi carregado' });
      return;
    }
    escolherBackend()
      .then(function () { return Promise.all(Object.keys(MODELOS).map(carregarModelo)); })
      .then(aquecer)
      .then(function () {
        pronto = true;
        enviar({ tipo: 'pronto', backend: faceapi.tf.getBackend() });
      })
      .catch(function (erro) {
        enviar({ tipo: 'erro_carregar', mensagem: String((erro && erro.message) || erro) });
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
