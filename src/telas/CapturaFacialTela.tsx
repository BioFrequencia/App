import React, { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { CameraView } from 'expo-camera';

import { cadastrarFacial } from '../api/biometria';
import { mensagemDeErro, SessaoExpiradaError } from '../api/client';
import { fotografar } from '../face/captura';
import { useMotorFacial } from '../face/MotorFacial';
import { textoDaFalha } from '../face/protocolo';
import type { Navegacao } from '../navegacao';
import type { AlunoBiometria } from '../types';
import { Aviso, Botao, Cabecalho, Cartao, Conteudo, Icone, Tela, useLayout } from '../ui/componentes';
import { cores, espaco, fontes } from '../ui/tema';
import { CameraComGuia } from './CameraComGuia';

/** As três fotos do cadastro: pequenas variações deixam o reconhecimento mais firme. */
const PASSOS = [
  'Olhe direto para a câmera',
  'Vire o rosto um pouco para a esquerda',
  'Vire o rosto um pouco para a direita',
];

type Situacao =
  | { tipo: 'capturando' }
  | { tipo: 'enviando' }
  | { tipo: 'duplicado'; mensagem: string }
  | { tipo: 'concluido' };

/** Cadastro do rosto de um aluno (com o consentimento já registrado). */
export default function CapturaFacialTela({ nav, aluno }: { nav: Navegacao; aluno: AlunoBiometria }) {
  const { tablet } = useLayout();
  const motor = useMotorFacial();
  const camera = useRef<CameraView>(null);
  const [amostras, setAmostras] = useState<number[][]>([]);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [situacao, setSituacao] = useState<Situacao>({ tipo: 'capturando' });

  async function enviar(vetores: number[][], confirmarDuplicado = false) {
    setSituacao({ tipo: 'enviando' });
    setErro(null);
    try {
      const resposta = await cadastrarFacial(aluno.id_aluno, vetores, confirmarDuplicado);
      if (resposta.sucesso) {
        setSituacao({ tipo: 'concluido' });
      } else if (resposta.dados?.duplicado) {
        setSituacao({ tipo: 'duplicado', mensagem: resposta.mensagem });
      } else {
        setErro(resposta.mensagem);
        setSituacao({ tipo: 'capturando' });
      }
    } catch (e) {
      if (!(e instanceof SessaoExpiradaError)) {
        setErro(mensagemDeErro(e, 'Não foi possível salvar o cadastro. Tente de novo.'));
        setSituacao({ tipo: 'capturando' });
      }
    }
  }

  async function capturar() {
    if (!camera.current || processando) return;
    setErro(null);
    setProcessando(true);
    try {
      const rosto = await motor.processar(await fotografar(camera.current));
      if (!rosto.ok) {
        setErro(textoDaFalha(rosto.motivo));
        return;
      }
      const novas = [...amostras, rosto.descritor];
      setAmostras(novas);
      if (novas.length === PASSOS.length) {
        await enviar(novas);
      }
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível tirar a foto. Tente de novo.'));
    } finally {
      setProcessando(false);
    }
  }

  function recomecar() {
    setAmostras([]);
    setErro(null);
    setSituacao({ tipo: 'capturando' });
  }

  const passoAtual = Math.min(amostras.length, PASSOS.length - 1);

  if (situacao.tipo === 'concluido') {
    return (
      <Tela>
        <Conteudo style={estilos.centro}>
          <Cartao style={estilos.final}>
            <View style={[estilos.finalIcone, { backgroundColor: cores.esmeralda100 }]}>
              <Icone nome="check" tamanho={38} cor={cores.esmeraldaEscuro} />
            </View>
            <Text style={estilos.finalTitulo}>Biometria facial cadastrada</Text>
            <Text style={estilos.finalTexto}>{aluno.nome_aluno} já pode ser identificado na entrada.</Text>
            <Botao titulo="Concluir" icone="check" grande aoPressionar={nav.voltar} style={estilos.largo} />
          </Cartao>
        </Conteudo>
      </Tela>
    );
  }

  const painel = (
    <View style={[estilos.painel, tablet && estilos.painelTablet]}>
      <Cartao style={estilos.passos}>
        <Text style={estilos.passosTitulo}>Foto {Math.min(amostras.length + 1, PASSOS.length)} de {PASSOS.length}</Text>
        {PASSOS.map((passo, indice) => {
          const feito = indice < amostras.length;
          const atual = indice === amostras.length;
          return (
            <View key={passo} style={estilos.passo}>
              <View style={[estilos.passoMarca, feito && estilos.passoFeito, atual && estilos.passoAtual]}>
                {feito ? <Icone nome="check" tamanho={14} cor="#ffffff" /> : <Text style={[estilos.passoNumero, atual && estilos.passoNumeroAtual]}>{indice + 1}</Text>}
              </View>
              <Text style={[estilos.passoTexto, atual && estilos.passoTextoAtual]}>{passo}</Text>
            </View>
          );
        })}
      </Cartao>

      {situacao.tipo === 'duplicado' ? (
        <Cartao style={estilos.duplicado}>
          <Aviso tipo="erro">{situacao.mensagem}</Aviso>
          <Botao titulo="Recomeçar as fotos" icone="rotate-ccw" aoPressionar={recomecar} />
          <Botao
            titulo="É o aluno certo, cadastrar assim mesmo"
            variante="secundario"
            aoPressionar={() => enviar(amostras, true)}
          />
        </Cartao>
      ) : null}

      {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}
      {motor.estado !== 'pronto' ? (
        <Aviso tipo="info">{motor.estado === 'carregando' ? 'Preparando o reconhecimento facial…' : 'O reconhecimento facial não está disponível agora.'}</Aviso>
      ) : null}

      {situacao.tipo !== 'duplicado' ? (
        <Botao
          titulo={situacao.tipo === 'enviando' ? 'Salvando…' : processando ? 'Analisando…' : 'Tirar foto'}
          icone="camera"
          grande
          carregando={processando || situacao.tipo === 'enviando'}
          desabilitado={motor.estado !== 'pronto'}
          aoPressionar={capturar}
        />
      ) : null}
    </View>
  );

  return (
    <Tela>
      <Conteudo style={estilos.flex}>
        <Cabecalho titulo="Cadastro facial" subtitulo={`${aluno.nome_aluno} · ${aluno.nome_sala}`} aoVoltar={nav.voltar} />
        <View style={[estilos.area, tablet && estilos.areaTablet]}>
          <View style={[estilos.camera, tablet && estilos.cameraTablet]}>
            <CameraComGuia ref={camera} instrucao={PASSOS[passoAtual]} />
          </View>
          {painel}
        </View>
      </Conteudo>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  centro: { flex: 1, justifyContent: 'center' },
  area: { flex: 1, gap: espaco.lg, paddingBottom: espaco.lg },
  areaTablet: { flexDirection: 'row' },
  camera: { flex: 1, minHeight: 300 },
  cameraTablet: { flex: 1.35 },
  painel: { gap: espaco.md },
  painelTablet: { flex: 1, justifyContent: 'flex-end' },
  passos: { gap: espaco.md },
  passosTitulo: { fontFamily: fontes.tituloMedio, fontSize: 18, color: cores.tinta900 },
  passo: { flexDirection: 'row', alignItems: 'center', gap: espaco.md },
  passoMarca: {
    width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: cores.nevoa200, backgroundColor: cores.superficie,
  },
  passoFeito: { backgroundColor: cores.esmeraldaEscuro, borderColor: cores.esmeraldaEscuro },
  passoAtual: { borderColor: cores.indigo, borderWidth: 2 },
  passoNumero: { fontFamily: fontes.textoSemi, fontSize: 12, color: cores.tinta500 },
  passoNumeroAtual: { color: cores.indigo },
  passoTexto: { flex: 1, fontFamily: fontes.texto, fontSize: 15, color: cores.tinta500 },
  passoTextoAtual: { fontFamily: fontes.textoSemi, color: cores.tinta900 },
  duplicado: { gap: espaco.md },
  final: { alignItems: 'center', gap: espaco.md, padding: espaco.xxl, maxWidth: 480, alignSelf: 'center', width: '100%' },
  finalIcone: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center' },
  finalTitulo: { fontFamily: fontes.titulo, fontSize: 24, color: cores.tinta900, textAlign: 'center' },
  finalTexto: { fontFamily: fontes.texto, fontSize: 15, color: cores.tinta500, textAlign: 'center' },
  largo: { alignSelf: 'stretch', marginTop: espaco.md },
});
