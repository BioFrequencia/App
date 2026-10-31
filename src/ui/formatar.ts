/**
 * Formatação de datas e nomes para as telas (funções puras - testadas em
 * test/formatar.test.ts).
 *
 * A API grava e devolve os horários em UTC, sem fuso no texto
 * ("2026-10-30 10:42:07.123"); a tela mostra no horário da escola. Datas
 * puras ("2010-05-10") são dias de calendário e não passam por fuso.
 */
export const FUSO_ESCOLA = 'America/Sao_Paulo';

const SO_DATA = /^\d{4}-\d{2}-\d{2}$/;

/** Lê um horário da API (UTC sem sufixo) como Date. */
export function lerHorarioApi(valor: string): Date | null {
  const texto = valor.trim();
  const iso = /[zZ]|[+-]\d{2}:?\d{2}$/.test(texto) ? texto.replace(' ', 'T') : `${texto.replace(' ', 'T')}Z`;
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? null : data;
}

/** "10:42" no horário da escola. */
export function formatarHora(valor: string | null | undefined): string {
  if (!valor) return '--:--';
  const data = lerHorarioApi(valor);
  if (!data) return '--:--';
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: FUSO_ESCOLA }).format(data);
}

/** "10/05/2010" - data pura ou horário da API (no dia da escola). */
export function formatarData(valor: string | null | undefined): string {
  if (!valor) return '-';
  if (SO_DATA.test(valor)) {
    const [ano, mes, dia] = valor.split('-');
    return `${dia}/${mes}/${ano}`;
  }
  const data = lerHorarioApi(valor);
  if (!data) return valor;
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: FUSO_ESCOLA }).format(data);
}

/** "AAAA-MM-DD" de hoje no calendário da escola. */
export function hojeNaEscola(agora: Date = new Date()): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO_ESCOLA, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(agora);
  const p = (tipo: string) => partes.find((x) => x.type === tipo)?.value ?? '';
  return `${p('year')}-${p('month')}-${p('day')}`;
}

/** Soma dias a uma data "AAAA-MM-DD" (sem passar por fuso). */
export function somarDias(data: string, dias: number): string {
  const [ano, mes, dia] = data.split('-').map(Number);
  const resultado = new Date(Date.UTC(ano, mes - 1, dia + dias));
  return resultado.toISOString().slice(0, 10);
}

/** "sexta-feira, 30 de outubro" para o cabeçalho dos registros. */
export function dataPorExtenso(data: string): string {
  const [ano, mes, dia] = data.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
    .format(new Date(Date.UTC(ano, mes - 1, dia)));
}

/** Iniciais para o avatar: "Ana Clara Souza" -> "AS". */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

/** Primeiro nome, para a saudação e os avisos curtos. */
export function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? nome;
}
