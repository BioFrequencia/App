import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { listarTurmas } from '../api/coordenacao';
import { mensagemDeErro } from '../api/client';
import { listarPresencas, registrarPresencaManual } from '../api/presenca';
import type { Navegacao } from '../navegacao';
import type { AlunoResumo, MetodoPresenca, PresencasDoDia, Turma } from '../types';
import { Aviso, Avatar, Cabecalho, Carregando, Cartao, Chip, Conteudo, Icone, Selo, Tela, TituloSecao, Vazio, useLayout, type NomeIcone } from '../ui/componentes';
import { dataPorExtenso, formatarHora, hojeNaEscola, somarDias } from '../ui/formatar';
import { cores, espaco, fontes } from '../ui/tema';

/** "sexta-feira, 30 de outubro" -> "Sexta-feira, 30 de outubro" (capitalize mexeria no "de"). */
function maiusculaInicial(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

const METODO: Record<MetodoPresenca, { texto: string; icone: NomeIcone }> = {
  facial: { texto: 'Facial', icone: 'mdi:face-recognition' },
  digital: { texto: 'Digital', icone: 'mdi:fingerprint' },
  manual: { texto: 'Manual', icone: 'edit-3' },
};

/** Registros do dia: presentes (com horário e forma) e quem ainda não chegou. */
export default function RegistrosTela({ nav }: { nav: Navegacao }) {
  const { tablet } = useLayout();
  const hoje = hojeNaEscola();
  const [data, setData] = useState(hoje);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [turma, setTurma] = useState<number | null>(null);
  const [dia, setDia] = useState<PresencasDoDia | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [atualizando, setAtualizando] = useState(false);
  const [registrando, setRegistrando] = useState<number | null>(null);

  const carregar = useCallback(async () => {
    setAtualizando(true);
    try {
      const resposta = await listarPresencas(data, turma);
      if (resposta.sucesso && resposta.dados) {
        setDia(resposta.dados);
        setErro(null);
      } else {
        setErro(resposta.mensagem);
      }
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setAtualizando(false);
    }
  }, [data, turma]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    listarTurmas()
      .then((resposta) => setTurmas(resposta.dados ?? []))
      .catch(() => undefined);
  }, []);

  function confirmarManual(aluno: AlunoResumo) {
    Alert.alert('Registrar presença', `Registrar a presença de ${aluno.nome_aluno} agora, sem biometria?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Registrar',
        onPress: async () => {
          setRegistrando(aluno.id_aluno);
          try {
            const resposta = await registrarPresencaManual(aluno.id_aluno);
            if (!resposta.sucesso) setErro(resposta.mensagem);
            await carregar();
          } catch (e) {
            setErro(mensagemDeErro(e));
          } finally {
            setRegistrando(null);
          }
        },
      },
    ]);
  }

  const ehHoje = data === hoje;

  const presentes = (
    <Cartao style={estilos.secao}>
      <TituloSecao acao={<Selo tipo="ok" texto={`${dia?.presentes.length ?? 0}`} />}>Presentes</TituloSecao>
      {dia && dia.presentes.length === 0 ? <Vazio icone="clock" texto={ehHoje ? 'Ninguém registrado ainda hoje.' : 'Nenhuma presença neste dia.'} /> : null}
      {dia?.presentes.map((p) => (
        <View key={p.id_aluno} style={estilos.linha}>
          <Text style={estilos.hora}>{formatarHora(p.registrada_em)}</Text>
          <View style={estilos.flex}>
            <Text style={estilos.nome} numberOfLines={1}>{p.nome_aluno}</Text>
            <Text style={estilos.turma}>{p.nome_sala}</Text>
          </View>
          <Selo tipo="info" icone={METODO[p.metodo].icone} texto={METODO[p.metodo].texto} />
        </View>
      ))}
    </Cartao>
  );

  const ausentes = (
    <Cartao style={estilos.secao}>
      <TituloSecao acao={<Selo tipo="pendente" texto={`${dia?.ausentes.length ?? 0}`} />}>{ehHoje ? 'Ainda não registrados' : 'Sem presença'}</TituloSecao>
      {dia && dia.ausentes.length === 0 ? <Vazio icone="check-circle" texto="Todos os alunos foram registrados." /> : null}
      {dia?.ausentes.map((a) => (
        <View key={a.id_aluno} style={estilos.linha}>
          <Avatar nome={a.nome_aluno} tamanho={36} />
          <View style={estilos.flex}>
            <Text style={estilos.nome} numberOfLines={1}>{a.nome_aluno}</Text>
            <Text style={estilos.turma}>{a.nome_sala}</Text>
          </View>
          {ehHoje ? (
            <Pressable
              onPress={() => confirmarManual(a)}
              disabled={registrando !== null}
              style={estilos.registrar}
              accessibilityRole="button"
              accessibilityLabel={`Registrar a presença de ${a.nome_aluno}`}
            >
              <Text style={estilos.registrarTexto}>{registrando === a.id_aluno ? 'Registrando…' : 'Registrar'}</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
    </Cartao>
  );

  return (
    <Tela>
      <Conteudo style={estilos.flex}>
        <Cabecalho titulo="Registros do dia" subtitulo={nav.sessao.nomeEscola} aoVoltar={nav.voltar} />

        <View style={estilos.navegaData}>
          <Pressable onPress={() => setData(somarDias(data, -1))} style={estilos.seta} accessibilityLabel="Dia anterior" hitSlop={8}>
            <Icone nome="chevron-left" tamanho={22} cor={cores.tinta900} />
          </Pressable>
          <View style={estilos.dataTextos}>
            <Text style={estilos.data}>{maiusculaInicial(dataPorExtenso(data))}</Text>
            {dia ? <Text style={estilos.contagem}>{dia.presentes.length} de {dia.total_alunos} presentes</Text> : null}
          </View>
          <Pressable
            onPress={() => setData(somarDias(data, 1))}
            disabled={ehHoje}
            style={[estilos.seta, ehHoje && estilos.setaInativa]}
            accessibilityLabel="Próximo dia"
            hitSlop={8}
          >
            <Icone nome="chevron-right" tamanho={22} cor={cores.tinta900} />
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={estilos.chipsRolagem} contentContainerStyle={estilos.chips}>
          <Chip texto="Todas as turmas" ativo={turma === null} aoPressionar={() => setTurma(null)} />
          {turmas.map((t) => (
            <Chip key={t.id_sala} texto={t.nome_sala} ativo={turma === t.id_sala} aoPressionar={() => setTurma(t.id_sala)} />
          ))}
        </ScrollView>

        {erro ? <Aviso tipo="erro" style={estilos.aviso}>{erro}</Aviso> : null}

        {dia === null && !erro ? (
          <Carregando texto="Carregando os registros…" />
        ) : (
          <ScrollView
            contentContainerStyle={[estilos.rolagem, tablet && estilos.colunas]}
            refreshControl={<RefreshControl refreshing={atualizando} onRefresh={carregar} tintColor={cores.indigo} />}
          >
            <View style={tablet ? estilos.flex : undefined}>{presentes}</View>
            <View style={tablet ? estilos.flex : undefined}>{ausentes}</View>
          </ScrollView>
        )}
      </Conteudo>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  navegaData: { flexDirection: 'row', alignItems: 'center', gap: espaco.md },
  seta: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: cores.superficie, borderWidth: 1, borderColor: cores.nevoa200,
  },
  setaInativa: { opacity: 0.35 },
  dataTextos: { flex: 1, alignItems: 'center' },
  data: { fontFamily: fontes.tituloMedio, fontSize: 17, color: cores.tinta900 },
  contagem: { fontFamily: fontes.textoMedio, fontSize: 13, color: cores.tinta500, marginTop: 2 },
  chipsRolagem: { flexGrow: 0, marginTop: espaco.lg },
  chips: { gap: espaco.sm, paddingVertical: 2 },
  aviso: { marginTop: espaco.md },
  rolagem: { gap: espaco.lg, paddingVertical: espaco.lg, paddingBottom: espaco.xxl },
  colunas: { flexDirection: 'row', alignItems: 'flex-start' },
  secao: { gap: espaco.sm },
  linha: {
    flexDirection: 'row', alignItems: 'center', gap: espaco.md, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: cores.nevoa100,
  },
  hora: { width: 52, fontFamily: fontes.titulo, fontSize: 16, color: cores.tinta900 },
  nome: { fontFamily: fontes.textoSemi, fontSize: 15, color: cores.tinta900 },
  turma: { fontFamily: fontes.texto, fontSize: 12, color: cores.tinta500 },
  registrar: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: cores.indigo50 },
  registrarTexto: { fontFamily: fontes.textoSemi, fontSize: 13, color: cores.indigo600 },
});
