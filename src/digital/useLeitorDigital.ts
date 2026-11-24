import { useCallback, useEffect, useRef, useState } from 'react';

import { LeitorDigital, type AmostraLida } from '../../modules/leitor-digital';
import leitores from '../../modules/leitor-digital/leitores.json';
import { templatesDigitais, type TemplateDigital } from '../api/biometria';
import { mensagemDeErro } from '../api/client';
import { colunasDosTemplates, estadoDoLeitor, TEMPO_PARA_O_DEDO_MS, VALIDADE_DAS_DIGITAIS_MS, type EstadoLeitor } from './leitorRegras';

const FABRICANTES = leitores.fabricantes;

/** Digitais baixadas da escola, guardadas na memória por alguns minutos. */
let cacheDigitais: { quando: number; lista: TemplateDigital[] } | null = null;

/** Esquece as digitais baixadas (ex.: depois de cadastrar uma nova). */
export function esquecerDigitaisDaEscola() {
  cacheDigitais = null;
}

async function digitaisDaEscola(): Promise<TemplateDigital[]> {
  if (cacheDigitais && Date.now() - cacheDigitais.quando < VALIDADE_DAS_DIGITAIS_MS) return cacheDigitais.lista;
  const resposta = await templatesDigitais();
  if (!resposta.sucesso || !resposta.dados) throw new Error(resposta.mensagem || 'Não foi possível baixar as digitais da escola.');
  cacheDigitais = { quando: Date.now(), lista: resposta.dados };
  return resposta.dados;
}

export type ResultadoDaLeitura =
  | { tipo: 'identificado'; idAluno: number }
  | { tipo: 'nao_reconhecido'; semCadastros: boolean }
  | { tipo: 'erro'; mensagem: string };

/**
 * O leitor de digital USB, para as telas: a situação (atualizada sozinha
 * quando o leitor é ligado, desligado ou permitido), pedir a permissão,
 * ler uma digital (cadastro) e identificar o aluno pela digital.
 */
export function useLeitorDigital() {
  const [estado, setEstado] = useState<EstadoLeitor>(() => lerEstado());
  const montado = useRef(true);

  const atualizar = useCallback(() => {
    if (montado.current) setEstado(lerEstado());
  }, []);

  useEffect(() => {
    montado.current = true;
    if (!LeitorDigital) return undefined;
    const inscricao = LeitorDigital.addListener('aoMudarConexao', atualizar);
    return () => {
      montado.current = false;
      inscricao.remove();
    };
  }, [atualizar]);

  const pedirPermissao = useCallback(async () => {
    if (!LeitorDigital || !estado.dispositivo) return false;
    const permitido = await LeitorDigital.pedirPermissao(estado.dispositivo.nome).catch(() => false);
    atualizar();
    return permitido;
  }, [estado.dispositivo, atualizar]);

  /** Lê o dedo e devolve o template (para o cadastro). */
  const ler = useCallback(async (): Promise<AmostraLida> => {
    if (!LeitorDigital || estado.situacao !== 'pronto' || !estado.dispositivo) throw new Error('O leitor não está pronto.');
    return LeitorDigital.capturar(estado.dispositivo.nome, TEMPO_PARA_O_DEDO_MS);
  }, [estado]);

  /** Lê o dedo e procura o aluno entre as digitais da escola. */
  const identificar = useCallback(async (): Promise<ResultadoDaLeitura> => {
    try {
      if (!LeitorDigital || estado.situacao !== 'pronto' || !estado.dispositivo) {
        return { tipo: 'erro', mensagem: 'O leitor não está pronto.' };
      }
      const digitais = await digitaisDaEscola();
      if (digitais.length === 0) return { tipo: 'nao_reconhecido', semCadastros: true };
      const amostra = await LeitorDigital.capturar(estado.dispositivo.nome, TEMPO_PARA_O_DEDO_MS);
      const colunas = colunasDosTemplates(digitais);
      const achado = await LeitorDigital.identificar(
        estado.dispositivo.nome,
        amostra.template,
        amostra.formato,
        colunas.ids,
        colunas.templates,
        colunas.formatos
      );
      return achado ? { tipo: 'identificado', idAluno: achado.id_aluno } : { tipo: 'nao_reconhecido', semCadastros: false };
    } catch (erro) {
      return { tipo: 'erro', mensagem: erro instanceof Error && erro.message ? erro.message : mensagemDeErro(erro) };
    }
  }, [estado]);

  return { estado, atualizar, pedirPermissao, ler, identificar };
}

function lerEstado(): EstadoLeitor {
  if (!LeitorDigital) return estadoDoLeitor(false, [], FABRICANTES);
  try {
    return estadoDoLeitor(true, LeitorDigital.listarDispositivos(), FABRICANTES);
  } catch {
    return estadoDoLeitor(true, [], FABRICANTES);
  }
}
