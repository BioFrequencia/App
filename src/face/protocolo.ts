/**
 * Conversa entre o app e o motor facial (face/motor.js, numa WebView).
 * Funções puras - testadas em test/motorFacial.test.ts.
 */

export type MotivoFalha =
  | 'carregando'
  | 'sem_rosto'
  | 'varios_rostos'
  | 'longe'
  | 'imagem'
  | 'erro'
  | 'tempo'
  | 'indisponivel';

export type ResultadoFacial =
  | { ok: true; descritor: number[]; confianca: number }
  | { ok: false; motivo: MotivoFalha; mensagem?: string };

export type MensagemMotor =
  | { tipo: 'pronto'; backend?: string }
  | { tipo: 'erro_carregar'; mensagem: string }
  | { tipo: 'resultado'; id: number; resultado: ResultadoFacial };

/** Tamanho do vetor da face-api.js (ResNet-34). */
export const TAMANHO_DESCRITOR = 128;

const MOTIVOS: MotivoFalha[] = ['carregando', 'sem_rosto', 'varios_rostos', 'longe', 'imagem', 'erro', 'tempo', 'indisponivel'];

/** Mensagem vinda da WebView, validada; null se não for uma mensagem do motor. */
export function lerMensagemMotor(texto: string): MensagemMotor | null {
  let bruto: Record<string, unknown>;
  try {
    bruto = JSON.parse(texto);
  } catch {
    return null;
  }
  if (!bruto || typeof bruto !== 'object') return null;

  if (bruto.tipo === 'pronto') {
    return { tipo: 'pronto', backend: typeof bruto.backend === 'string' ? bruto.backend : undefined };
  }
  if (bruto.tipo === 'erro_carregar') {
    return { tipo: 'erro_carregar', mensagem: String(bruto.mensagem ?? 'falha ao carregar') };
  }
  if (bruto.tipo !== 'resultado' || typeof bruto.id !== 'number') return null;

  if (bruto.ok === true) {
    const descritor = bruto.descritor;
    const valido = Array.isArray(descritor)
      && descritor.length === TAMANHO_DESCRITOR
      && descritor.every((v) => typeof v === 'number' && Number.isFinite(v));
    if (!valido) {
      return { tipo: 'resultado', id: bruto.id, resultado: { ok: false, motivo: 'erro', mensagem: 'vetor inválido' } };
    }
    return {
      tipo: 'resultado',
      id: bruto.id,
      resultado: { ok: true, descritor: descritor as number[], confianca: Number(bruto.confianca) || 0 },
    };
  }

  const motivo = MOTIVOS.includes(bruto.motivo as MotivoFalha) ? (bruto.motivo as MotivoFalha) : 'erro';
  return {
    tipo: 'resultado',
    id: bruto.id,
    resultado: { ok: false, motivo, mensagem: typeof bruto.mensagem === 'string' ? bruto.mensagem : undefined },
  };
}

/** O que dizer na tela quando a foto não serve. */
export function textoDaFalha(motivo: MotivoFalha): string {
  switch (motivo) {
    case 'sem_rosto':
      return 'Nenhum rosto encontrado. Posicione o rosto dentro do contorno, de frente e com boa iluminação.';
    case 'varios_rostos':
      return 'Há mais de um rosto na imagem. Apenas um aluno por vez diante da câmera.';
    case 'longe':
      return 'O rosto está longe demais. Peça para o aluno se aproximar da câmera.';
    case 'imagem':
      return 'Não foi possível ler a foto. Tente de novo.';
    case 'carregando':
      return 'O reconhecimento facial ainda está sendo preparado. Aguarde alguns segundos.';
    case 'tempo':
      return 'O reconhecimento demorou demais. Tente de novo.';
    case 'indisponivel':
      return 'O reconhecimento facial não está disponível neste aparelho.';
    default:
      return 'Falha no reconhecimento facial. Tente de novo.';
  }
}
