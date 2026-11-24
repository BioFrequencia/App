import { NativeModule, requireOptionalNativeModule } from 'expo';

/** Um aparelho USB ligado no tablet (modules/leitor-digital, LeitorDigitalModule.kt). */
export interface DispositivoUsb {
  nome: string;
  vendorId: number;
  productId: number;
  fabricante: string | null;
  produto: string | null;
  permitido: boolean;
  /** O driver do fabricante instalado no app que sabe falar com ele (null: nenhum). */
  driver: { id: string; nome: string } | null;
}

export interface AmostraLida {
  template: string;
  formato: string;
  qualidade: number | null;
}

export interface AlunoIdentificadoPelaDigital {
  id_aluno: number;
  pontuacao: number;
  minima: number;
}

type Eventos = {
  aoMudarConexao: (evento: { motivo: 'conectado' | 'desconectado' | 'permissao' }) => void;
};

declare class LeitorDigitalNativo extends NativeModule<Eventos> {
  listarDispositivos(): DispositivoUsb[];
  driversInstalados(): { id: string; nome: string }[];
  pedirPermissao(nome: string): Promise<boolean>;
  capturar(nome: string, tempoLimiteMs: number): Promise<AmostraLida>;
  identificar(
    nome: string,
    template: string,
    formato: string,
    ids: number[],
    templates: string[],
    formatos: string[]
  ): Promise<AlunoIdentificadoPelaDigital | null>;
}

/**
 * O módulo nativo, ou null onde ele não existe (preview web, Expo Go,
 * iPhone): a tela mostra "este aparelho não tem suporte a leitor USB".
 */
export const LeitorDigital = requireOptionalNativeModule<LeitorDigitalNativo>('LeitorDigital');
