/**
 * Mensagem aos responsáveis (MensagemTela) e "Esqueci minha senha"
 * (LoginTela): escolhas e textos que não dependem do servidor - as mesmas
 * regras do site (site/lib/mensagens.ts). Quem monta a mensagem de cada
 * responsável é a API: a prévia mostra exatamente o que vai sair.
 * Funções puras, testadas em test/mensagens.test.ts.
 */
import type { CanalMensagem, ComoSaiMensagem, ContatoResponsavel, DestinoMensagem, StatusEnvio } from './types';

/** Os destinos que já vêm marcados: o canal preferido de cada responsável (o que a API sugere). */
export function destinosSugeridos(responsaveis: ContatoResponsavel[]): DestinoMensagem[] {
  return responsaveis.flatMap((r) => r.sugeridos.map((canal) => ({ id_responsavel: r.id_responsavel, canal })));
}

export function temDestino(destinos: DestinoMensagem[], idResponsavel: number, canal: CanalMensagem): boolean {
  return destinos.some((d) => d.id_responsavel === idResponsavel && d.canal === canal);
}

/** Liga ou desliga um destino. */
export function alternarDestino(destinos: DestinoMensagem[], destino: DestinoMensagem): DestinoMensagem[] {
  return temDestino(destinos, destino.id_responsavel, destino.canal)
    ? destinos.filter((d) => !(d.id_responsavel === destino.id_responsavel && d.canal === destino.canal))
    : [...destinos, destino];
}

export function nomeDoCanal(canal: CanalMensagem): string {
  return canal === 'whatsapp' ? 'WhatsApp' : 'E-mail';
}

/** Caracteres como a API conta (mb_strlen): um emoji vale um. */
export function tamanhoDaMensagem(texto: string): number {
  return [...texto.trim()].length;
}

/** O que falta para ver a prévia; null quando já dá. */
export function problemaDaMensagem(texto: string, destinos: DestinoMensagem[], maximo: number): string | null {
  if (texto.trim() === '') return 'Escreva a mensagem ou escolha um modelo.';
  if (tamanhoDaMensagem(texto) > maximo) return `A mensagem passa de ${maximo} caracteres.`;
  if (destinos.length === 0) return 'Escolha pelo menos um responsável e um canal.';
  return null;
}

/** O aviso de antes de escrever, quando algum canal não tem envio automático; null quando os dois têm. */
export function avisoDosProvedores(provedores: { whatsapp: boolean; email: boolean }): string | null {
  if (!provedores.whatsapp && !provedores.email) {
    return 'Sem envio automático configurado: o WhatsApp sai pelo link, deste aparelho, e o e-mail fica na fila de Notificações do site.';
  }
  if (!provedores.whatsapp) return 'Sem WhatsApp automático: depois de enviar, você manda pelo link, deste aparelho.';
  if (!provedores.email) return 'Sem e-mail automático: o e-mail fica na fila de Notificações do site.';
  return null;
}

/** Como a mensagem vai sair, em palavras. */
export function rotuloComoSai(canal: CanalMensagem, como: ComoSaiMensagem): string {
  if (como === 'automatico') return canal === 'whatsapp' ? 'Sai pelo WhatsApp da escola' : 'Sai por e-mail';
  if (como === 'link') return 'Sem WhatsApp automático: depois de enviar, você manda pelo link';
  return 'Sem e-mail automático: fica na fila de Notificações do site';
}

/** O selo da situação de um envio. */
export function seloDoEnvio(status: StatusEnvio): { tipo: 'ok' | 'pendente' | 'perigo'; texto: string } {
  if (status === 'enviada') return { tipo: 'ok', texto: 'Enviada' };
  if (status === 'erro') return { tipo: 'perigo', texto: 'Erro no envio' };
  return { tipo: 'pendente', texto: 'Para mandar' };
}

/** O título do resultado: o que de fato aconteceu com a mensagem. */
export function tituloDoEnvio(resumo: { enviadas: number; pendentes: number; erros: number }): string {
  if (resumo.erros > 0 && resumo.enviadas + resumo.pendentes === 0) return 'A mensagem não saiu';
  if (resumo.erros > 0) return 'Mensagem enviada, com erro em parte';
  if (resumo.enviadas === 0 && resumo.pendentes > 0) return 'Mensagem pronta: falta mandar pelo link';
  return 'Mensagem enviada';
}

/**
 * Uma chave nova por mensagem (a API aceita de 8 a 64 letras, números e
 * hífens): o mesmo pedido repetido - toque duplo, conexão que caiu - não
 * manda de novo.
 */
export function chaveDeEnvio(agora: number, aleatorio: () => number): string {
  const parte = () => Math.floor(aleatorio() * 2 ** 32).toString(36).padStart(7, '0');
  return `app-${agora.toString(36)}-${parte()}${parte()}`;
}

export function novaChaveDeEnvio(): string {
  const cripto = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  return typeof cripto?.randomUUID === 'function' ? cripto.randomUUID() : chaveDeEnvio(Date.now(), Math.random);
}

/** "Esqueci minha senha": o que falta no e-mail; null quando dá para pedir o link. */
export function problemaDoEmailDaConta(email: string): string | null {
  const limpo = email.trim();
  if (limpo === '') return 'Informe o e-mail da sua conta.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpo)) return 'Informe um e-mail válido.';
  return null;
}
