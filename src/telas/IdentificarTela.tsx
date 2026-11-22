import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { CameraView } from 'expo-camera';

import { confirmarIdentificacao, FOTOS_POR_IDENTIFICACAO, identificarFacial } from '../api/biometria';
import { mensagemDeErro, SessaoExpiradaError } from '../api/client';
import { desfazerPresenca } from '../api/presenca';
import { fotografar } from '../face/captura';
import { useMotorFacial } from '../face/MotorFacial';
import { textoDaRecusa } from '../face/protocolo';
import {
  CONFIRMACAO_EXPIRADA,
  resultadoDaConfirmacao,
  resultadoDaIdentificacao,
  resultadoDoDesfazer,
  tempoNaTela,
  type ResultadoTela,
} from '../identificacaoRegras';
import type { Navegacao } from '../navegacao';
import { Aviso, Botao, Cabecalho, Cartao, Conteudo, Icone, Tela, useLayout, type NomeIcone } from '../ui/componentes';
import { formatarHora } from '../ui/formatar';
import { cores, espaco, fontes, raio } from '../ui/tema';
import { CameraComGuia } from './CameraComGuia';

type Metodo = 'facial' | 'digital';
type Confirmacao = Extract<ResultadoTela, { tipo: 'confirmar' }>;
type PresencaNova = Extract<ResultadoTela, { tipo: 'registrada' | 'atrasada' }>;

/**
 * Identificação do aluno na chegada. Facial: tira duas fotos seguidas, o
 * motor calcula os vetores no aparelho e a API procura o aluno entre os da
 * escola. Com certeza, a presença já fica registrada (e dá para desfazer na
 * hora se o nome não for o do aluno); com dúvida, nada é gravado até quem
 * está no tablet confirmar quem é. Digital: depende do leitor USB (ver o
 * cartão explicativo).
 */
