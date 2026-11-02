/*
 * Motor de reconhecimento facial do app da coordenação. Roda numa WebView
 * escondida (src/face/MotorFacial.tsx): o app manda a foto (JPEG em
 * base64), e este código encontra o rosto, os 68 pontos do rosto e calcula
 * o vetor de 128 números (face-api.js, rede ResNet-34). Só o vetor volta
 * para o app - a foto não sai do aparelho e não é guardada.
 *
 * Mensagens (JSON):
 *   app -> motor  { tipo: "processar", id, imagem: "data:image/jpeg;base64,...", retrato? }
 *   motor -> app  { tipo: "pronto", backend, diferencaGpu }
 *                 { tipo: "erro_carregar", mensagem }
 *                 { tipo: "resultado", id, ok: true, descritor: [128], confianca, rotacao }
 *                 { tipo: "resultado", id, ok: false, motivo, mensagem?, detalhe? }
 *   retrato: se a tela estava em pé (retrato) quando a foto foi tirada.
 *   motivo: carregando | sem_rosto | varios_rostos | longe | imagem | erro
 *   detalhe: dados técnicos para o suporte (tamanho da foto, backend,
 *   maior confiança encontrada), mostrados em letra pequena no app.
 */
(function () {
  'use strict';

  var MODELOS = {
    ssd_mobilenetv1_model: function () { return faceapi.nets.ssdMobilenetv1; },
    face_landmark_68_model: function () { return faceapi.nets.faceLandmark68Net; },
    face_recognition_model: function () { return faceapi.nets.faceRecognitionNet; }
  };
  // O detector devolve candidatos a partir de LIMIAR_DETECCAO; só servem
  // para cadastrar ou identificar os que passam de CONFIANCA_MINIMA. Com
  // 0,6 (primeira versão), rostos em luz de sala de aula eram descartados.
  var LIMIAR_DETECCAO = 0.4;
  var CONFIANCA_MINIMA = 0.5;
  // Nem toda câmera de tablet grava a foto em pé. O detector acha o rosto
  // deitado com tanta confiança quanto em pé (até 0,99 nos testes), então
  // a confiança não diz se a foto está deitada - quem diz é a tela: a foto
  // em pé tem a mesma orientação (retrato ou paisagem) da tela. Sobram
  // duas posições, uma de cabeça para baixo da outra, e essas o detector
  // separa bem: em pé deu 0,88 a 1,00; de cabeça para baixo, no máximo 0,87.
  // A partir desta confiança, a segunda posição nem é conferida.
  var CONFIANCA_SEM_CONFERIR = 0.95;
  // O rosto precisa ocupar ao menos 10% da largura da foto. Com 18%
  // (primeira versão), o aluno a um braço de distância do tablet já era
  // "longe demais".
  var LARGURA_MINIMA = 0.1;
  // Colegas ao fundo não atrapalham: vale o rosto mais próximo da câmera se
  // ele for ao menos 1,5 vez mais largo que o segundo maior. Rostos de
  // tamanho parecido continuam sendo "mais de um rosto".
  var PROPORCAO_PRINCIPAL = 1.5;
  // Diferença máxima (média, em fração do quadro) entre os pontos do rosto
  // calculados pela placa de vídeo e pela CPU para confiar na placa (ver
  // conferirPrecisaoGpu). Placa de 32 bits: ~0; de 16 bits: ~0,001; placa
  // que calcula errado: ~0,3.
  var DIFERENCA_MAXIMA_GPU = 0.02;

  var pronto = false;
  var diferencaGpu = null;
  // Posição que venceu na última foto, para cada par de posições: o erro de
  // orientação de uma câmera se repete, e começar por ela poupa uma
  // passagem do detector.
  var preferida = {};

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

  function usarBackend(nome) {
    return faceapi.tf.setBackend(nome).then(function (ok) {
      return faceapi.tf.ready().then(function () { return ok; });
    });
  }

  function escolherBackend() {
    return usarBackend('webgl').then(function (ok) {
      return ok ? 'webgl' : usarBackend('cpu').then(function () { return 'cpu'; });
    }).catch(function () {
      return usarBackend('cpu').then(function () { return 'cpu'; });
    });
  }

  // Padrão fixo (150x150) usado para comparar a placa de vídeo com a CPU.
  function telaDeTeste() {
    var tela = document.createElement('canvas');
    tela.width = 150;
    tela.height = 150;
    var g = tela.getContext('2d');
    for (var y = 0; y < 150; y += 10) {
      for (var x = 0; x < 150; x += 10) {
        g.fillStyle = 'rgb(' + ((x * 7 + y * 3) % 256) + ',' + ((x * 2 + y * 5) % 256) + ',' + ((x * 11 + y * 13) % 256) + ')';
        g.fillRect(x, y, 10, 10);
      }
    }
    return tela;
  }

  function pontosDoPadrao() {
    return faceapi.nets.faceLandmark68Net.detectLandmarks(telaDeTeste()).then(function (marcas) {
      var lista = [];
      marcas.relativePositions.forEach(function (p) { lista.push(p.x, p.y); });
      return lista;
    });
  }

  // Placa de vídeo que calcula errado faz o detector deixar de achar
  // rostos. Na abertura, a rede dos 68 pontos (parecida com a do detector,
  // e barata) roda num padrão fixo na placa e na CPU; se os pontos
  // divergirem, o motor fica na CPU - muito mais lento, mas certo. Placas
  // de 16 bits passam: divergem uns 0,001 e acham os rostos como as de 32.
  function conferirPrecisaoGpu() {
    if (faceapi.tf.getBackend() !== 'webgl') {
      return Promise.resolve();
    }
    var naGpu;
    return pontosDoPadrao()
      .then(function (pontos) {
        naGpu = pontos;
        return usarBackend('cpu');
      })
      .then(pontosDoPadrao)
      .then(function (naCpu) {
        var soma = naGpu.reduce(function (s, v, i) { var e = v - naCpu[i]; return s + e * e; }, 0);
        diferencaGpu = Math.sqrt(soma / naGpu.length);
        if (diferencaGpu <= DIFERENCA_MAXIMA_GPU) {
          return usarBackend('webgl');
        }
        return null; // fica na CPU
      });
  }

  // As tarefas da face-api.js só têm "then" (não "catch"): Promise.resolve
  // as transforma em Promise de verdade.
  function detectar(entrada) {
    var opcoes = new faceapi.SsdMobilenetv1Options({ minConfidence: LIMIAR_DETECCAO, maxResults: 4 });
    return Promise.resolve(faceapi.detectAllFaces(entrada, opcoes).withFaceLandmarks().withFaceDescriptors());
  }

  function girar(imagem, graus) {
    if (graus === 0) {
      return imagem;
    }
    var largura = imagem.naturalWidth || imagem.width;
    var altura = imagem.naturalHeight || imagem.height;
    var deitada = graus % 180 !== 0;
    var tela = document.createElement('canvas');
    tela.width = deitada ? altura : largura;
    tela.height = deitada ? largura : altura;
    var g = tela.getContext('2d');
    g.translate(tela.width / 2, tela.height / 2);
    g.rotate((graus * Math.PI) / 180);
    g.drawImage(imagem, -largura / 2, -altura / 2);
    return tela;
  }

  function maiorPontuacao(rostos) {
    return rostos.reduce(function (m, r) { return Math.max(m, r.detection.score); }, 0);
  }

  // As duas posições em que o rosto pode estar em pé. Sem saber a
  // orientação da tela, a foto é tratada como em pé.
  function posicoes(imagem, retrato) {
    var largura = imagem.naturalWidth || imagem.width;
    var altura = imagem.naturalHeight || imagem.height;
    var deitada = typeof retrato === 'boolean' && (altura >= largura) !== retrato;
    return deitada ? [90, 270] : [0, 180];
  }

  // Detecta os rostos com a foto girada; o principal é o mais largo.
  function avaliar(imagem, graus) {
    var entrada = girar(imagem, graus);
    return detectar(entrada).then(function (rostos) {
      var nitidos = rostos
        .filter(function (r) { return r.detection.score >= CONFIANCA_MINIMA; })
        .sort(function (a, b) { return b.detection.box.width - a.detection.box.width; });
      var principal = nitidos[0] || null;
      return {
        principal: principal,
        varios: nitidos.length > 1 && nitidos[1].detection.box.width * PROPORCAO_PRINCIPAL > principal.detection.box.width,
        entrada: entrada,
        rotacao: graus,
        pontuacao: principal ? principal.detection.score : 0,
        maiorConfianca: maiorPontuacao(rostos)
      };
    });
  }

  function procurar(imagem, retrato) {
    var par = posicoes(imagem, retrato);
    var chave = par.join('/');
    var ordem = preferida[chave] === par[1] ? [par[1], par[0]] : par;
    return avaliar(imagem, ordem[0]).then(function (primeira) {
      if (primeira.pontuacao >= CONFIANCA_SEM_CONFERIR) {
        preferida[chave] = primeira.rotacao;
        return primeira;
      }
      return avaliar(imagem, ordem[1]).then(function (segunda) {
        var melhor = segunda.pontuacao > primeira.pontuacao ? segunda : primeira;
        melhor.maiorConfianca = Math.max(primeira.maiorConfianca, segunda.maiorConfianca);
        if (melhor.principal) {
          preferida[chave] = melhor.rotacao;
        }
        return melhor;
      });
    });
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
      var largura = imagem.naturalWidth || imagem.width;
      var altura = imagem.naturalHeight || imagem.height;
      var detalheBase = largura + 'x' + altura + ' · ' + faceapi.tf.getBackend();
      procurar(imagem, mensagem.retrato)
        .then(function (achado) {
          var detalhe = detalheBase + ' · maior confiança ' + achado.maiorConfianca.toFixed(2);
          var rosto = achado.principal;
          if (!rosto) {
            return enviar({ tipo: 'resultado', id: mensagem.id, ok: false, motivo: 'sem_rosto', detalhe: detalhe });
          }
          if (achado.varios) {
            return enviar({ tipo: 'resultado', id: mensagem.id, ok: false, motivo: 'varios_rostos', detalhe: detalhe });
          }
          var proporcao = rosto.detection.box.width / achado.entrada.width;
          if (proporcao < LARGURA_MINIMA) {
            return enviar({
              tipo: 'resultado', id: mensagem.id, ok: false, motivo: 'longe',
              detalhe: detalhe + ' · rosto em ' + Math.round(proporcao * 100) + '% da largura'
            });
          }
          enviar({
            tipo: 'resultado',
            id: mensagem.id,
            ok: true,
            descritor: Array.prototype.map.call(rosto.descriptor, arredondar),
            confianca: arredondar(rosto.detection.score),
            rotacao: achado.rotacao
          });
        })
        .catch(function (erro) {
          enviar({
            tipo: 'resultado', id: mensagem.id, ok: false, motivo: 'erro',
            mensagem: String((erro && erro.message) || erro), detalhe: detalheBase
          });
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
      .then(conferirPrecisaoGpu)
      // A primeira passagem compila os programas da placa de vídeo e
      // demora; fazer agora evita que o primeiro aluno espere.
      .then(function () {
        var tela = telaDeTeste();
        return detectar(tela)
          .then(function () { return faceapi.nets.faceRecognitionNet.computeFaceDescriptor(tela); })
          .catch(function () { return null; });
      })
      .then(function () {
        pronto = true;
        enviar({ tipo: 'pronto', backend: faceapi.tf.getBackend(), diferencaGpu: diferencaGpu });
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
