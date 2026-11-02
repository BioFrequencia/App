import { Dimensions } from 'react-native';
import type { CameraView } from 'expo-camera';
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import type { FotoDoRosto } from './protocolo';

/**
 * Lado maior da foto entregue ao motor. O detector reduz a foto a 512 px
 * de qualquer jeito, mas o vetor do rosto é calculado sobre a foto e sai
 * melhor com mais detalhe no rosto; 960 ainda é leve para a WebView.
 */
const LADO_MAIOR = 960;

function apagarTemporario(uri: string | undefined): void {
  if (!uri) return;
  try {
    new File(uri).delete();
  } catch {
    // Arquivo já removido ou fora do cache do app: nada a fazer.
  }
}

/**
 * Tira a foto e devolve um JPEG reduzido em base64 - o que o motor facial
 * recebe -, com a orientação da tela na hora da foto. Os arquivos
 * temporários (a foto da câmera e a reduzida) são apagados em seguida: a
 * imagem do aluno não fica guardada no aparelho.
 */
export async function fotografar(camera: CameraView): Promise<FotoDoRosto> {
  const tela = Dimensions.get('window');
  const retrato = tela.height >= tela.width;
  const foto = await camera.takePictureAsync({ quality: 0.85, shutterSound: false });
  if (!foto?.uri) {
    throw new Error('A câmera não devolveu a foto.');
  }
  try {
    const contexto = ImageManipulator.manipulate(foto.uri);
    if (Math.max(foto.width, foto.height) > LADO_MAIOR) {
      contexto.resize(foto.width >= foto.height ? { width: LADO_MAIOR } : { height: LADO_MAIOR });
    }
    const imagem = await contexto.renderAsync();
    const resultado = await imagem.saveAsync({ base64: true, compress: 0.85, format: SaveFormat.JPEG });
    apagarTemporario(resultado.uri);
    if (!resultado.base64) {
      throw new Error('Não foi possível preparar a foto.');
    }
    return { base64: resultado.base64, retrato };
  } finally {
    apagarTemporario(foto.uri);
  }
}
