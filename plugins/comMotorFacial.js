/**
 * Plugin do Expo: põe o motor de reconhecimento facial dentro do APK.
 *
 * Durante o "expo prebuild", copia para android/app/src/main/assets/face/:
 *   - face/index.html e face/motor.js (deste repositório);
 *   - face-api.js e os três modelos usados (detecção, 68 pontos e
 *     reconhecimento) do pacote @vladmandic/face-api (licença MIT).
 * A WebView escondida do app (src/face/MotorFacial.tsx) abre
 * file:///android_asset/face/index.html.
 *
 * Os modelos (~13 MB) não ficam versionados: vêm do node_modules a cada
 * build, na versão fixada no package-lock.
 */
const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('expo/config-plugins');

const MODELOS = ['ssd_mobilenetv1_model', 'face_landmark_68_model', 'face_recognition_model'];

function copiarMotorFacial(raizProjeto, destino) {
  const faceApi = path.dirname(require.resolve('@vladmandic/face-api/package.json', { paths: [raizProjeto] }));
  fs.mkdirSync(path.join(destino, 'model'), { recursive: true });

  for (const arquivo of ['index.html', 'motor.js']) {
    fs.copyFileSync(path.join(raizProjeto, 'face', arquivo), path.join(destino, arquivo));
  }
  fs.copyFileSync(path.join(faceApi, 'dist', 'face-api.js'), path.join(destino, 'face-api.js'));
  fs.copyFileSync(path.join(faceApi, 'LICENSE'), path.join(destino, 'LICENSE-face-api.txt'));

  for (const modelo of MODELOS) {
    const manifesto = `${modelo}-weights_manifest.json`;
    fs.copyFileSync(path.join(faceApi, 'model', manifesto), path.join(destino, 'model', manifesto));
    const grupos = JSON.parse(fs.readFileSync(path.join(faceApi, 'model', manifesto), 'utf8'));
    for (const grupo of grupos) {
      for (const parte of grupo.paths) {
        fs.copyFileSync(path.join(faceApi, 'model', parte), path.join(destino, 'model', parte));
      }
    }
  }
}

function comMotorFacial(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const destino = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'main', 'assets', 'face');
      copiarMotorFacial(cfg.modRequest.projectRoot, destino);
      return cfg;
    },
  ]);
}

module.exports = comMotorFacial;
module.exports.copiarMotorFacial = copiarMotorFacial;
