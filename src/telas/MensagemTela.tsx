import React, { useCallback, useEffect, useState } from 'react';
import { BackHandler, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';

import { mensagemDeErro } from '../api/client';
import { carregarContatos, carregarModelos, enviarMensagem, preverMensagem } from '../api/mensagens';
import {
  alternarDestino,
  avisoDosProvedores,
  destinosSugeridos,
  nomeDoCanal,
  novaChaveDeEnvio,
  problemaDaMensagem,
  rotuloComoSai,
  seloDoEnvio,
  tamanhoDaMensagem,
  temDestino,
  tituloDoEnvio,
} from '../mensagensRegras';
import type { Navegacao } from '../navegacao';
import type { AlunoBiometria, CanalMensagem, ContatosDoAluno, DestinoMensagem, EnvioDeMensagem, EnvioPrevisto, ModelosMensagem } from '../types';
import { Aviso, Botao, Cabecalho, Campo, Carregando, Cartao, Chip, Conteudo, Icone, Selo, Tela, TituloSecao, Vazio, estilosTexto, useLayout } from '../ui/componentes';
import { cores, espaco, fontes, raio } from '../ui/tema';

type Etapa = 'escrever' | 'previa' | 'resultado';

const CANAIS: CanalMensagem[] = ['whatsapp', 'email'];

/**
 * Mensagem da coordenação aos responsáveis de um aluno, como no site
 * (Notificações > Enviar mensagem): escolher quem recebe e por qual canal,
 * escrever ou partir de um modelo, conferir a prévia montada pela API e
 * enviar. Sem WhatsApp automático, o resultado traz o link para mandar do
 * próprio aparelho. A chave do envio vale para a mensagem da prévia: tocar
 * em "Enviar" de novo depois de uma falha de rede não manda duas vezes.
 */
export default function MensagemTela({ nav, aluno }: { nav: Navegacao; aluno: AlunoBiometria }) {
  const { tablet } = useLayout();
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [modelos, setModelos] = useState<ModelosMensagem | null>(null);
  const [contatos, setContatos] = useState<ContatosDoAluno | null>(null);
  const [destinos, setDestinos] = useState<DestinoMensagem[]>([]);
  const [texto, setTexto] = useState('');
  const [modeloAtivo, setModeloAtivo] = useState<string | null>(null);
  const [etapa, setEtapa] = useState<Etapa>('escrever');
  const [previa, setPrevia] = useState<EnvioPrevisto[]>([]);
  const [chave, setChave] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ dados: EnvioDeMensagem; mensagem: string } | null>(null);
  const [ocupado, setOcupado] = useState<'previa' | 'enviar' | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErroCarga(null);
    try {
      const [respostaModelos, respostaContatos] = await Promise.all([carregarModelos(), carregarContatos(aluno.id_aluno)]);
      if (!respostaModelos.sucesso || !respostaModelos.dados) {
        setErroCarga(respostaModelos.mensagem || 'Não foi possível carregar os modelos de mensagem.');
        return;
      }
      if (!respostaContatos.sucesso || !respostaContatos.dados) {
        setErroCarga(respostaContatos.mensagem || 'Não foi possível carregar os responsáveis do aluno.');
        return;
      }
      setModelos(respostaModelos.dados);
      setContatos(respostaContatos.dados);
      setDestinos(destinosSugeridos(respostaContatos.dados.responsaveis));
    } catch (e) {
      setErroCarga(mensagemDeErro(e, 'Não foi possível carregar os responsáveis do aluno.'));
    } finally {
      setCarregando(false);
    }
  }, [aluno.id_aluno]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Na prévia, o "voltar" do Android volta para o texto (e não perde a mensagem).
  useEffect(() => {
    if (etapa !== 'previa') return undefined;
    const assinatura = BackHandler.addEventListener('hardwareBackPress', () => {
      setEtapa('escrever');
      return true;
    });
    return () => assinatura.remove();
  }, [etapa]);

  function escolherModelo(modelo: { chave: string; texto: string }) {
    setModeloAtivo(modelo.chave);
    setTexto(modelo.texto);
    setErro(null);
  }

  function alternar(idResponsavel: number, canal: CanalMensagem) {
    setErro(null);
    setDestinos((atuais) => alternarDestino(atuais, { id_responsavel: idResponsavel, canal }));
  }

  async function verPrevia() {
    if (!modelos) return;
    const problema = problemaDaMensagem(texto, destinos, modelos.maximo);
    if (problema) {
      setErro(problema);
      return;
    }
    setErro(null);
    setOcupado('previa');
    try {
      const resposta = await preverMensagem(aluno.id_aluno, texto, destinos);
      if (!resposta.sucesso || !resposta.dados) {
        setErro(resposta.mensagem || 'Não foi possível montar a prévia.');
        return;
      }
      setPrevia(resposta.dados.envios);
      setChave(novaChaveDeEnvio());
      setEtapa('previa');
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível montar a prévia.'));
    } finally {
      setOcupado(null);
    }
  }

  async function enviar() {
    if (!chave) return;
    setErro(null);
    setOcupado('enviar');
    try {
      const resposta = await enviarMensagem(aluno.id_aluno, texto, destinos, chave);
      if (!resposta.sucesso || !resposta.dados) {
        setErro(resposta.mensagem || 'Não foi possível enviar a mensagem.');
        return;
      }
      setResultado({ dados: resposta.dados, mensagem: resposta.mensagem });
      setEtapa('resultado');
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível enviar. Toque em Enviar de novo: a mesma mensagem não sai duas vezes.'));
    } finally {
      setOcupado(null);
    }
  }

  async function abrirLink(link: string) {
    try {
      await Linking.openURL(link);
    } catch {
      setErro('Não foi possível abrir o WhatsApp neste aparelho.');
    }
  }

  let corpo: React.ReactNode;
  if (erroCarga || !modelos || !contatos) {
    corpo = (
      <>
        <Aviso tipo="erro">{erroCarga ?? 'Não foi possível carregar os responsáveis do aluno.'}</Aviso>
        <Botao titulo="Tentar de novo" icone="refresh-cw" variante="secundario" aoPressionar={carregar} />
      </>
    );
  } else if (contatos.responsaveis.length === 0) {
    corpo = (
      <Vazio
        icone="users"
        texto="Este aluno ainda não tem responsável cadastrado. Cadastre no site, em Responsáveis, para a escola conseguir avisar a família."
      />
    );
  } else if (etapa === 'resultado' && resultado) {
    const { dados, mensagem } = resultado;
    const nadaSaiu = dados.resumo.erros > 0 && dados.resumo.enviadas + dados.resumo.pendentes === 0;
    corpo = (
      <>
        <Text style={estilos.tituloResultado}>{tituloDoEnvio(dados.resumo)}</Text>
        <Aviso tipo={nadaSaiu ? 'erro' : dados.resumo.erros > 0 ? 'neutro' : 'sucesso'}>{mensagem}</Aviso>
        {dados.resultados.map((r) => {
          const selo = seloDoEnvio(r.status);
          return (
            <Cartao key={`${r.id_notificacao}-${r.id_responsavel}-${r.canal}`} style={estilos.cartao}>
              <TituloSecao acao={<Selo tipo={selo.tipo} texto={selo.texto} />}>{r.nome}</TituloSecao>
              <Text style={estilosTexto.fraco}>
                {nomeDoCanal(r.canal)} · {r.contato}
                {r.repetido ? ' · já tinha sido enviada' : ''}
              </Text>
              {r.status === 'pendente' && r.link ? (
                <Botao titulo="Abrir no WhatsApp" icone="external-link" variante="claro" aoPressionar={() => abrirLink(r.link as string)} />
              ) : null}
              {r.status === 'pendente' && !r.link ? <Text style={estilosTexto.fraco}>Fica na fila de Notificações do site.</Text> : null}
            </Cartao>
          );
        })}
        {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}
        <Botao titulo="Concluir" icone="check" aoPressionar={nav.voltar} />
      </>
    );
  } else if (etapa === 'previa') {
    corpo = (
      <>
        <Text style={estilosTexto.corpo}>Confira o que vai sair para cada responsável. Nada foi enviado ainda.</Text>
        {previa.map((envio) => (
          <Cartao key={`${envio.id_responsavel}-${envio.canal}`} style={estilos.cartao}>
            <TituloSecao
              acao={<Selo tipo="info" texto={nomeDoCanal(envio.canal)} icone={envio.canal === 'whatsapp' ? 'message-circle' : 'mail'} />}
            >
              {envio.parentesco ? `${envio.nome} (${envio.parentesco})` : envio.nome}
            </TituloSecao>
            <Text style={estilosTexto.fraco}>{envio.contato}</Text>
            {envio.assunto ? (
              <Text style={estilosTexto.corpo}>
                <Text style={estilosTexto.forte}>Assunto: </Text>
                {envio.assunto}
              </Text>
            ) : null}
            <View style={estilos.balao}>
              <Text style={estilosTexto.corpo}>{envio.mensagem}</Text>
            </View>
            <View style={estilos.como}>
              <Icone nome={envio.como === 'automatico' ? 'zap' : envio.como === 'link' ? 'link' : 'clock'} tamanho={16} cor={cores.tinta500} />
              <Text style={[estilosTexto.fraco, estilos.flex]}>{rotuloComoSai(envio.canal, envio.como)}</Text>
            </View>
          </Cartao>
        ))}
        {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}
        <View style={tablet ? estilos.botoesLinha : estilos.botoes}>
          <Botao
            titulo="Voltar e editar"
            icone="edit-2"
            variante="secundario"
            desabilitado={ocupado === 'enviar'}
            aoPressionar={() => {
              setErro(null);
              setEtapa('escrever');
            }}
            style={tablet ? estilos.flex : undefined}
          />
          <Botao titulo="Enviar" icone="send" carregando={ocupado === 'enviar'} aoPressionar={enviar} style={tablet ? estilos.flex : undefined} />
        </View>
      </>
    );
  } else {
    const aviso = avisoDosProvedores(modelos.provedores);
    const paraQuem = (
      <Cartao style={estilos.cartao}>
        <TituloSecao>Para quem</TituloSecao>
        {contatos.responsaveis.map((r, indice) => (
          <View key={r.id_responsavel} style={[estilos.responsavel, indice > 0 && estilos.separador]}>
            <View style={estilos.flex}>
              <Text style={estilosTexto.forte}>{r.nome}</Text>
              {r.parentesco ? <Text style={estilosTexto.fraco}>{r.parentesco}</Text> : null}
            </View>
            <View style={estilos.canais}>
              {CANAIS.map((canal) =>
                (canal === 'whatsapp' ? r.whatsapp : r.email_disponivel) ? (
                  <Chip
                    key={canal}
                    texto={nomeDoCanal(canal)}
                    ativo={temDestino(destinos, r.id_responsavel, canal)}
                    aoPressionar={() => alternar(r.id_responsavel, canal)}
                  />
                ) : (
                  <Text key={canal} style={estilos.semCanal}>
                    {canal === 'whatsapp' ? 'Sem WhatsApp' : 'Sem e-mail'}
                  </Text>
                )
              )}
            </View>
          </View>
        ))}
        {aviso ? <Aviso tipo="neutro">{aviso}</Aviso> : null}
      </Cartao>
    );
    const variaveis = modelos.variaveis.map((v) => v.variavel).join(', ');
    const escrever = (
      <Cartao style={estilos.cartao}>
        <TituloSecao>Mensagem</TituloSecao>
        <View style={estilos.modelos}>
          {modelos.modelos.map((modelo) => (
            <Chip key={modelo.chave} texto={modelo.titulo} ativo={modeloAtivo === modelo.chave} aoPressionar={() => escolherModelo(modelo)} />
          ))}
        </View>
        <Campo
          rotulo="Texto"
          placeholder="Escreva a mensagem ou escolha um modelo"
          multiline
          textAlignVertical="top"
          value={texto}
          onChangeText={(novo) => {
            setTexto(novo);
            setErro(null);
          }}
          editable={ocupado === null}
          style={estilos.texto}
          ajuda={`${tamanhoDaMensagem(texto)} de ${modelos.maximo} caracteres. Dá para usar ${variaveis}; a prévia mostra o texto final.`}
        />
        {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}
        <Botao titulo="Ver a prévia" icone="eye" grande carregando={ocupado === 'previa'} aoPressionar={verPrevia} />
      </Cartao>
    );
    corpo = tablet ? (
      <View style={estilos.colunas}>
        <View style={estilos.coluna}>{paraQuem}</View>
        <View style={estilos.coluna}>{escrever}</View>
      </View>
    ) : (
      <>
        {paraQuem}
        {escrever}
      </>
    );
  }

  return (
    <Tela>
      <Conteudo style={estilos.flex}>
        <Cabecalho
          titulo="Enviar mensagem"
          subtitulo={`${aluno.nome_aluno} · ${aluno.nome_sala}`}
          aoVoltar={etapa === 'previa' ? () => setEtapa('escrever') : nav.voltar}
        />
        {carregando ? (
          <Carregando texto="Carregando os responsáveis…" />
        ) : (
          <ScrollView contentContainerStyle={estilos.rolagem} keyboardShouldPersistTaps="handled">
            {corpo}
          </ScrollView>
        )}
      </Conteudo>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  rolagem: { gap: espaco.lg, paddingBottom: espaco.xxl },
  colunas: { flexDirection: 'row', gap: espaco.lg, alignItems: 'flex-start' },
  coluna: { flex: 1, gap: espaco.lg },
  cartao: { gap: espaco.md },
  responsavel: { flexDirection: 'row', alignItems: 'center', gap: espaco.md, paddingVertical: espaco.sm },
  separador: { borderTopWidth: 1, borderTopColor: cores.nevoa200 },
  canais: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: espaco.sm },
  semCanal: { fontFamily: fontes.texto, fontSize: 12, color: cores.tinta500 },
  modelos: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm },
  texto: { minHeight: 150, paddingTop: espaco.md, paddingBottom: espaco.md },
  balao: { backgroundColor: cores.nevoa100, borderRadius: raio.medio, padding: espaco.md, borderLeftWidth: 3, borderLeftColor: cores.indigo },
  como: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm },
  botoes: { gap: espaco.md },
  botoesLinha: { flexDirection: 'row', gap: espaco.md },
  tituloResultado: { fontFamily: fontes.titulo, fontSize: 22, color: cores.tinta900, letterSpacing: -0.3 },
});
