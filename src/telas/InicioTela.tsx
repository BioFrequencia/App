import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { listarAlunos } from '../api/biometria';
import { mensagemDeErro } from '../api/client';
import { resumirAlunos, type ResumoEscola } from '../alunosRegras';
import { useMotorFacial } from '../face/MotorFacial';
import type { Navegacao } from '../navegacao';
import { Aviso, Cartao, Conteudo, Icone, Tela, useLayout, type NomeIcone } from '../ui/componentes';
import { dataPorExtenso, hojeNaEscola, primeiroNome } from '../ui/formatar';
import { cores, espaco, fontes, raio } from '../ui/tema';

/** Início: a situação do dia e as três funções principais. */
export default function InicioTela({ nav }: { nav: Navegacao }) {
  const { tablet } = useLayout();
  const motor = useMotorFacial();
  const [resumo, setResumo] = useState<ResumoEscola | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(async () => {
    setAtualizando(true);
    try {
      const resposta = await listarAlunos();
      if (resposta.sucesso && resposta.dados) {
        setResumo(resumirAlunos(resposta.dados));
        setErro(null);
      } else {
        setErro(resposta.mensagem);
      }
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setAtualizando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function confirmarSaida() {
    Alert.alert('Sair da conta', 'O aparelho deixa de registrar presenças até alguém da coordenação entrar de novo.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: nav.sair },
    ]);
  }

  const motorTexto = {
    pronto: 'Reconhecimento facial pronto',
    carregando: 'Preparando o reconhecimento facial…',
    erro: 'Reconhecimento facial com erro',
    indisponivel: 'Reconhecimento facial indisponível nesta plataforma',
  }[motor.estado];

  return (
    <Tela>
      <ScrollView refreshControl={<RefreshControl refreshing={atualizando} onRefresh={carregar} tintColor={cores.indigo} />}>
        <Conteudo style={estilos.conteudo}>
          <View style={estilos.topo}>
            <View style={estilos.flex}>
              <Text style={estilos.data}>{dataPorExtenso(hojeNaEscola())}</Text>
              <Text style={estilos.saudacao}>Olá, {primeiroNome(nav.sessao.nomeCoordenacao)}</Text>
              <Text style={estilos.escola}>{nav.sessao.nomeEscola}</Text>
            </View>
            <Pressable onPress={confirmarSaida} style={estilos.sair} accessibilityRole="button" accessibilityLabel="Sair da conta">
              <Icone nome="log-out" tamanho={18} cor={cores.tinta700} />
              <Text style={estilos.sairTexto}>Sair</Text>
            </Pressable>
          </View>

          {erro ? <Aviso tipo="erro" style={estilos.aviso}>{erro}</Aviso> : null}

          {/* No celular, "Presentes hoje" ocupa a linha inteira e os outros
              dois dividem a de baixo: três cartões lado a lado quebravam as
              palavras no meio. */}
          <View style={estilos.numeros}>
            <Numero rotulo="Presentes hoje" valor={resumo ? `${resumo.presentesHoje}` : '–'} total={resumo?.total} destaque linhaInteira={!tablet} />
            <Numero rotulo="Com biometria facial" valor={resumo ? `${resumo.comFacial}` : '–'} total={resumo?.total} />
            <Numero rotulo="Sem consentimento" valor={resumo ? `${resumo.semConsentimento}` : '–'} />
          </View>

          <View style={[estilos.acoes, tablet && estilos.acoesTablet]}>
            <Pressable
              onPress={() => nav.navegar({ nome: 'identificar' })}
              style={({ pressed }) => [estilos.principal, tablet && estilos.principalTablet, pressed && estilos.pressionado]}
              accessibilityRole="button"
            >
              <View style={estilos.principalIcone}>
                <Icone nome="mdi:face-recognition" tamanho={34} cor="#ffffff" />
              </View>
              <Text style={estilos.principalTitulo}>Identificar aluno</Text>
              <Text style={estilos.principalTexto}>Reconhece o rosto e registra a presença na hora, sem lançar à mão.</Text>
              <View style={estilos.motor}>
                <View style={[estilos.motorPonto, { backgroundColor: motor.estado === 'pronto' ? cores.esmeralda : motor.estado === 'carregando' ? cores.agua : cores.perigo }]} />
                <Text style={estilos.motorTexto}>{motorTexto}</Text>
              </View>
            </Pressable>

            <View style={[estilos.secundarias, tablet && estilos.secundariasTablet]}>
              <AcaoSecundaria
                icone="user-plus"
                titulo="Cadastrar biometria"
                texto="Rosto e digital de cada aluno, com o consentimento do responsável."
                aoPressionar={() => nav.navegar({ nome: 'alunos' })}
              />
              <AcaoSecundaria
                icone="list"
                titulo="Registros do dia"
                texto="Quem já chegou, a que horas e quem ainda falta."
                aoPressionar={() => nav.navegar({ nome: 'registros' })}
              />
            </View>
          </View>
        </Conteudo>
      </ScrollView>
    </Tela>
  );
}

function Numero({ rotulo, valor, total, destaque, linhaInteira }: { rotulo: string; valor: string; total?: number; destaque?: boolean; linhaInteira?: boolean }) {
  return (
    <Cartao style={[estilos.numero, destaque && estilos.numeroDestaque, linhaInteira && estilos.numeroLinhaInteira]}>
      <Text style={[estilos.numeroRotulo, destaque && estilos.numeroRotuloDestaque]}>{rotulo}</Text>
      <Text style={[estilos.numeroValor, destaque && estilos.numeroValorDestaque]}>
        {valor}
        {total !== undefined ? <Text style={[estilos.numeroTotal, destaque && estilos.numeroTotalDestaque]}> de {total}</Text> : null}
      </Text>
    </Cartao>
  );
}

function AcaoSecundaria({ icone, titulo, texto, aoPressionar }: { icone: NomeIcone; titulo: string; texto: string; aoPressionar: () => void }) {
  return (
    <Pressable onPress={aoPressionar} style={({ pressed }) => [estilos.secundaria, pressed && estilos.pressionado]} accessibilityRole="button">
      <View style={estilos.secundariaIcone}>
        <Icone nome={icone} tamanho={22} cor={cores.indigo} />
      </View>
      <View style={estilos.flex}>
        <Text style={estilos.secundariaTitulo}>{titulo}</Text>
        <Text style={estilos.secundariaTexto}>{texto}</Text>
      </View>
      <Icone nome="chevron-right" tamanho={20} cor={cores.tinta300} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  conteudo: { paddingTop: espaco.lg, paddingBottom: espaco.xxl },
  topo: { flexDirection: 'row', alignItems: 'flex-start', gap: espaco.md, marginBottom: espaco.xl },
  data: { fontFamily: fontes.textoSemi, fontSize: 12, color: cores.tinta500, textTransform: 'uppercase', letterSpacing: 0.8 },
  saudacao: { fontFamily: fontes.titulo, fontSize: 28, color: cores.tinta900, letterSpacing: -0.6, marginTop: 6 },
  escola: { fontFamily: fontes.textoMedio, fontSize: 15, color: cores.tinta500, marginTop: 2 },
  sair: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 999, borderWidth: 1, borderColor: cores.nevoa200, backgroundColor: cores.superficie,
  },
  sairTexto: { fontFamily: fontes.textoSemi, fontSize: 14, color: cores.tinta700 },
  aviso: { marginBottom: espaco.lg },
  numeros: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.md, marginBottom: espaco.xl },
  numero: { flex: 1, minWidth: 140, padding: espaco.lg, gap: 6 },
  numeroLinhaInteira: { flexBasis: '100%' },
  numeroDestaque: { backgroundColor: cores.esmeralda100, borderColor: cores.esmeralda100 },
  numeroRotulo: { fontFamily: fontes.textoSemi, fontSize: 12, color: cores.tinta500 },
  numeroRotuloDestaque: { color: cores.esmeraldaEscuro },
  numeroValor: { fontFamily: fontes.titulo, fontSize: 28, color: cores.tinta900 },
  numeroValorDestaque: { color: cores.esmeraldaEscuro },
  numeroTotal: { fontFamily: fontes.textoMedio, fontSize: 14, color: cores.tinta500 },
  numeroTotalDestaque: { color: cores.esmeraldaEscuro },
  acoes: { gap: espaco.lg },
  acoesTablet: { flexDirection: 'row', alignItems: 'stretch' },
  principal: { backgroundColor: cores.indigo, borderRadius: raio.grande, padding: espaco.xl, gap: espaco.sm },
  principalTablet: { flex: 1.15, justifyContent: 'flex-end', minHeight: 300 },
  pressionado: { opacity: 0.9, transform: [{ scale: 0.995 }] },
  principalIcone: {
    width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)', marginBottom: espaco.md,
  },
  principalTitulo: { fontFamily: fontes.titulo, fontSize: 26, color: '#ffffff', letterSpacing: -0.4 },
  principalTexto: { fontFamily: fontes.texto, fontSize: 15, lineHeight: 22, color: 'rgba(255,255,255,0.85)' },
  motor: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: espaco.md },
  motorPonto: { width: 8, height: 8, borderRadius: 4 },
  motorTexto: { fontFamily: fontes.textoMedio, fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  secundarias: { gap: espaco.lg },
  secundariasTablet: { flex: 1 },
  secundaria: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: espaco.lg, backgroundColor: cores.superficie,
    borderRadius: raio.grande, borderWidth: 1, borderColor: cores.nevoa200, padding: espaco.xl,
  },
  secundariaIcone: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.indigo50 },
  secundariaTitulo: { fontFamily: fontes.tituloMedio, fontSize: 18, color: cores.tinta900 },
  secundariaTexto: { fontFamily: fontes.texto, fontSize: 14, lineHeight: 20, color: cores.tinta500, marginTop: 2 },
});