export default function IdentificarTela({ nav }: { nav: Navegacao }) {
  const { tablet } = useLayout();
  const motor = useMotorFacial();
  const camera = useRef<CameraView>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [metodo, setMetodo] = useState<Metodo>('facial');
  const [processando, setProcessando] = useState(false);
  const [etapa, setEtapa] = useState<string | null>(null);
  const [respondendo, setRespondendo] = useState(false);
  const [resultado, setResultado] = useState<ResultadoTela | null>(null);

  useEffect(() => () => {
    if (temporizador.current) clearTimeout(temporizador.current);
  }, []);

  function pararTemporizador() {
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = null;
  }

  function mostrar(novo: ResultadoTela) {
    pararTemporizador();
    setResultado(novo);
    const tempo = tempoNaTela(novo);
    if (tempo !== null) {
      // A confirmação sem resposta vence: nada foi gravado, e a tela diz isso.
      temporizador.current = setTimeout(() => setResultado(novo.tipo === 'confirmar' ? CONFIRMACAO_EXPIRADA : null), tempo);
    }
  }

  async function identificar() {
    if (!camera.current || processando) return;
    pararTemporizador();
    setResultado(null);
    setProcessando(true);
    try {
      // Fotos seguidas do mesmo aluno: a API só grava sozinha se todas
      // apontarem a mesma pessoa. Se a 2ª foto não servir, vai só a 1ª (a
      // API é mais exigente com uma foto só).
      const descritores: number[][] = [];
      for (let numero = 1; numero <= FOTOS_POR_IDENTIFICACAO; numero++) {
        if (!camera.current) return;
        setEtapa(`Fique parado: foto ${numero} de ${FOTOS_POR_IDENTIFICACAO}`);
        const rosto = await motor.processar(await fotografar(camera.current));
        if (!rosto.ok) {
          if (descritores.length === 0) {
            mostrar({ tipo: 'foto', texto: textoDaRecusa(rosto) });
            return;
          }
          break;
        }
        descritores.push(rosto.descritor);
      }
      setEtapa('Reconhecendo…');
      mostrar(resultadoDaIdentificacao(await identificarFacial(descritores)));
    } catch (e) {
      if (!(e instanceof SessaoExpiradaError)) {
        mostrar({ tipo: 'erro', texto: mensagemDeErro(e, 'Não foi possível identificar. Tente de novo.') });
      }
    } finally {
      setProcessando(false);
      setEtapa(null);
    }
  }

  /** "É este aluno?": sim grava a presença do aluno guardado pela API; não, nada. */
  async function responder(confirmacao: Confirmacao, confirmar: boolean) {
    if (respondendo) return;
    pararTemporizador();
    setRespondendo(true);
    try {
      mostrar(resultadoDaConfirmacao(await confirmarIdentificacao(confirmacao.idIdentificacao, confirmar)));
    } catch (e) {
      if (!(e instanceof SessaoExpiradaError)) {
        mostrar({ tipo: 'erro', titulo: 'Não foi possível confirmar', texto: mensagemDeErro(e, 'Não foi possível confirmar. Tente de novo.') });
      }
    } finally {
      setRespondendo(false);
    }
  }

  /** "Não é este aluno": cancela a presença que acabou de ser gravada para ele. */
  async function desfazer(presenca: PresencaNova) {
    if (respondendo) return;
    pararTemporizador();
    setRespondendo(true);
    try {
      mostrar(resultadoDoDesfazer(await desfazerPresenca(presenca.idPresenca), presenca.nome));
    } catch (e) {
      if (!(e instanceof SessaoExpiradaError)) {
        mostrar({
          tipo: 'erro',
          titulo: 'Não foi possível desfazer',
          texto: mensagemDeErro(e, 'Não foi possível desfazer. Peça à gestão da escola para cancelar a presença pelo site.'),
        });
      }
    } finally {
      setRespondendo(false);
    }
  }

  const painel = (
    <View style={[estilos.painel, tablet && estilos.painelTablet]}>
      {resultado ? (
        <CartaoResultado
          resultado={resultado}
          respondendo={respondendo}
          aoTentarDeNovo={() => {
            pararTemporizador();
            setResultado(null);
          }}
          aoRegistrarManual={() => nav.navegar({ nome: 'registros' })}
          aoConfirmar={responder}
          aoDesfazer={desfazer}
        />
      ) : (
        <Cartao style={estilos.orientacao}>
          <Text style={estilos.orientacaoTitulo}>{processando ? (etapa ?? 'Reconhecendo…') : 'Pronto para o próximo aluno'}</Text>
          <Text style={estilos.orientacaoTexto}>
            Um aluno por vez, de frente para a câmera, com o rosto dentro do contorno. O app tira duas fotos seguidas:
            com certeza, a presença é registrada na hora; com dúvida, ele pergunta quem é antes de registrar.
          </Text>
        </Cartao>
      )}

      {motor.estado !== 'pronto' ? (
        <Aviso tipo={motor.estado === 'carregando' ? 'info' : 'erro'}>
          {motor.estado === 'carregando'
            ? 'Preparando o reconhecimento facial… leva alguns segundos ao abrir o app.'
            : motor.estado === 'indisponivel'
              ? 'O reconhecimento facial roda no app Android. Nesta prévia ele não está disponível.'
              : `O reconhecimento facial não carregou${motor.detalhe ? ` (${motor.detalhe})` : ''}.`}
        </Aviso>
      ) : null}
      {motor.estado === 'erro' ? <Botao titulo="Recarregar o reconhecimento" variante="secundario" icone="refresh-cw" aoPressionar={motor.reiniciar} /> : null}

      <Botao
        titulo={processando ? 'Reconhecendo…' : 'Identificar'}
        icone="mdi:face-recognition"
        grande
        carregando={processando}
        desabilitado={motor.estado !== 'pronto'}
        aoPressionar={identificar}
      />
    </View>
  );

  return (
    <Tela>
      <Conteudo style={estilos.flex}>
        <Cabecalho
          titulo="Identificar aluno"
          subtitulo={nav.sessao.nomeEscola}
          aoVoltar={nav.voltar}
          direita={tablet ? <SeletorMetodo metodo={metodo} aoMudar={setMetodo} /> : undefined}
        />
        {/* No celular o seletor vai para baixo do título, que senão era cortado. */}
        {!tablet ? (
          <View style={estilos.seletorCelular}>
            <SeletorMetodo metodo={metodo} aoMudar={setMetodo} />
          </View>
        ) : null}
        {metodo === 'digital' ? (
          <SemLeitor aoRegistrarManual={() => nav.navegar({ nome: 'registros' })} />
        ) : (
          <View style={[estilos.area, tablet && estilos.areaTablet]}>
            <View style={[estilos.camera, tablet && estilos.cameraTablet]}>
              <CameraComGuia ref={camera} instrucao="Rosto dentro do contorno" />
            </View>
            {painel}
          </View>
        )}
      </Conteudo>
    </Tela>
  );
}

