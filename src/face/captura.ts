import type { CameraView } from 'expo-camera';
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/** Largura da foto entregue ao motor: detalhe suficiente para o rosto, sem pesar. */
const LARGURA = 640;

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
 * recebe. Os arquivos temporários (a foto da câmera e a reduzida) são
 * apagados em seguida: a imagem do aluno não fica guardada no aparelho.
 */
export async function fotografar(camera: CameraView): Promise<string> {
  const foto = await camera.takePictureAsync({ quality: 0.85, shutterSound: false });
  if (!foto?.uri) {
    throw new Error('A câmera não devolveu a foto.');
  }
  try {
    const contexto = ImageManipulator.manipulate(foto.uri);
    contexto.resize({ width: LARGURA });
    const imagem = await contexto.renderAsync();
    const resultado = await imagem.saveAsync({ base64: true, compress: 0.85, format: SaveFormat.JPEG });
    apagarTemporario(resultado.uri);
    if (!resultado.base64) {
      throw new Error('Não foi possível preparar a foto.');
    }
    return resultado.base64;
  } finally {
    apagarTemporario(foto.uri);
  }
}
