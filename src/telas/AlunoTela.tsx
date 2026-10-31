import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { excluirBiometria, listarAlunos, registrarConsentimento, revogarConsentimento } from '../api/biometria';
import { mensagemDeErro } from '../api/client';
import type { Navegacao } from '../navegacao';
import type { AlunoBiometria } from '../types';
import { Aviso, Avatar, Botao, Cabecalho, Campo, Cartao, Conteudo, Icone, Selo, Tela, TituloSecao, estilosTexto, useLayout } from '../ui/componentes';
import { formatarData } from '../ui/formatar';
import { cores, espaco, fontes } from '../ui/tema';

/**
 * Ficha de biometria de um aluno: conferência da identidade, consentimento
 * do responsável (LGPD) e cadastro facial/digital.
 */
export default function AlunoTela({ nav, aluno: inicial }: { nav: Navegacao; aluno: AlunoBiometria }) {
  const { tablet } = useLayout();
  const [aluno, setAluno] = useState(inicial);
  const [responsavel, setResponsavel] = useState('');
  const [termoAssinado, setTermoAssinado] = useState(false);
  const [ocupado, setOcupado] = useState<'consentimento' | 'revogar' | 'apagar' | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  const recarregar = useCallback(async () => {
    const resposta = await listarAlunos();
    const atualizado = resposta.dados?.find((a) => a.id_aluno === inicial.id_aluno);
    if (atualizado) setAluno(atualizado);
  }, [inicial.id_aluno]);

  // Ao voltar do cadastro facial a tela é montada de novo com os dados da
  // lista; busca a situação atual (ex.: a biometria acabou de ser feita).
  useEffect(() => {
    recarregar().catch(() => undefined);
  }, [recarregar]);

  async function executar(acao: 'consentimento' | 'revogar' | 'apagar', chamada: () => Promise<{ sucesso: boolean; mensagem: string }>, sucesso: string) {
    setOcupado(acao);
    setAviso(null);
    try {
      const resposta = await chamada();
      setAviso(resposta.sucesso ? { tipo: 'sucesso', texto: sucesso } : { tipo: 'erro', texto: resposta.mensagem });
      if (resposta.sucesso) await recarregar();
    } catch (e) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(e) });
    } finally {
      setOcupado(null);
    }
  }

  function registrar() {
    if (responsavel.trim().length < 3) {
      setAviso({ tipo: 'erro', texto: 'Informe o nome completo do responsável que autorizou.' });
      return;
    }
    executar('consentimento', () => registrarConsentimento(aluno.id_aluno, responsavel), 'Consentimento registrado. Já é possível cadastrar a biometria.');
  }

  function revogar() {
    Alert.alert(
      'Revogar o consentimento',
      `A biometria de ${aluno.nome_aluno} será apagada do sistema. As presenças já registradas continuam.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Revogar e apagar', style: 'destructive', onPress: () => executar('revogar', () => revogarConsentimento(aluno.id_aluno), 'Consentimento revogado e biometria apagada.') },
      ]
    );
  }

  function apagarFacial() {
    Alert.alert('Apagar a biometria facial', `O rosto de ${aluno.nome_aluno} deixa de ser reconhecido até um novo cadastro.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: () => executar('apagar', () => excluirBiometria(aluno.id_aluno, 'facial'), 'Biometria facial apagada.') },
    ]);
  }

  const temConsentimento = aluno.consentimento_responsavel !== null;

  const identidade = (
    <Cartao style={estilos.cartao}>
      <View style={estilos.identidade}>
        <Avatar nome={aluno.nome_aluno} tamanho={64} />
        <View style={estilos.flex}>
          <Text style={estilos.nome}>{aluno.nome_aluno}</Text>
          <Text style={estilosTexto.fraco}>{aluno.nome_sala} · nascimento {formatarData(aluno.dta_nasc_aluno)}</Text>
        </View>
      </View>
      <Aviso tipo="info">Confira o nome e a data de nascimento com o aluno antes de cadastrar: a biometria fica ligada a este cadastro.</Aviso>
    </Cartao>
  );

  const consentimento = (
    <Cartao style={estilos.cartao}>
      <TituloSecao acao={<Selo tipo={temConsentimento ? 'ok' : 'perigo'} texto={temConsentimento ? 'Registrado' : 'Pendente'} />}>
        Consentimento do responsável
      </TituloSecao>
      {temConsentimento ? (
        <>
          <Text style={estilosTexto.corpo}>
            Autorizado por <Text style={estilosTexto.forte}>{aluno.consentimento_responsavel}</Text> em {formatarData(aluno.consentimento_em)}.
          </Text>
          <Botao titulo="Revogar e apagar a biometria" variante="perigo" icone="shield-off" carregando={ocupado === 'revogar'} aoPressionar={revogar} />
        </>
      ) : (
        <>
          <Text style={estilosTexto.corpo}>
            Biometria é dado sensível (LGPD): só pode ser cadastrada com a autorização por escrito de um responsável.
          </Text>
          <Campo rotulo="Nome do responsável" placeholder="Quem assinou o termo" value={responsavel} onChangeText={setResponsavel} autoCapitalize="words" />
          <Pressable style={estilos.termo} onPress={() => setTermoAssinado(!termoAssinado)} accessibilityRole="switch" accessibilityState={{ checked: termoAssinado }}>
            <Switch value={termoAssinado} onValueChange={setTermoAssinado} trackColor={{ true: cores.indigo, false: cores.nevoa200 }} thumbColor="#ffffff" />
            <Text style={[estilosTexto.corpo, estilos.flex]}>O responsável assinou o termo de consentimento para o uso da biometria.</Text>
          </Pressable>
          <Botao titulo="Registrar consentimento" icone="shield" desabilitado={!termoAssinado} carregando={ocupado === 'consentimento'} aoPressionar={registrar} />
        </>
      )}
    </Cartao>
  );

  const facial = (
    <Cartao style={estilos.cartao}>
      <TituloSecao acao={<Selo tipo={aluno.tem_facial ? 'ok' : 'pendente'} texto={aluno.tem_facial ? 'Cadastrada' : 'Não cadastrada'} />}>
        Biometria facial
      </TituloSecao>
      <Text style={estilosTexto.corpo}>
        {aluno.tem_facial
          ? `Atualizada em ${formatarData(aluno.facial_atualizada_em)}. Refaça se o reconhecimento estiver falhando com este aluno.`
          : 'Três fotos do rosto, com pequenas variações. As fotos não saem do aparelho: o sistema guarda só um código numérico do rosto, cifrado.'}
      </Text>
      <Botao
        titulo={aluno.tem_facial ? 'Refazer o cadastro facial' : 'Cadastrar o rosto'}
        icone="camera"
        desabilitado={!temConsentimento}
        aoPressionar={() => nav.navegar({ nome: 'capturaFacial', aluno })}
      />
      {!temConsentimento ? <Text style={estilosTexto.fraco}>Registre o consentimento primeiro.</Text> : null}
      {aluno.tem_facial ? (
        <Botao titulo="Apagar a biometria facial" variante="perigo" icone="trash-2" carregando={ocupado === 'apagar'} aoPressionar={apagarFacial} />
      ) : null}
    </Cartao>
  );

  const digital = (
    <Cartao style={estilos.cartao}>
      <TituloSecao acao={<Selo tipo={aluno.digitais > 0 ? 'ok' : 'pendente'} texto={aluno.digitais > 0 ? `${aluno.digitais} cadastrada(s)` : 'Não cadastrada'} />}>
        Biometria digital
      </TituloSecao>
      <View style={estilos.digital}>
        <Icone nome="mdi:fingerprint" tamanho={28} cor={cores.tinta300} />
        <Text style={[estilosTexto.fraco, estilos.flex]}>
          O cadastro da digital precisa de um leitor USB compatível ligado ao tablet. O sistema já está pronto para guardar as
          digitais cifradas; falta conectar o leitor escolhido pela escola.
        </Text>
      </View>
      <Botao titulo="Cadastrar digital" icone="mdi:fingerprint" variante="secundario" desabilitado aoPressionar={() => undefined} />
    </Cartao>
  );

  return (
    <Tela>
      <Conteudo style={estilos.flex}>
        <Cabecalho titulo={aluno.nome_aluno} subtitulo="Ficha de biometria" aoVoltar={nav.voltar} />
        <ScrollView contentContainerStyle={estilos.rolagem} keyboardShouldPersistTaps="handled">
          {aviso ? <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso> : null}
          {tablet ? (
            <View style={estilos.colunas}>
              <View style={estilos.coluna}>{identidade}{consentimento}</View>
              <View style={estilos.coluna}>{facial}{digital}</View>
            </View>
          ) : (
            <>
              {identidade}
              {consentimento}
              {facial}
              {digital}
            </>
          )}
        </ScrollView>
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
  identidade: { flexDirection: 'row', alignItems: 'center', gap: espaco.lg },
  nome: { fontFamily: fontes.titulo, fontSize: 22, color: cores.tinta900, letterSpacing: -0.3 },
  termo: { flexDirection: 'row', alignItems: 'center', gap: espaco.md },
  digital: { flexDirection: 'row', alignItems: 'center', gap: espaco.md },
});
