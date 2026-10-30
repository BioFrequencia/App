/**
 * Regras dos formulários de conta do aluno (funções puras, sem React
 * Native - testadas em test/contaRegras.test.ts).
 *
 * A API confere tudo de novo; estas regras só evitam uma viagem até o
 * servidor (que pode levar até um minuto para acordar) por um erro de
 * digitação.
 */

export const SENHA_MINIMA = 6;

/** Máscara do campo de data: "31012010" -> "31/01/2010" (só dígitos, no máximo 8). */
export function mascararData(texto: string): string {
  const digitos = texto.replace(/\D/g, '').slice(0, 8);
  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 4) return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
  return `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`;
}

function doisDigitos(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * "31/01/2010" -> "2010-01-31", o formato da API. null para data
 * incompleta, inexistente (31/02), no futuro ou de mais de 120 anos atrás.
 */
export function dataBrParaIso(texto: string, hoje: Date = new Date()): string | null {
  const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto.trim());
  if (!partes) return null;
  const [dia, mes, ano] = [Number(partes[1]), Number(partes[2]), Number(partes[3])];
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  if (data.getUTCFullYear() !== ano || data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) {
    return null;
  }
  const iso = `${partes[3]}-${partes[2]}-${partes[1]}`;
  const hojeIso = `${hoje.getFullYear()}-${doisDigitos(hoje.getMonth() + 1)}-${doisDigitos(hoje.getDate())}`;
  if (iso > hojeIso || ano < hoje.getFullYear() - 120) {
    return null;
  }
  return iso;
}

export function emailPareceValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export interface DadosCriarConta {
  nome: string;
  dataNascimento: string;
  email: string;
  senha: string;
  confirmacaoSenha: string;
}

/** Mensagem do primeiro problema do cadastro, ou null se pode enviar. */
export function validarCriarConta(dados: DadosCriarConta, hoje?: Date): string | null {
  // A API acha o aluno pelo nome completo ou pelo primeiro e último nome:
  // um nome só nunca encontraria ninguém.
  if (dados.nome.trim().split(/\s+/).length < 2) {
    return 'Digite seu nome e sobrenome, como estão no cadastro da escola.';
  }
  if (!dataBrParaIso(dados.dataNascimento, hoje)) {
    return 'Digite a data de nascimento no formato DD/MM/AAAA.';
  }
  if (!emailPareceValido(dados.email)) {
    return 'Digite um e-mail válido.';
  }
  if (dados.senha.length < SENHA_MINIMA) {
    return `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`;
  }
  if (dados.senha !== dados.confirmacaoSenha) {
    return 'As duas senhas não são iguais.';
  }
  return null;
}

/** Mensagem do primeiro problema do login, ou null se pode enviar. */
export function validarEntrar(email: string, senha: string): string | null {
  if (!emailPareceValido(email)) {
    return 'Digite o e-mail da sua conta.';
  }
  if (senha.length === 0) {
    return 'Digite a sua senha.';
  }
  return null;
}
