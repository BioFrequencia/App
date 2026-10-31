import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { listarAlunos } from '../api/biometria';
import { mensagemDeErro } from '../api/client';
import { filtrarAlunos, turmasDaLista, type FiltroBiometria } from '../alunosRegras';
import type { Navegacao } from '../navegacao';
import type { AlunoBiometria } from '../types';
import { Aviso, Avatar, Cabecalho, Carregando, Chip, Conteudo, Icone, Selo, Tela, Vazio, useLayout } from '../ui/componentes';
import { cores, espaco, fontes, raio } from '../ui/tema';

/** Escolha do aluno para cadastrar a biometria: busca, turma e situação. */
export default function AlunosTela({ nav }: { nav: Navegacao }) {
  const { tablet } = useLayout();
  const [alunos, setAlunos] = useState<AlunoBiometria[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [atualizando, setAtualizando] = useState(false);
  const [busca, setBusca] = useState('');
  const [turma, setTurma] = useState<number | null>(null);
  const [filtro, setFiltro] = useState<FiltroBiometria>('todos');

  const carregar = useCallback(async () => {
    setAtualizando(true);
    try {
      const resposta = await listarAlunos();
      if (resposta.sucesso && resposta.dados) {
        setAlunos(resposta.dados);
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

  const turmas = useMemo(() => turmasDaLista(alunos ?? []), [alunos]);
  const visiveis = useMemo(() => filtrarAlunos(alunos ?? [], busca, turma, filtro), [alunos, busca, turma, filtro]);
  // Em duas colunas, o último aluno de uma lista ímpar ocuparia a linha
  // inteira: um espaço vazio mantém a mesma largura dos outros.
  const linhas: (AlunoBiometria | null)[] = tablet && visiveis.length % 2 === 1 ? [...visiveis, null] : visiveis;
  const comFacial = (alunos ?? []).filter((a) => a.tem_facial).length;

  return (
    <Tela>
      <Conteudo style={estilos.flex}>
        <Cabecalho
          titulo="Cadastrar biometria"
          subtitulo={alunos ? `${comFacial} de ${alunos.length} alunos com biometria facial` : nav.sessao.nomeEscola}
          aoVoltar={nav.voltar}
        />

        <View style={estilos.busca}>
          <Icone nome="search" tamanho={18} cor={cores.tinta500} />
          <TextInput
            style={estilos.buscaInput}
            placeholder="Buscar aluno pelo nome"
            placeholderTextColor={cores.tinta300}
            value={busca}
            onChangeText={setBusca}
            autoCorrect={false}
            returnKeyType="search"
          />
          {busca ? (
            <Pressable onPress={() => setBusca('')} accessibilityLabel="Limpar a busca" hitSlop={8}>
              <Icone nome="x" tamanho={18} cor={cores.tinta500} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={estilos.chipsRolagem} contentContainerStyle={estilos.chips}>
          <Chip texto="Todas as turmas" ativo={turma === null} aoPressionar={() => setTurma(null)} />
          {turmas.map((t) => (
            <Chip key={t.id_sala} texto={t.nome_sala} ativo={turma === t.id_sala} aoPressionar={() => setTurma(t.id_sala)} />
          ))}
          <View style={estilos.separador} />
          <Chip texto="Sem biometria" ativo={filtro === 'sem_facial'} aoPressionar={() => setFiltro(filtro === 'sem_facial' ? 'todos' : 'sem_facial')} />
          <Chip texto="Com biometria" ativo={filtro === 'com_facial'} aoPressionar={() => setFiltro(filtro === 'com_facial' ? 'todos' : 'com_facial')} />
        </ScrollView>

        {erro ? <Aviso tipo="erro" style={estilos.aviso}>{erro}</Aviso> : null}

        {alunos === null && !erro ? (
          <Carregando texto="Carregando os alunos da escola…" />
        ) : (
          <FlatList
            key={tablet ? 'duas' : 'uma'}
            data={linhas}
            numColumns={tablet ? 2 : 1}
            keyExtractor={(aluno) => (aluno ? String(aluno.id_aluno) : 'espaco')}
            columnWrapperStyle={tablet ? estilos.colunas : undefined}
            contentContainerStyle={estilos.lista}
            refreshControl={<RefreshControl refreshing={atualizando} onRefresh={carregar} tintColor={cores.indigo} />}
            ListEmptyComponent={<Vazio icone="users" texto={alunos?.length ? 'Nenhum aluno com esses filtros.' : 'Esta escola ainda não tem alunos cadastrados. Cadastre-os pelo site.'} />}
            renderItem={({ item }) =>
              item ? <LinhaAluno aluno={item} aoPressionar={() => nav.navegar({ nome: 'aluno', aluno: item })} /> : <View style={estilos.flex} />
            }
          />
        )}
      </Conteudo>
    </Tela>
  );
}

function LinhaAluno({ aluno, aoPressionar }: { aluno: AlunoBiometria; aoPressionar: () => void }) {
  return (
    <Pressable onPress={aoPressionar} style={({ pressed }) => [estilos.linha, pressed && estilos.pressionado]} accessibilityRole="button">
      <Avatar nome={aluno.nome_aluno} />
      <View style={estilos.flex}>
        <Text style={estilos.nome} numberOfLines={1}>{aluno.nome_aluno}</Text>
        <Text style={estilos.turma}>{aluno.nome_sala}</Text>
        <View style={estilos.selos}>
          <Selo tipo={aluno.tem_facial ? 'ok' : 'pendente'} icone="mdi:face-recognition" texto={aluno.tem_facial ? 'Facial' : 'Sem facial'} />
          {aluno.digitais > 0 ? <Selo tipo="ok" icone="mdi:fingerprint" texto="Digital" /> : null}
          {aluno.consentimento_responsavel === null ? <Selo tipo="perigo" texto="Sem consentimento" /> : null}
        </View>
      </View>
      <Icone nome="chevron-right" tamanho={20} cor={cores.tinta300} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  busca: {
    flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 50, paddingHorizontal: 14,
    backgroundColor: cores.superficie, borderRadius: raio.medio, borderWidth: 1, borderColor: cores.nevoa200,
  },
  buscaInput: { flex: 1, fontFamily: fontes.texto, fontSize: 16, color: cores.tinta900, paddingVertical: 10 },
  chipsRolagem: { flexGrow: 0, marginTop: espaco.md },
  chips: { gap: espaco.sm, paddingVertical: 2, alignItems: 'center' },
  separador: { width: 1, height: 22, backgroundColor: cores.nevoa200, marginHorizontal: 4 },
  aviso: { marginTop: espaco.md },
  lista: { paddingVertical: espaco.lg, gap: espaco.md },
  colunas: { gap: espaco.md },
  linha: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: espaco.md, padding: espaco.lg,
    backgroundColor: cores.superficie, borderRadius: raio.grande, borderWidth: 1, borderColor: cores.nevoa200,
  },
  pressionado: { opacity: 0.85 },
  nome: { fontFamily: fontes.textoForte, fontSize: 16, color: cores.tinta900 },
  turma: { fontFamily: fontes.texto, fontSize: 13, color: cores.tinta500, marginTop: 1 },
  selos: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
});
