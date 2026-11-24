/**
 * Regras do leitor de digital USB (sem React Native, testadas em
 * test/leitorDigital.test.ts). O app passa por estes estados:
 *
 *   sem_suporte    - aparelho sem o módulo nativo (preview web, Expo Go)
 *   desconectado   - nenhum leitor ligado no USB
 *   sem_driver     - há um leitor ligado, mas o app ainda não tem o driver
 *                    do fabricante dele (DriversInstalados.kt)
 *   sem_permissao  - leitor com driver, falta tocar em "Permitir"
 *   pronto         - é só pôr o dedo
 */
export type SituacaoLeitor = 'sem_suporte' | 'desconectado' | 'sem_driver' | 'sem_permissao' | 'pronto';

export interface DispositivoDoLeitor {
  nome: string;
  vendorId: number;
  productId: number;
  fabricante: string | null;
  produto: string | null;
  permitido: boolean;
  driver: { id: string; nome: string } | null;
}

export interface Fabricante {
  vendorId: number;
  nome: string;
}

export interface EstadoLeitor {
  situacao: SituacaoLeitor;
  /** O leitor escolhido (o primeiro com driver; senão, o primeiro de fabricante conhecido). */
  dispositivo: DispositivoDoLeitor | null;
  /** Nome para a tela: "SecuGen Hamster Pro 20" ou "leitor SecuGen". */
  nomeDoLeitor: string | null;
}

/** De todos os aparelhos USB ligados, qual é o leitor de digital (função pura). */
export function estadoDoLeitor(
  suportado: boolean,
  dispositivos: DispositivoDoLeitor[],
  fabricantes: Fabricante[]
): EstadoLeitor {
  if (!suportado) return { situacao: 'sem_suporte', dispositivo: null, nomeDoLeitor: null };
  const conhecido = (d: DispositivoDoLeitor) => fabricantes.some((f) => f.vendorId === d.vendorId);
  const comDriver = dispositivos.find((d) => d.driver);
  const escolhido = comDriver ?? dispositivos.find(conhecido) ?? null;
  if (!escolhido) return { situacao: 'desconectado', dispositivo: null, nomeDoLeitor: null };
  const nomeDoLeitor =
    escolhido.driver?.nome ??
    escolhido.produto ??
    `leitor ${fabricantes.find((f) => f.vendorId === escolhido.vendorId)?.nome ?? escolhido.fabricante ?? 'USB'}`;
  if (!escolhido.driver) return { situacao: 'sem_driver', dispositivo: escolhido, nomeDoLeitor };
  if (!escolhido.permitido) return { situacao: 'sem_permissao', dispositivo: escolhido, nomeDoLeitor };
  return { situacao: 'pronto', dispositivo: escolhido, nomeDoLeitor };
}

/** Título e texto do cartão de cada situação (o que a pessoa no tablet precisa fazer). */
export function mensagemDoLeitor(estado: EstadoLeitor): { titulo: string; texto: string } {
  switch (estado.situacao) {
    case 'sem_suporte':
      return {
        titulo: 'Leitor de digital indisponível aqui',
        texto: 'A digital funciona no app instalado no tablet Android, com um leitor USB ligado por cabo OTG.',
      };
    case 'desconectado':
      return {
        titulo: 'Conecte o leitor de digital',
        texto:
          'Ligue o leitor USB no tablet (cabo OTG). O app reconhece na hora. O sensor do próprio tablet não serve: o Android só deixa confirmar o dono do aparelho.',
      };
    case 'sem_driver':
      return {
        titulo: `${capitalizar(estado.nomeDoLeitor ?? 'Leitor')} conectado`,
        texto:
          'O app reconheceu o leitor, mas este modelo ainda não tem o driver do fabricante instalado. Enquanto isso, use o reconhecimento facial ou o registro manual.',
      };
    case 'sem_permissao':
      return {
        titulo: `${capitalizar(estado.nomeDoLeitor ?? 'Leitor')} conectado`,
        texto: 'Toque em "Permitir acesso ao leitor" e confirme na janela do Android.',
      };
    case 'pronto':
      return { titulo: `${capitalizar(estado.nomeDoLeitor ?? 'Leitor')} pronto`, texto: 'Peça ao aluno para pôr o dedo no leitor.' };
  }
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Dedos que a tela de cadastro oferece (o mesmo texto vai para a API, campo "dedo"). */
export const DEDOS = ['Indicador direito', 'Polegar direito', 'Indicador esquerdo', 'Polegar esquerdo'] as const;

/** Quanto tempo o leitor espera o dedo antes de desistir. */
export const TEMPO_PARA_O_DEDO_MS = 15000;

/** As digitais baixadas da escola valem por este tempo antes de buscar de novo (alunos novos, cadastros novos). */
export const VALIDADE_DAS_DIGITAIS_MS = 10 * 60 * 1000;

/** Digitais da escola (biometria/templatesDigitais.php) no formato que o módulo nativo compara. */
export function colunasDosTemplates(templates: { id_aluno: number; template: string; formato: string }[]): {
  ids: number[];
  templates: string[];
  formatos: string[];
} {
  return {
    ids: templates.map((t) => t.id_aluno),
    templates: templates.map((t) => t.template),
    formatos: templates.map((t) => t.formato),
  };
}