function SeletorMetodo({ metodo, aoMudar }: { metodo: Metodo; aoMudar: (m: Metodo) => void }) {
  const opcoes: { valor: Metodo; texto: string; icone: NomeIcone }[] = [
    { valor: 'facial', texto: 'Facial', icone: 'mdi:face-recognition' },
    { valor: 'digital', texto: 'Digital', icone: 'mdi:fingerprint' },
  ];
  return (
    <View style={estilos.seletor} accessibilityRole="tablist">
      {opcoes.map((opcao) => {
        const ativo = opcao.valor === metodo;
        return (
          <Pressable
            key={opcao.valor}
            onPress={() => aoMudar(opcao.valor)}
            style={[estilos.seletorOpcao, ativo && estilos.seletorOpcaoAtiva]}
            accessibilityRole="tab"
            accessibilityState={{ selected: ativo }}
          >
            <Icone nome={opcao.icone} tamanho={16} cor={ativo ? '#ffffff' : cores.tinta700} />
            <Text style={[estilos.seletorTexto, ativo && estilos.seletorTextoAtivo]}>{opcao.texto}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const VISUAL_RESULTADO: Record<ResultadoTela['tipo'], { fundo: string; cor: string; icone: NomeIcone; titulo: string }> = {
  registrada: { fundo: cores.esmeralda100, cor: cores.esmeraldaEscuro, icone: 'check-circle', titulo: 'Presença registrada' },
  atrasada: { fundo: cores.aviso100, cor: cores.avisoEscuro, icone: 'clock', titulo: 'Entrada atrasada registrada' },
  ja_registrada: { fundo: cores.indigo50, cor: cores.indigo600, icone: 'clock', titulo: 'Presença já registrada hoje' },
  confirmar: { fundo: cores.aviso100, cor: cores.avisoEscuro, icone: 'help-circle', titulo: 'Confirme quem é o aluno' },
  nada_registrado: { fundo: cores.indigo50, cor: cores.indigo600, icone: 'info', titulo: 'Nada foi registrado' },
  nao_reconhecido: { fundo: cores.perigo100, cor: cores.perigoEscuro, icone: 'x-circle', titulo: 'Aluno não reconhecido' },
  foto: { fundo: cores.agua100, cor: cores.aguaEscuro, icone: 'alert-triangle', titulo: 'A foto não serviu' },
  erro: { fundo: cores.perigo100, cor: cores.perigoEscuro, icone: 'alert-circle', titulo: 'Não foi possível identificar' },
};

function CartaoResultado({
  resultado,
  respondendo,
  aoTentarDeNovo,
  aoRegistrarManual,
  aoConfirmar,
  aoDesfazer,
}: {
  resultado: ResultadoTela;
  respondendo: boolean;
  aoTentarDeNovo: () => void;
  aoRegistrarManual: () => void;
  aoConfirmar: (confirmacao: Confirmacao, confirmar: boolean) => void;
  aoDesfazer: (presenca: PresencaNova) => void;
}) {
  const visual = VISUAL_RESULTADO[resultado.tipo];
  const titulo = resultado.tipo === 'erro' && resultado.titulo ? resultado.titulo : visual.titulo;
  const reconhecido = resultado.tipo === 'registrada' || resultado.tipo === 'atrasada' || resultado.tipo === 'ja_registrada';
  return (
    <View style={[estilos.resultado, { backgroundColor: visual.fundo }]} accessibilityLiveRegion="polite">
      <View style={estilos.resultadoTopo}>
        <Icone nome={visual.icone} tamanho={30} cor={visual.cor} />
        <Text style={[estilos.resultadoTitulo, { color: visual.cor }]}>{titulo}</Text>
      </View>
      {resultado.tipo === 'confirmar' ? (
        <>
          <Text style={[estilos.resultadoTexto, { color: visual.cor }]}>Nada foi registrado ainda. Confira o rosto: é este aluno?</Text>
          <Text style={estilos.resultadoNome}>{resultado.nome}</Text>
          <Text style={[estilos.resultadoDetalhe, { color: visual.cor }]}>{resultado.turma}</Text>
          <Text style={[estilos.resultadoMotivo, { color: visual.cor }]}>{resultado.motivo}</Text>
          <View style={estilos.resultadoAcoesColuna}>
            <Botao titulo="Sim, é este aluno" icone="check" carregando={respondendo} aoPressionar={() => aoConfirmar(resultado, true)} />
            <Botao titulo="Não é" variante="secundario" icone="x" desabilitado={respondendo} aoPressionar={() => aoConfirmar(resultado, false)} />
          </View>
        </>
      ) : reconhecido ? (
        <>
          <Text style={estilos.resultadoNome}>{resultado.nome}</Text>
          <Text style={[estilos.resultadoDetalhe, { color: visual.cor }]}>
            {resultado.turma} · {resultado.tipo === 'ja_registrada' ? 'registrada às' : 'às'} {formatarHora(resultado.registradaEm)}
          </Text>
          {resultado.tipo === 'atrasada' ? (
            <Text style={[estilos.resultadoDetalhe, { color: visual.cor }]}>
              A aula começa às {resultado.inicioAula} (tolerância de {resultado.tolerancia} min).
            </Text>
          ) : null}
          {(resultado.tipo === 'registrada' || resultado.tipo === 'atrasada') && resultado.podeDesfazer ? (
            <Botao
              titulo="Não é este aluno"
              variante="secundario"
              icone="x"
              carregando={respondendo}
              aoPressionar={() => aoDesfazer(resultado)}
              style={estilos.resultadoDesfazer}
            />
          ) : null}
        </>
      ) : (
        <>
          <Text style={[estilos.resultadoTexto, { color: visual.cor }]}>
            {resultado.tipo === 'nao_reconhecido'
              ? `${resultado.motivo ? `${resultado.motivo} ` : ''}Peça para o aluno olhar de frente para a câmera, com boa luz, e tente de novo. Se continuar, registre a presença manualmente.`
              : resultado.texto}
          </Text>
          <View style={estilos.resultadoAcoes}>
            <Botao titulo="Tentar de novo" icone="rotate-ccw" aoPressionar={aoTentarDeNovo} style={estilos.flex} />
            {resultado.tipo === 'nao_reconhecido' || resultado.tipo === 'nada_registrado' ? (
              <Botao titulo="Registro manual" variante="secundario" icone="edit-3" aoPressionar={aoRegistrarManual} style={estilos.flex} />
            ) : null}
          </View>
        </>
      )}
    </View>
  );
}

function SemLeitor({ aoRegistrarManual }: { aoRegistrarManual: () => void }) {
  return (
    <Cartao style={estilos.semLeitor}>
      <View style={estilos.semLeitorIcone}>
        <Icone nome="mdi:fingerprint" tamanho={40} cor={cores.indigo} />
      </View>
      <Text style={estilos.semLeitorTitulo}>Leitor de digital não conectado</Text>
      <Text style={estilos.semLeitorTexto}>
        A identificação pela digital usa um leitor USB compatível ligado ao tablet. O sensor do próprio celular não
        serve: o Android só confirma o dono do aparelho e não deixa o app ler a digital de outras pessoas.
      </Text>
      <Text style={estilos.semLeitorTexto}>
        O sistema já guarda as digitais cifradas e registra a presença pela digital; falta integrar o modelo de leitor
        escolhido pela escola. Enquanto isso, use o reconhecimento facial ou o registro manual.
      </Text>
      <Botao titulo="Registrar presença manualmente" variante="secundario" icone="edit-3" aoPressionar={aoRegistrarManual} />
    </Cartao>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  area: { flex: 1, gap: espaco.lg, paddingBottom: espaco.lg },
  areaTablet: { flexDirection: 'row' },
  camera: { flex: 1, minHeight: 320 },
  cameraTablet: { flex: 1.35 },
  painel: { gap: espaco.md },
  painelTablet: { flex: 1, justifyContent: 'flex-end' },
  orientacao: { gap: 6 },
  orientacaoTitulo: { fontFamily: fontes.tituloMedio, fontSize: 18, color: cores.tinta900 },
  orientacaoTexto: { fontFamily: fontes.texto, fontSize: 14, lineHeight: 20, color: cores.tinta500 },
  seletor: { flexDirection: 'row', backgroundColor: cores.superficie, borderRadius: 999, borderWidth: 1, borderColor: cores.nevoa200, padding: 3 },
  seletorCelular: { alignItems: 'flex-start', marginBottom: espaco.md },
  seletorOpcao: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  seletorOpcaoAtiva: { backgroundColor: cores.indigo },
  seletorTexto: { fontFamily: fontes.textoSemi, fontSize: 13, color: cores.tinta700 },
  seletorTextoAtivo: { color: '#ffffff' },
  resultado: { borderRadius: raio.grande, padding: espaco.xl, gap: 6 },
  resultadoTopo: { flexDirection: 'row', alignItems: 'center', gap: espaco.md, marginBottom: espaco.sm },
  resultadoTitulo: { fontFamily: fontes.tituloMedio, fontSize: 18 },
  resultadoNome: { fontFamily: fontes.titulo, fontSize: 28, color: cores.tinta900, letterSpacing: -0.5 },
  resultadoDetalhe: { fontFamily: fontes.textoSemi, fontSize: 16 },
  resultadoTexto: { fontFamily: fontes.textoMedio, fontSize: 15, lineHeight: 21 },
  resultadoAcoes: { flexDirection: 'row', gap: espaco.md, marginTop: espaco.md },
  resultadoAcoesColuna: { gap: espaco.sm, marginTop: espaco.md },
  resultadoMotivo: { fontFamily: fontes.texto, fontSize: 14, lineHeight: 20, marginTop: espaco.xs },
  resultadoDesfazer: { marginTop: espaco.md },
  semLeitor: { alignItems: 'center', gap: espaco.md, padding: espaco.xxl, marginTop: espaco.lg },
  semLeitorIcone: { width: 76, height: 76, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.indigo50 },
  semLeitorTitulo: { fontFamily: fontes.titulo, fontSize: 22, color: cores.tinta900, textAlign: 'center' },
  semLeitorTexto: { fontFamily: fontes.texto, fontSize: 15, lineHeight: 22, color: cores.tinta500, textAlign: 'center', maxWidth: 560 },
});
